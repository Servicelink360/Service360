import { Pie } from '@ant-design/plots'
import React from 'react'

const PieChart = ({ data, valueFieldName, typeFieldName }) => {
  const config = {
    appendPadding: 10,
    data,
    angleField: valueFieldName ?? 'value',
    colorField: typeFieldName ?? 'type',
    radius: 0.9,
    width: 100,
    label: {
      type: 'inner',
      offset: '-30%',
      // content: ({ percent }) => `${(percent * 100).toFixed(0)}%`,
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  }

  return <Pie {...config} />
}

export default PieChart
