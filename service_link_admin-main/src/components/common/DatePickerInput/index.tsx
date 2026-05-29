import React, { useState } from "react";
import { DatePicker, InputNumber  } from 'antd';
import moment from 'moment';
import { dateFormat } from '@app/config/data.config';

export interface DatePickerSingleProps {
    onChange: (date: any, dateString: string) => void;
    disabledDate?: (current: any) => any;
    style?: any;
    format?: string;
    placeholder?: string;
    myDefaultValue?: any;
    groupButton?: any;
}
const DatePickerSingle: React.FC<DatePickerSingleProps> = ({ onChange, style, format, myDefaultValue, groupButton, ...props }) => {
    // const [currentDate, setCurrentDate] = useState(myDefaultValue ? moment(myDefaultValue) : moment());
    const myFormat = format || dateFormat;
    const updateDate = (date: any, dateString: string) => {
        // setCurrentDate(date);
        onChange(date, dateString);
    }
   
    return (
        <div style={{ display: "flex" }}>
            <DatePicker allowClear={false} style={style} onChange={updateDate} format={myFormat} {...props} />
            <InputNumber onChange={(date) => {
                let d = moment().add(date, 'days');
                updateDate(d, d.format(myFormat));
            }}/>
        </div >
    )
}
export default DatePickerSingle;