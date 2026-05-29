import { Form } from "antd";
import Input from '@app/components/uielements/input';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormInput } from "@app/interfaces/IFormInput";

const InputForm = ({
    name,
    label,
    isRequired,
    Max,
    placeholder,
    style,
    className,
    classNameInput,
    disable,
    type,
    rules,
    defaultValue,
    onChange
}: IFormInput) => {
    const intl = useIntl();
    return (
        <>
            <Form.Item
                name={name}
                className={className}
                initialValue={defaultValue}
                label={label} style={{ maxWidth: '100%', ...style }}
                rules={rules ? rules : [
                    {
                        required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' })
                    },
                    // {
                    //     max: Max, message: intl.formatMessage({ id: 'form.error.Max' })
                    // }
                ]}
            >
                <Input type={type || 'text'} disabled={disable}
                    onChange={onChange}
                    className={classNameInput} maxLength={Max} allowClear autoComplete="newpassword" placeholder={placeholder} />
            </Form.Item>
        </>
    )
}

export default InputForm;