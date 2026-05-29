import React, { memo } from 'react'
import { Input } from 'antd'
import { InputComponentProps } from '@app/interfaces/IUsers'
const InputComponent: React.FC<InputComponentProps> = ({
  handleChangeInput,
  text,
  value
}) => {
  return (
    <Input
      autoComplete="off"
      allowClear
      value={value}
      style={{ width: "100%" }}
      onChange={handleChangeInput}
      placeholder={text}
    />
  )
}
export default memo(InputComponent)
