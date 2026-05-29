/* eslint-disable no-mixed-operators */
import { Upload, Image, Avatar, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import React, { memo, useCallback, useState } from 'react'
import { useIntl } from 'react-intl';
interface UploadImageProps {
  uploadImageAPI?: (obj: any) => void
  objUserUpdate: any
  resetImage: () => void
  handleRemoveImageUpdate: () => void
  fileList: any[]
  imageEmpty: string
  handleChange: (data: any) => void
}
const UploadImage: React.FC<UploadImageProps> = ({
  uploadImageAPI,
  resetImage,
  handleRemoveImageUpdate,
  imageEmpty,
  handleChange,
  objUserUpdate,
  fileList,
}) => {
  const intl = useIntl();
  const [visiblePreview, setVisiblePreview] = useState<boolean>(false)
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>{intl.formatMessage({id: "sidebar.users.upload"})}</div>
    </div>
  )
  const handleRemoveImage = useCallback(() => {
    if (objUserUpdate !== '') {
        handleRemoveImageUpdate()
      } else {
        resetImage()
      }
      setVisiblePreview(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objUserUpdate])
  return (
    <div style={{ display: 'flex' }}>
      {!objUserUpdate || objUserUpdate === '' || fileList && fileList.length > 0 ? (
        ''
      ) : imageEmpty === ''  ? (
        <Image
          preview={{
            getContainer: '.ant-modal-body',
            onVisibleChange: (visible, prevVisible) => {
              setVisiblePreview(visible)
            },
          }}
          style={{ width: '6.5rem', height: '6.5rem', objectFit: 'contain' }}
          src={objUserUpdate}
        />
      ) : (
        ''
      )}
      {!objUserUpdate || objUserUpdate === ''  ? (
        ''
      ) : (
        <div style={{ marginLeft: '0.5rem' }}></div>
      )}

      <Upload
        beforeUpload={() => false}
        listType="picture-card"
        fileList={fileList}
        /* @ts-ignore */
        maxCount={1}
        itemRender={(originNode: any, file: any) => {
          // uploadImage(file?.originFileObj)
          return (
            <div>
              {file.type.indexOf('image') !== -1 ? (
                <Image
                  preview={{
                    getContainer: '.ant-modal-body',
                    onVisibleChange: (visible, prevVisible) => {
                      setVisiblePreview(visible)
                    },
                  }}
                  src={file?.thumbUrl}
                />
              ) : (
                ''
              )}
            </div>
          )
        }}
        showUploadList={{ showRemoveIcon: true }}
        onChange={handleChange}
      >
        {fileList && fileList.length >= 8 ? null : uploadButton}
      </Upload>
      {/* Trash For Images */}
      {visiblePreview  ? (
        <Popconfirm
          title={intl.formatMessage({id: "sidebar.users.confirm"})}
          okText={intl.formatMessage({id: 'button.Yes'})}
          cancelText={intl.formatMessage({id: 'button.No'})}
          placement="topRight"
          onConfirm={(e) => {
            handleRemoveImage()
          }}
        >
          <div
            style={{
              position: 'fixed',
              right: '7.25%',
              bottom: '13.5%',
              zIndex: 9999,
            }}
          >
            <Avatar
              style={{
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                width: '2.75rem',
                height: '2.75rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <i
                style={{
                  color: 'rgb(227,85,76)',
                  marginTop: '0.5rem',
                  fontSize: '1.25rem',
                }}
                className="ion-android-delete"
              />
            </Avatar>
          </div>
        </Popconfirm>
      ) : null}
    </div>
  )
}
export default memo(UploadImage)
