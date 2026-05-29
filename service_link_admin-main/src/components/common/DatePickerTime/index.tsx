import React, { memo } from 'react'
import { DatePicker } from 'antd'
import moment from 'moment'
interface DatePickerTimeComponentProps {
  onChange?: (date: any, dateString: string) => void;
  format: string,
  style: object,
  disableDatePrevius?: any,
  form?: any,
  time?: boolean
}
// const range = (start: number, end: number) => {
//   const result = [];
//   for (let i = start; i < end; i++) {
//     result.push(i);
//   }
//   return result;
// };

// eslint-disable-next-line arrow-body-style


const DatePickerComponent: React.FC<DatePickerTimeComponentProps> = ({onChange, style, format, disableDatePrevius, time, form, ...props }) => {

  // const hour = disableDatePrevius ? moment(disableDatePrevius).hour() : 0
  // const minutes = disableDatePrevius ? moment(disableDatePrevius).minutes() : 0
  const disabledDate = current => {
    return   current <  moment(disableDatePrevius).subtract(0, 'day');
  };
  // const disabledDateTime = () => ({
  //   disabledHours: () => range(0, hour),
  //   disabledMinutes: () => range(0, minutes),
  //   // disabledSeconds: () => [55, 56],
  // });
  return (
    <DatePicker
      style={style}
      disabledDate={disableDatePrevius ? disabledDate : null}
      // disabledTime={ disabledDateTime }
      defaultValue={disableDatePrevius ? moment(): null }
      showTime={time ? { defaultValue:  moment('00:00:00', 'HH:mm') } : null}
      format={format}
      allowClear={false}
      onChange={onChange}
      placeholder=" "
      {...props}
    />
  )
}
export default memo(DatePickerComponent)
