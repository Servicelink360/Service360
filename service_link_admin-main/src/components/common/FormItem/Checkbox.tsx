import { Checkbox, Form } from "antd";
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormCheckBox } from "@app/interfaces/IFormInput";

const SvCheckBox = ({
    name,
    label,
    isRequired,
    style,
    className,
    disable,
    rules,
    defaultValue,
    onChange
}: IFormCheckBox) => {
    const intl = useIntl();
    return (
        <>
            <Form.Item
                valuePropName='checked'
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
                <Checkbox onChange={onChange} disabled={disable} >{ }</Checkbox>
            </Form.Item>
        </>
    )
}

export default SvCheckBox;