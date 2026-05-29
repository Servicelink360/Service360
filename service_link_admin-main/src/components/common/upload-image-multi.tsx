import { PlusOutlined } from '@ant-design/icons'
import {
    Fieldset,
    Label
} from '@app/components/common/Common.styles'
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import urlConfig from '../../config/site.config'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIUploadAsync } from '../../library/helpers/api'
import { compressImageForUpload } from '../../library/helpers/compress-image'
import { Image, message, Typography, Upload } from 'antd'

const UPLOAD_CONCURRENCY = 4

async function mapPool<T, R>(
    items: T[],
    worker: (item: T, index: number) => Promise<R>,
    concurrency: number,
): Promise<R[]> {
    const results = new Array<R>(items.length)
    let nextIndex = 0
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (nextIndex < items.length) {
            const i = nextIndex++
            results[i] = await worker(items[i], i)
        }
    })
    await Promise.all(runners)
    return results
}

export type UploadBatchProgress = {
    /** 0–100 for the current batch of pending files */
    percent: number;
    completed: number;
    total: number;
};

export type UploadImageMultilHandle = {
    hasPending: () => boolean;
    getPendingCount: () => number;
    uploadAllPending: (onProgress?: (detail: UploadBatchProgress) => void) => Promise<string[]>;
};

function isLoopbackHost(h: string) {
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
}

