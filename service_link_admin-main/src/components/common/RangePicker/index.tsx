import React, { memo, useState } from 'react'
import { DatePicker, Button } from 'antd'
import { dateFormat } from '@app/config/data.config';
import moment from 'moment'

interface DateRangePickerProps {
    onChange: (date: any, dateTime: string[]) => void;
    disabledDate?: (current: any) => any;
    allowClear?: boolean;
    style: any;
    isLimit?: boolean;
}
interface CustomComponentProps {
    className?: string;
    format?: string;
    size?: string;
    myDefaultValue?: any;
}

const MyRangePicker: React.FC<DateRangePickerProps & CustomComponentProps> = ({
    style,
    onChange,
    disabledDate,
    isLimit,
    allowClear,
    format,
    size,
    myDefaultValue,
    ...props
}) => {
    const { RangePicker } = DatePicker;
    const [currentDate, setCurrentDate] = useState([
        myDefaultValue ? moment(myDefaultValue[0]).zone("+10:00") : moment().zone("+10:00"),
        myDefaultValue ? moment(myDefaultValue[1]).zone("+10:00") : moment().zone("+10:00")
    ]);
    const myFormat = format || dateFormat;
    const updateDate = (dates: any, dateString: string[]) => {
        setCurrentDate(dates);
        onChange(dates, dateString);
    }
    return (
        <div style={{ display: 'flex' }}>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment(currentDate[0]).subtract(7, 'days').zone("+10:00");
                    let end = moment(currentDate[1]).zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                disabled={isLimit ? moment(currentDate[0]).zone("+10:00") <  moment().zone("+10:00").subtract(84, 'days') : false}
            >
                -7
            </Button>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment(currentDate[0]).subtract(1, 'days').zone("+10:00");
                    let end = moment(currentDate[1]).zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{ margin: "auto 5px" }}
                disabled={isLimit ? moment(currentDate[0]).zone("+10:00") <  moment().zone("+10:00").subtract(90, 'days') : false}
            >
                -1
            </Button>
            <RangePicker allowClear={false} style={style} disabledDate={disabledDate} onChange={updateDate} format={myFormat} {...props} />
            <Button
                type="primary"
                onClick={() => {
                    let start = moment().subtract(1, 'days').zone("+10:00");
                    let end = moment().subtract(1, 'days').zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{
                    borderColor: "#28a745",
                    backgroundColor: "#28a745",
                    marginLeft: "5px",
                }}
            >
                Y
            </Button>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment().zone("+10:00");
                    let end = moment().zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{
                    borderColor: "#28a745",
                    backgroundColor: "#28a745",
                    marginLeft: "5px",
                }}
            >
                T
            </Button>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment().add(1, 'days').zone("+10:00");
                    let end = moment().add(1, 'days').zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{
                    borderColor: "#28a745",
                    backgroundColor: "#28a745",
                    marginLeft: "5px",
                }}
            >
                N
            </Button>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment(currentDate[0]).zone("+10:00");
                    let end = moment(currentDate[1]).add(1, 'days').zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{ marginLeft: "5px" }}
            >
                +1
            </Button>
            <Button
                type="primary"
                onClick={() => {
                    let start = moment(currentDate[0]).zone("+10:00");
                    let end = moment(currentDate[1]).add(7, 'days').zone("+10:00");
                    updateDate([start, end], [start.format(myFormat), end.format(myFormat)]);
                }}
                style={{ marginLeft: "5px" }}
            >
                +7
            </Button>
        </div>
    )
}

export default memo(MyRangePicker)
