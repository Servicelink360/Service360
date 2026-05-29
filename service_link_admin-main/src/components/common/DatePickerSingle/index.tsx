import React, { useState } from "react";
import { DatePicker, Button } from 'antd';
import moment from 'moment';
import { dateFormat } from '@app/config/data.config';

export interface DatePickerSingleProps {
    onChange: (date: any, dateString: string) => void;
    disabledDate?: (current: any) => any;
    style?: any;
    format?: string;
    placeholder?: string;
    myDefaultValue?: any;
    defaultValue?: any;
    groupButton?: any;
    limit?: number;
}
const DatePickerSingle: React.FC<DatePickerSingleProps> = ({ onChange, style, limit, format, defaultValue, myDefaultValue, groupButton, ...props }) => {
    const [currentDate, setCurrentDate] = useState(myDefaultValue ? moment(myDefaultValue) : moment());
    const myFormat = format || dateFormat;
    const updateDate = (date: any, dateString: string) => {
        setCurrentDate(date);
        onChange(date, dateString);
    }
    const listButton = groupButton || { before: [{ number: 7, text: "-7" }, { number: 1, text: "-1" }], after: [{ number: 1, text: "+1" }, { number: 7, text: "+7" }] };

    return (
        <div style={{ display: "flex" }}>
            {listButton.before && listButton.before.map((btn: any, index: number) => {
                return <Button
                    key={index}
                    type="primary"
                    disabled={ limit ? (moment().subtract(limit - btn.number , 'days')).isSameOrAfter(currentDate) : false}
                    onClick={() => {
                        let d = moment(currentDate).subtract(btn.number, 'days');
                        updateDate(d, d.format(myFormat));
                    }}
                    style={index > 0 ? { margin: "auto 5px" } : {}}
                >
                    {btn.text}
                </Button>
            })}
            <DatePicker allowClear={false} style={style} placeholder=""  onChange={updateDate} format={myFormat} {...props} />
            {listButton.after && listButton.after.map((btn: any, index: number) => {
                return <Button
                    key={index}
                    type="primary"
                    onClick={() => {
                        let d = moment(currentDate).add(btn.number, 'days');
                        updateDate(d, d.format(myFormat));
                    }}
                    style={{ marginLeft: "5px" }}
                >
                    {btn.text}
                </Button>
            })}
        </div >
    )
}
export default DatePickerSingle;