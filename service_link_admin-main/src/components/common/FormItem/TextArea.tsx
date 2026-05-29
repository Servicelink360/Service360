import { Form } from "antd";
import {Textarea} from '@app/components/uielements/input';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormInput } from "@app/interfaces/IFormInput";

const TextArea = ({
    name,
    label,
    isRequired,
    Max,
    placeholder,
    style,
    className,
    classNameInput,
    disable,
    rows
}: IFormInput)=>{
    const intl = useIntl();
    return(
        <>
            <Form.Item name={name} className={className}  label={label} style={{ maxWidth: '100%', ...style }} 
            rules={[{required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' })},{max: Max,  message: intl.formatMessage({ id: 'form.error.Max' }) }]}>
                 <Textarea rows ={rows | 2} disabled={disable} className={classNameInput} maxLength={Max + 5} allowClear autoComplete="newpassword" placeholder={placeholder}/>
            </Form.Item>
        </>
    )
}

export default TextArea;