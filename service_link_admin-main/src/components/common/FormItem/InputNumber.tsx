import { Form } from "antd";
import { InputNumber } from 'antd';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormInputNumber } from "@app/interfaces/IFormInputNumber";
const DetailInput = ({
    name,
    label,
    isRequired,
    Min,
    Max,
    style,
    className,
    disable,
    isFormatter,
    defaultValue,
    onChange,
    step
}: IFormInputNumber) => {
    const intl = useIntl();
    return (
        <>
            <Form.Item name={name}
                className={className}
                label={label}
                style={{ maxWidth: '100%', flex: 'auto', ...style }}
                initialValue={defaultValue}
                rules={[{ required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}>
                <InputNumber
                    onChange={onChange} step={step}
                    disabled={disable}
                    style={{ width: '100%',textAlign:'right' }}
                    // formatter={isFormatter && ((value: any) => value && Intl.NumberFormat('vi-VN').format(value))}
                    formatter={isFormatter &&  (value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                    min={Min}
                    max={Max} />
            </Form.Item>
        </>
    )
}

export default DetailInput;