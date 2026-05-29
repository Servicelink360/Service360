import React from 'react'
import { Spin } from 'antd'
const LoadingV2 = () => {
  return (
    <div
      style={{
        display: 'flex',
      }}
    >
      
      <Spin
        // size="large"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
export default LoadingV2