function resolvePublicMediaUrl(u: string): string {
    if (!u || typeof u !== 'string') return u
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    try {
        const api = new URL(urlConfig.orderApiURL || 'http://127.0.0.1:5301')
        let host = api.hostname
        if (
            typeof window !== 'undefined' &&
            window.location?.hostname &&
            isLoopbackHost(host) &&
            !isLoopbackHost(window.location.hostname)
        ) {
            host = window.location.hostname
        }
        const protocol = api.protocol || 'http:'
        const port = api.port
        const origin = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`
        return u.startsWith('/') ? `${origin}${u}` : `${origin}/${u}`
    } catch {
        return u
    }
}

type IProps = {
    title?: string
    files: string[]
    onChange: Function,
    multiple?: boolean,
    isImage: boolean
    /** When true, files are staged locally until uploadAllPending() is called (no bar on attach). */
    deferUpload?: boolean
}

const filesToUploadList = (files: string[]) => {
    const list: any[] = []
    if (files && files.length > 0) {
        for (const img of files) {
            if (img) {
                const resolved = resolvePublicMediaUrl(img)
                list.push({
                    uid: `server-${img}`,
                    percent: 100,
                    name: img.split('/')[img.split('/').length - 1],
                    status: 'done',
                    url: resolved,
                    thumbUrl: resolved,
                    isPending: false,
                })
            }
        }
    }
    return list
}

const isBlobUrl = (url?: string) => typeof url === 'string' && url.startsWith('blob:')

const getBase64 = (file): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

const UploadFileMultil = forwardRef<UploadImageMultilHandle, IProps>((props, ref) => {
    const { files, onChange, title, multiple = false, isImage, deferUpload = false } = props;
    const [fileList, setFileList] = useState<any[]>(() => filesToUploadList(files))
    const pendingFilesRef = useRef<Map<string, { file: File; preview?: string }>>(new Map())
    const [pendingCount, setPendingCount] = useState(0)
    const previewUrls = useRef<Set<string>>(new Set())
    const uploadingRef = useRef(false)

    const buildListFromState = useCallback(() => {
        const server = filesToUploadList(files)
        const pending = Array.from(pendingFilesRef.current.entries()).map(([uid, entry]) => ({
            uid,
            name: entry.file.name,
            status: 'done',
            percent: 100,
            thumbUrl: entry.preview,
            url: entry.preview,
            isPending: true,
        }))
        return [...server, ...pending]
    }, [files])

    useEffect(() => {
        if (uploadingRef.current) return
        setFileList(buildListFromState())
    }, [files, buildListFromState])

    useEffect(() => () => {
        previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
        previewUrls.current.clear()
    }, [])

    const collectServerUrls = useCallback((list: any[]) => {
        const urls: string[] = []
        for (const item of list) {
            if (item.status === 'done' && item.url && !isBlobUrl(item.url) && item.url !== 'null') {
                urls.push(item.url)
            }
        }
        return urls
    }, [])

    const notifyParent = useCallback(
        (list: any[]) => {
            const urls = collectServerUrls(list)
            onChange(urls)
        },
        [collectServerUrls, onChange],
    )

    const prepareFileForUpload = useCallback(
        async (raw: File) => (isImage ? compressImageForUpload(raw) : raw),
        [isImage],
    )

    const uploadSingleFile = useCallback(
        async (raw: File, onProgress?: (percent: number) => void): Promise<string> => {
            const fileSize = raw.size || 0
            const formData = new FormData()
            formData.append('file', raw, raw.name || 'upload')
            const res: any = await callAPIUploadAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                'POST',
                formData,
                {
                    uploadFileSize: fileSize,
                    onUploadProgress: (pct: number) => {
                        if (pct >= 1) onProgress?.(Math.min(100, Math.round(pct)))
                    },
                },
            )
            if (res?.code === 1 && res.data) {
                return resolvePublicMediaUrl(String(res.data))
            }
            throw new Error(res?.message || 'Upload failed')
        },
        [],
    )

    useImperativeHandle(
        ref,
        () => ({
            hasPending: () => pendingFilesRef.current.size > 0,
            getPendingCount: () => pendingFilesRef.current.size,
            uploadAllPending: async (onProgress?: (detail: UploadBatchProgress) => void) => {
                const pending = Array.from(pendingFilesRef.current.entries())
                if (!pending.length) {
                    return [...files]
                }
                uploadingRef.current = true
                const uploaded: string[] = [...files]
                const total = pending.length
                let completed = 0
                const progressMap: Record<string, number> = {}
                const reportOverall = () => {
                    const inFlight = Object.values(progressMap)
                    const partial =
                        inFlight.length > 0
                            ? inFlight.reduce((sum, n) => sum + n / 100, 0) / total
                            : 0
                    const ratio = (completed + partial) / total
                    onProgress?.({
                        percent: Math.max(1, Math.min(99, Math.round(ratio * 100))),
                        completed,
                        total,
                    })
                }
                try {
                    const results = await mapPool(
                        pending,
                        async ([uid, entry]) => {
                            const prepared = await prepareFileForUpload(entry.file)
                            progressMap[uid] = 1
                            reportOverall()
                            const url = await uploadSingleFile(prepared, (pct) => {
                                progressMap[uid] = pct
                                reportOverall()
                            })
                            delete progressMap[uid]
                            completed += 1
                            reportOverall()
                            if (entry.preview) {
                                URL.revokeObjectURL(entry.preview)
                                previewUrls.current.delete(entry.preview)
                            }
                            pendingFilesRef.current.delete(uid)
                            return url
                        },
                        UPLOAD_CONCURRENCY,
                    )
                    uploaded.push(...results)
                    setPendingCount(pendingFilesRef.current.size)
                    onProgress?.({ percent: 100, completed: total, total })
                    const nextList = filesToUploadList(uploaded)
                    setFileList(nextList)
                    notifyParent(nextList)
                    return uploaded
                } catch (error: any) {
                    message.error(error?.message || 'Upload failed')
                    throw error
                } finally {
                    uploadingRef.current = false
                }
            },
        }),
        [files, notifyParent, prepareFileForUpload, uploadSingleFile],
    )

    const handleUpdaloadImage = async (options) => {
        const { onSuccess, onError, onProgress, file } = options
        const raw = file.originFileObj ?? file
        if (!(raw instanceof Blob)) {
            onError?.(new Error('Invalid file'))
            return
        }
        const uid = file.uid
        let localPreview: string | undefined
        if (isImage && raw instanceof Blob) {
            localPreview = URL.createObjectURL(raw)
            previewUrls.current.add(localPreview)
        }
        setFileList((prev) => {
            const row = {
                uid,
                name: (raw as File)?.name || 'upload',
                status: 'uploading',
                percent: 1,
                ...(localPreview ? { thumbUrl: localPreview, url: localPreview } : {}),
            }
            const has = prev.some((r) => r.uid === uid)
            return has ? prev.map((r) => (r.uid === uid ? { ...r, ...row } : r)) : [...prev, row]
        })
        try {
            const prepared = await prepareFileForUpload(raw as File)
            const absoluteUrl = await uploadSingleFile(prepared, (pct) => {
                onProgress?.({ percent: pct })
                setFileList((prev) =>
                    prev.map((row) =>
                        row.uid === uid ? { ...row, status: 'uploading', percent: pct } : row,
                    ),
                )
            })
            if (localPreview) {
                URL.revokeObjectURL(localPreview)
                previewUrls.current.delete(localPreview)
            }
            setFileList((prev) => {
                const next = prev.map((r) =>
                    r.uid === uid
                        ? {
                              ...r,
                              url: absoluteUrl,
                              thumbUrl: absoluteUrl,
                              status: 'done',
                              percent: 100,
                              isPending: false,
                          }
                        : r,
                )
                queueMicrotask(() => notifyParent(next))
                return next
            })
            onSuccess?.(absoluteUrl, file)
        } catch (error: any) {
            setFileList((prev) => prev.filter((r) => r.uid !== uid))
            onError?.(error)
        }
    }

    const stagePendingFile = (file: File) => {
        const uid = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
        let preview: string | undefined
        if (isImage) {
            preview = URL.createObjectURL(file)
            previewUrls.current.add(preview)
        }
        pendingFilesRef.current.set(uid, { file, preview })
        setPendingCount(pendingFilesRef.current.size)
        setFileList(buildListFromState())
    }

    const removeEntry = (uid: string) => {
        const pending = pendingFilesRef.current.get(uid)
        if (pending?.preview) {
            URL.revokeObjectURL(pending.preview)
            previewUrls.current.delete(pending.preview)
        }
        pendingFilesRef.current.delete(uid)
        setPendingCount(pendingFilesRef.current.size)
        setFileList((prev) => {
            const next = prev.filter((c) => c.uid !== uid)
            queueMicrotask(() => notifyParent(next))
            return next
        })
    }

    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState('')
    const handlePreview = async (file) => {
        if (!isImage) {
            const newWindow = window.open(file.url, '_blank', 'noopener,noreferrer')
            if (newWindow) newWindow.opener = null
            return
        }
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj)
        }
        setPreviewImage(file.url || (file.preview as string))
        setPreviewOpen(true)
    }

    return (
        <Fieldset>
            <Label>{title ? title : 'Files'}</Label>
            {deferUpload && pendingCount > 0 ? (
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                    {pendingCount} file(s) attached — up to {UPLOAD_CONCURRENCY} upload at once when you click Upload below
                    (large photos are resized automatically).
                </Typography.Text>
            ) : null}
            <div className="image-upload-grid-wrap">
            <Upload
                multiple={multiple ? true : false}
                listType={isImage ? 'picture-card' : 'text'}
                accept={isImage ? 'image/*' : 'video/*'}
                fileList={fileList}
                className="image-upload-grid"
                beforeUpload={(file) => {
                    if (deferUpload) {
                        stagePendingFile(file as File)
                        return false
                    }
                    return true
                }}
                customRequest={deferUpload ? undefined : (options) => handleUpdaloadImage(options)}
                onPreview={handlePreview}
                onRemove={(file) => {
                    removeEntry(file.uid)
                    return true
                }}
            >
                <button style={{ border: 0, background: 'none' }} type="button">
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                </button>
            </Upload>
            </div>
            {previewImage && isImage && (
                <Image
                    wrapperStyle={{ display: 'none' }}
                    preview={{
                        visible: previewOpen,
                        onVisibleChange: (visible) => setPreviewOpen(visible),
                    }}
                    src={previewImage}
                />
            )}
        </Fieldset>
    )
})

UploadFileMultil.displayName = 'UploadFileMultil'

export default UploadFileMultil
