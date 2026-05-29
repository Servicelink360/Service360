import React, { memo } from 'react'
import { Select } from 'antd'
export interface SelectSearchProps {
    text: string;
    basic_by_type: any[];
    resetBasic: string | undefined;
    handleOnChangeSearch: (value: string) => void;
}
const SelectSearch: React.FC<SelectSearchProps> = ({resetBasic, basic_by_type,text,handleOnChangeSearch}) => {
  const { Option } = Select
  return (
    <Select
      showSearch
      style={{width:"100%"}}
      value={resetBasic && resetBasic !== "" ? resetBasic : "Any"}
      optionFilterProp="children"
      showArrow={false}
      allowClear
      onChange={handleOnChangeSearch}
      filterOption={(input, option) =>
        /* @ts-ignore */
        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    >
         <Option value="Any">{text}</Option>
      {basic_by_type && basic_by_type.length > 0 && basic_by_type.map((values,index) => {
          return (
            <Option key={index} value={values?.id}>{values?.name}</Option>
          )
      })}
    </Select>
  )
}
export default memo(SelectSearch)
