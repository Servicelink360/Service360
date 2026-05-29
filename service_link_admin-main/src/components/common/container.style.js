import styled from "styled-components";
import { Row } from "antd";
import Buttons from "@app/components/uielements/button";
import { palette } from "styled-theme";
const UsersDiv = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
`;
const ButtonDiv = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-radius: 0.5rem;
  width: 100%;
  margin-top: 10px;
`;
const ButtonMR = styled.button`
  margin-right: 16px;
`;
const InformationDiv = styled.div`
  width: 100%;
  margin-top: 1rem;
  overflow: hidden;
`;

const StatusRow = styled(Row)`
  width: 100%;
`;
const UsernameRow = styled(Row)`
  display: flex;
  justify-content: space-between;
  align-items: end;
  width: 100%;
`;


const Fieldset = styled.div`
    .ant-form-item-label{
        flex: 0 0 120px !important;
    }

    .ant-form-item-label > label::after {
        content: '' !important;
        position: relative; 
        margin: 0px;
    }

    .ant-form-item-label > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before {
        display: inline-block;
        margin-right: 4px;
        color: #ff4d4f;
        font-size: 14px;
        font-family: SimSun, sans-serif;
        line-height: 1;
        content: '*';
    }
    .ant-form-item-label > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before {
        position: absolute !important;
        right: -8px;
        margin-right: 0 !important;
    }
`;

const ActionsWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
  grid-column-gap: 10px;
  
`
const ActionsWrapper3c = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 1fr;
  grid-column-gap: 10px;
  
`
const ActionListBtn = styled(Buttons)`
  && {
    padding: 0 12px;
    // width: 104px;
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

export {
  UsersDiv,
  InformationDiv,
  ButtonMR,
  ButtonDiv,
  UsernameRow,
  StatusRow,
  Fieldset,
  ActionsWrapper,
  ActionListBtn,
  ActionsWrapper3c
};
