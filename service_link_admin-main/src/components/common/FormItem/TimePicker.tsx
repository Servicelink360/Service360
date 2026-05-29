import { Form, TimePicker } from "antd";
// import DatePicker from '@app/components/uielements/datePicker';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormDatePicker } from "@app/interfaces/IFormDatePicker";

const TimePickerForm = ({
    name,
    label,
    isRequired,
    style,
    className,
    onChange,
    format = "HH:mm"
}: IFormDatePicker)=>{
    const intl = useIntl();
    return(
        <>
            <Form.Item name={name} className={className}  label={label} style={{ maxWidth: '100%', ...style}} 
            rules={[{required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' })}]}>
                 <TimePicker  style={{ width: '100%', minHeight: '32px' }} format={format} onChange={onChange} />
            </Form.Item>
        </>
    )
}

export default TimePickerForm;