import styled from 'styled-components';
// import { palette } from 'styled-theme';
const styledTheme = require('styled-theme');
const { palette } = styledTheme;
const AntSwitch = (ComponentName: any) => styled(ComponentName)`
  &.ant-switch-checked {
    border-color: ${palette('primary', 0)};
    background-color: ${palette('primary', 0)};
  }
`;

export default AntSwitch;
