import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import UploadImageMultil, { UploadImageMultilHandle } from "@app/components/common/upload-image-multi";
import endPoint from "@app/constants/endPoint";
import serviceType from "@app/constants/serviceType";
import { callAPIUploadAsync } from "@app/library/helpers/api";
import type { UploadFile } from "antd/es/upload/interface";
import { Button, message, Progress, Typography, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { parseMediaListValue } from "./new-reports-field-utils";

/** Single progress scale: photos 1–80%, save report 80–100% (same modal, no page jump). */
export const SUBMIT_PROGRESS_MEDIA_MAX = 80;
export const SUBMIT_PROGRESS_SAVE_START = 80;
export const SUBMIT_PROGRESS_SAVE_CAP = 97;

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TemplateImageUpload = forwardRef<
  UploadImageMultilHandle,
  { value?: string; onChange?: (v: string | undefined) => void; multiple?: boolean }
>(({ value, onChange, multiple = true }, ref) => {
  const files = useMemo(() => parseMediaListValue(value), [value]);
  return (
    <UploadImageMultil
      ref={ref}
      deferUpload
      multiple={multiple}
      isImage={true}
      title=""
      files={files}
      onChange={(urls: string[]) => {
        const clean = (urls ?? []).filter(Boolean);
        onChange?.(clean.length ? JSON.stringify(clean) : "");
      }}
    />
  );
});

export const TemplateVideoUpload = forwardRef<
  UploadImageMultilHandle,
  { value?: string; onChange?: (v: string | undefined) => void }
>(({ value, onChange }, ref) => {
  const files = useMemo(() => parseMediaListValue(value), [value]);
  return (
    <UploadImageMultil
      ref={ref}
      deferUpload
      multiple={false}
      isImage={false}
      title=""
      files={files}
      onChange={(urls: string[]) => {
        const clean = (urls ?? []).filter(Boolean);
        onChange?.(clean.length ? JSON.stringify(clean) : "");
      }}
    />
  );
});

export const TemplateFileUpload: React.FC<{ value?: string; onChange?: (v: string | undefined) => void }> = ({ value, onChange }) => {
  const [uploadBar, setUploadBar] = useState<{ show: boolean; percent: number }>({ show: false, percent: 0 });
  const [fileList, setFileList] = useState<UploadFile[]>(() => {
    if (!value || !String(value).trim()) return [];
    const name = String(value).split("/").pop() || "file";
    return [{ uid: "template-file", name, status: "done", url: value }];
  });
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (uploadingRef.current) return;
    if (!value || !String(value).trim()) {
      setFileList([]);
      return;
    }
    const name = String(value).split("/").pop() || "file";
    setFileList([{ uid: "template-file", name, status: "done", url: value }]);
  }, [value]);

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    const raw = (file as any)?.originFileObj ?? file;
    if (!(raw instanceof Blob)) {
      message.error("Invalid file");
      onError?.(new Error("Invalid file"));
      return;
    }
    const uid = file.uid || "template-file-upload";
    const fileSize = raw.size || 0;
    uploadingRef.current = true;
    setFileList([
      {
        uid,
        name: (raw as File).name || "upload",
        status: "uploading",
      },
    ]);
    try {
      const formData = new FormData();
      formData.append("file", raw, (raw as File).name || "upload");
      const response: any = await callAPIUploadAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        "POST",
        formData,
        {
          uploadFileSize: fileSize,
          onUploadProgress: (pct: number) => {
            if (pct < 1) return;
            const clamped = Math.min(100, Math.max(1, Math.round(pct)));
            setUploadBar({ show: true, percent: clamped });
            onProgress?.({ percent: clamped });
            setFileList((prev) =>
              prev.map((row) =>
                row.uid === uid ? { ...row, status: "uploading", percent: clamped } : row,
              ),
            );
          },
        }
      );
      if (response?.code === 1 && response.data) {
        const url = String(response.data);
        onChange?.(url);
        setFileList([{ uid: "template-file", name: url.split("/").pop() || "file", status: "done", url, percent: 100 }]);
        onSuccess?.(response.data, file);
      } else {
        message.error(response?.message || "Upload failed");
        onError?.(new Error(response?.message || "Upload failed"));
      }
    } catch {
      message.error("Upload failed");
      onError?.(new Error("Upload failed"));
    } finally {
      uploadingRef.current = false;
      setUploadBar({ show: false, percent: 0 });
    }
  };

  return (
    <div>
      {uploadBar.show ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Typography.Text strong style={{ color: "#135200" }}>Uploading…</Typography.Text>
            <Typography.Text strong style={{ color: "#135200" }}>{uploadBar.percent}%</Typography.Text>
          </div>
          <Progress
            percent={uploadBar.percent}
            status={uploadBar.percent >= 100 ? "success" : "active"}
            showInfo={false}
            strokeColor="#397d36"
            strokeWidth={10}
          />
        </div>
      ) : null}
      <Upload
        maxCount={1}
        fileList={fileList}
        customRequest={customRequest}
        onRemove={() => {
          onChange?.("");
          setFileList([]);
        }}
        disabled={uploadBar.show}
        showUploadList={{ showRemoveIcon: true }}
      >
        <Button type="default" icon={<UploadOutlined />} loading={uploadBar.show} size="large" style={{ borderRadius: 8 }}>
          Choose file
        </Button>
      </Upload>
    </div>
  );
};
