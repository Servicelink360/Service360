import styled from 'styled-components';
import { Table } from 'antd';

const TableWrapper = styled(Table)`
  .ant-table {
    font-size: 12px;
    max-width: 100%;
    overflow-x: auto;
  }
  .ant-table-tbody > tr > td {
    padding: 7px;
  }
  .ant-table-bordered .ant-table-thead > tr > th,
  .ant-table-bordered .ant-table-tbody > tr > td {
    font-size: 12px;
    white-space: normal;
    &.noWrapCell {
      white-space: nowrap;
    }

    @media only screen and (max-width: 920px) {
      white-space: nowrap;
    }
  }
  .ant-table-thead > tr > th {
    white-space: nowrap;
  }
`;

export {
  TableWrapper,
};
