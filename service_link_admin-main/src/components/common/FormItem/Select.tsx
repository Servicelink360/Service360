import { Form } from "antd";
import { Select } from 'antd';
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormSelect } from "@app/interfaces/IFormSelect";

const CSelect = ({
    name,
    label,
    isRequired,
    style,
    className,
    onChange,
    optionLabel,
    optionValue,
    options,
    disable,
    defaultValue,
    allowClear = true,
    mode = null,
    placeholder
}: IFormSelect) => {
    const intl = useIntl();
    return (
        <>
            <Form.Item
                initialValue={defaultValue}
                name={name}
                label={label}
                className={className}
                style={{ maxWidth: '100%', ...style }}
                rules={[{ required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
            >
                <Select loading={options ? false : true}
                    allowClear={allowClear}
                    showSearch
                    mode={mode}
                    placeholder={placeholder}
                    optionFilterProp={optionLabel}
                    options={options} fieldNames={{
                        label: optionLabel,
                        value: optionValue
                    }}
                    onChange={(_: any, option: any) => {
                        if (onChange) {
                            onChange(option ?? null);
                        }
                    }}
                    style={{ minHeight: 0 }}
                    disabled={disable} />
            </Form.Item>
        </>
    )
}

export default CSelect;