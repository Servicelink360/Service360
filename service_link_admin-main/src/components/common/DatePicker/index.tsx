import React, { memo } from 'react'
import { DatePicker } from 'antd'
import moment from 'moment'
import { DatePickerComponentProps } from '@app/interfaces/IUsers'
const DatePickerComponent: React.FC<DatePickerComponentProps> = ({style,onChangeDate}) => {
  const { RangePicker } = DatePicker
  const dateFormat = 'YYYY/MM/DD';
  let now = moment();
  return (
    <RangePicker
    onChange={onChangeDate}
    style={style}
      defaultValue={[
        moment(now.format("YYYY-MM-DD"), dateFormat),
        moment(now.format("YYYY-MM-DD"), dateFormat),
      ]}
      format={dateFormat}
    />
  )
}
export default memo(DatePickerComponent)
