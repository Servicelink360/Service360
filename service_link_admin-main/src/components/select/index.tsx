import React, { memo } from 'react'
import { Select } from 'antd'
import { SelectComponentProps } from '@app/interfaces/IUsers'
const { Option } = Select
const SelectComponent: React.FC<SelectComponentProps> = ({
  handleChange,
  text,
  list,
}) => {
  return (
    <Select
      defaultValue={text}
      style={{width:"100%"}}
      onChange={(e) => handleChange(e, text)}
    >
      <Option
        /* @ts-ignore */
        value={text}
      >
        {text}
      </Option>
      {list &&
        list.length > 0 &&
        list.map((values, index) => {
          return (
            <Option
              key={index}
              /* @ts-ignore */
              value={values?.value}
            >
              {values?.key}
            </Option>
          )
        })}
    </Select>
  )
}
export default memo(SelectComponent)
