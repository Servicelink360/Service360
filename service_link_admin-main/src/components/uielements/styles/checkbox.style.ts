import styled from 'styled-components';
// import { palette } from 'styled-theme';
const styledTheme = require('styled-theme');
const { palette } = styledTheme;
const AntCheckbox = (ComponentName: any) => styled(ComponentName)`
  &.ant-checkbox-wrapper {
    font-size: 13px;
    color: ${palette('text', 1)};
    vertical-align: middle;
  }
`;

export default AntCheckbox;
