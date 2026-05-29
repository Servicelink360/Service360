import { Form, DatePicker } from "antd";
// import DatePicker from '@app/components/uielements/datePicker';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormDatePicker } from "@app/interfaces/IFormDatePicker";

const DatePickerForm = ({
    name,
    label,
    isRequired,
    style,
    className,
    onChange,
    disabledDate = () => {},
    picker,
    format = 'YYYY-MM-DD'
}: IFormDatePicker)=>{
    const intl = useIntl();
    return(
        <>
            <Form.Item name={name} className={className}  label={label} style={{ maxWidth: '100%', ...style}} 
            rules={[{required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' })}]}>
              <DatePicker picker={picker} onChange={onChange} disabledDate={disabledDate}
              style={{width: '100%',  minHeight: '32px'}} format={format}/>  
            </Form.Item>
        </>
    )
}

export default DatePickerForm;