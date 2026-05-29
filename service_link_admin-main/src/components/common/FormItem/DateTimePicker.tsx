import { Form, DatePicker } from 'antd'
import { useIntl } from 'react-intl'
import React from 'react'
import { IFormDatePicker } from '@app/interfaces/IFormDatePicker'

const DateTimePicker = ({
  name,
  label,
  isRequired,
  style,
  className,
  onChange,
  disabledDate = () => {},
  picker,
  format = 'DD/MM/YYYY HH:mm:ss',
}: IFormDatePicker) => {
  const intl = useIntl()
  return (
    <>
      <Form.Item
        name={name}
        className={className}
        label={label}
        style={{ maxWidth: '100%', ...style }}
        rules={[{ required: isRequired, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
      >
        <DatePicker
          showTime
          picker={picker}
          onChange={onChange}
          disabledDate={disabledDate}
          style={{ width: '100%', minHeight: '32px',marginBottom:10 }}
          format={format}
        />
      </Form.Item>
    </>
  )
}

export default DateTimePicker
