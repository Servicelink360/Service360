import React from 'react'
import { Spin } from 'antd'
import { useSelector } from 'react-redux'
import { LoadingDiv } from './loading.style'
const Loading = () => {
  const loading: boolean = useSelector(
    (state: any) => state?.Monitoring.loading,
  )
  return (
    <LoadingDiv
      style={{
        display: loading ? 'flex' : 'none',
        zIndex: 10,
      }}
    >
      <Spin
        size="large"
        className="loading-spin"
        // style={{
        //   display: 'flex',
        //   justifyContent: 'center',
        //   alignItems: 'center',
        //   width: '100%',
        //   height: '100%',
        // }}
      />
    </LoadingDiv>
  )
}
export default Loading
