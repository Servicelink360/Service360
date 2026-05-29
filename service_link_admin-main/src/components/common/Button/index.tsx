import { ButtonComponentProps } from '@app/interfaces/IUsers'
import React, { memo } from 'react'
import { Button } from 'antd'
const ButtonComponent: React.FC<ButtonComponentProps> = ({
  text,
  style,
  handleOnClick,
}) => {
  return (
    <Button type="primary" style={{...style, cursor:"pointer"}} onClick={() => handleOnClick(text.toLowerCase() === "new" ? "new" : "search")}>
      {text}
    </Button>
  )
}
export default memo(ButtonComponent)
