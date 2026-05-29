import React from 'react'
import { Spin } from 'antd'
const CustomLoading = () => {
    return (
          <div
          // className="ag-overlay-loading-center"
          style={{ height: '9%' }}
        >
          <Spin size="large"></Spin>
        </div>
      );
}

export default CustomLoading