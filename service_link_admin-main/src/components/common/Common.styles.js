import styled from "styled-components";
import { palette } from "styled-theme";
import Buttons from "@app/components/uielements/button";
import Table from "./AntTables.styles";

const TableWrapper = styled(Table)`
  .ant-table-bordered .ant-table-thead > tr > th,
  .ant-table-bordered .ant-table-tbody > tr > td {
    white-space: normal;
    &.noWrapCell {
      white-space: nowrap;
    }

    @media only screen and (max-width: 920px) {
      white-space: nowrap;
    }
  }
  .ant-table-footer {
    background: #ffffff ;
    color: #3a3a3a;
    text-align: center;
}

.ant-table-tbody > tr > td > .ant-table-wrapper:only-child .ant-table, .ant-table-tbody > tr > td > .ant-table-expanded-row-fixed > .ant-table-wrapper:only-child .ant-table {
  margin: 0px
}
  .MyInputNumber{
    input{
        text-align: right !important;
        padding-right: 25px !important;
    }
}
`;

const StatusTag = styled.span`
  padding: 0 5px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  background-color: ${palette('primary', 0)};
  font-size: 12px;
  color: #ffffff;
  text-transform: capitalize;
  cursor: pointer;

  &.draft {
    background-color: gray;
  }

  &.publish {
    background-color: ${palette('success', 0)};
  }
`;

const TitleWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;
const HeaderWrapper = styled.div`
  margin-bottom: 20px;
`;
const ButtonHolders = styled.div``;

const ComponentTitle = styled.h3`
  font-size: 16px;
  font-weight: 500;
  color: ${palette("text", 0)};
  margin: 5px 0;
`;

const ActionBtn = styled(Buttons)`
  && {
    padding: 0 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 10px;
    
    &:last-child {
      margin-right: 0;
    }
    .anticon{
      font-size: 10px;
    }
    i {
      font-size: 17px;
      color: ${palette("text", 1)};
    }

    &:hover {
      i {
        color: inherit;
      }
    }
  }
`;
const ActionsWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 1fr;
  grid-column-gap: 10px;
  
`
const ActionListBtn = styled(Buttons)`
  && {
    padding: 0 12px;
    width: 104px;
    height:35px;
    @media screen and (max-width: 375px){
      width:91px;
    }
    &:last-child {
      margin-right: 0;
    }
    svg{
      width: 10px;
      height:10px;
    }
    i {
      font-size: 10px;
      color: ${palette("text", 1)};
    }

    &:hover {
      i {
        color: inherit;
      }
    }
  }
`;
const Fieldset = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  font-size: 13px;
  color: ${palette("text", 1)};
  line-height: 1.5;
  font-weight: 500;
  padding: 0;
  margin: 0 0 8px;
`;

const ActionWrapper = styled.div`
  display: flex;
  align-content: center;

  a {
    margin-right: 12px;
    &:last-child {
      margin-right: 0;
    }

    i {
      font-size: 18px;
      color: ${palette("primary", 0)};

      &:hover {
        color: ${palette("primary", 4)};
      }
    }

    &.deleteBtn {
      i {
        color: ${palette("error", 0)};

        &:hover {
          color: ${palette("error", 2)};
        }
      }
    }
  }
`;

const Form = styled.div``;
const ActionHeaderModalWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-direction: row;
  align-items: flex-end;
`;

const WrapTitleModal = styled.div`
  justify-content: space-between;
  align-items: center;
  display: flex;
`;
const FooterModalWrap = styled.div`
  width: 100%;
  border-bottom: 1px solid rgb(240, 240, 240);
  padding: 15px 0;
  justify-content: space-between;
`;

const ActionModalWrap = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  flex-direction: row;
  align-items: flex-end;
`;
const DashboardWarp = styled.div`
.dashboard-title{
  font-size: 12pt;
}
.status-wrap{
  width: 150px;
  height: 72px;
  padding: 8px;
}

.dashboard-item{
  margin-top:10px;
  margin-bottom:10px;
  text-align:center;
}

.dashboard-item--flush {
  margin-top: 0;
  padding-top: 0;
}

.dashboard-section-heading {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px;
}

.status-wrap .lable{
  font-size: 14pt;
}

.status-wrap .count{
  font-size: 26pt;
  margin-top:10px;
  text-align:center
}

.dashboard-report-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 48px;
  margin-top: 0;
}

.dashboard-report-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.dashboard-report-badge:hover .dashboard-report-badge__circle {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dashboard-report-badge__icon-wrap {
  position: relative;
  display: inline-flex;
}

.dashboard-report-badge__circle {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dashboard-report-badge__circle--reports {
  background: #4caf50;
}

.dashboard-report-badge__circle--faults {
  background: #2196f3;
}

.dashboard-report-badge__circle--checkin {
  background: #ff9800;
}

.dashboard-report-badge__circle--tickets {
  background: #7b1fa2;
}

.dashboard-faults-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.dashboard-faults-badge:hover .dashboard-faults-badge__icon-wrap {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dashboard-faults-badge__icon-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: visible;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dashboard-fault-report-badge-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  position: relative;
  z-index: 1;
  border-radius: 50%;
}

.dashboard-faults-badge__count {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 10;
  min-width: 26px;
  height: 26px;
  border-radius: 13px;
  background: #ff4d4f;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid #fff;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.dashboard-report-badge__circle--action {
  font-size: 36px;
  line-height: 1;
}

.dashboard-report-badge__label {
  margin-top: 14px;
  font-size: 18px;
  font-weight: 600;
  color: #555;
}

.dashboard-messages-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.dashboard-messages-badge:hover .dashboard-messages-badge__icon-wrap {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dashboard-messages-badge__icon-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #597ef7 0%, #2f54eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dashboard-messages-badge__count {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 26px;
  height: 26px;
  border-radius: 13px;
  background: #ff4d4f;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid #fff;
  line-height: 1;
}

.dashboard-messages-badge__label {
  margin-top: 14px;
  font-size: 18px;
  font-weight: 600;
  color: #555;
}

@keyframes report-row-highlight-pulse {
  0%,
  100% {
    background: #fff7e6;
  }
  50% {
    background: #ffe7ba;
  }
}

.report-row-highlight > td {
  background: #fff7e6 !important;
  animation: report-row-highlight-pulse 1.8s ease-in-out 2;
}

.report-row-highlight > td:first-child {
  box-shadow: inset 4px 0 0 #fa8c16;
}

`
export {
  ActionBtn,
  Fieldset,
  Label,
  Form,
  TitleWrapper,
  ButtonHolders,
  ActionWrapper,
  ComponentTitle,
  TableWrapper,
  StatusTag,
  HeaderWrapper,
  ActionListBtn,
  ActionHeaderModalWrap,
  WrapTitleModal,
  FooterModalWrap,
  ActionModalWrap,
  ActionsWrapper,
  DashboardWarp
};
