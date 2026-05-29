import styled from 'styled-components';
// import { palette } from 'styled-theme';
const styledTheme = require('styled-theme');
const { palette } = styledTheme;

const BoxWrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 13px;
  background-color: #ffffff;
  // border: 1px solid ${palette('border', 0)};
  margin: 0 0 30px;
  border-radius: 0.75rem;
  box-shadow: 0px 1px 5px 2px rgb(230 230 230 / 75%);
  -webkit-box-shadow: 0px 1px 5px 2px rgb(230 230 230 / 75%);
  -moz-box-shadow: 0px 1px 5px 2px rgba(230,230,230,0.75);
  &:last-child {
    margin-bottom: 0;
  }

  /* New Reports: full-bleed dark list (layout unchanged in light mode) */
  html[data-color-mode='dark'] body.new-reports-page-body-dark & {
    background-color: #000000 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
    -moz-box-shadow: none !important;
    padding: 0 !important;
    margin: 0 0 0 0 !important;
  }

  /* Dashboard: force dark card in mobile portrait dark mode */
  html[data-color-mode='dark'] body.dashboard-page-body-dark & {
    background-color: #121212 !important;
    border: 1px solid #333333 !important;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 20px 60px rgba(0, 0, 0, 0.95) !important;
    -webkit-box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 20px 60px rgba(0, 0, 0, 0.95) !important;
    -moz-box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 20px 60px rgba(0, 0, 0, 0.95) !important;
  }

  @media only screen and (max-width: 767px) {
    padding: 20px;
    ${'' /* margin: 0 10px 30px; */};
  }

  &.half {
    width: calc(50% - 34px);
    @media (max-width: 767px) {
      width: 100%;
    }
  }
`;

export { BoxWrapper };
