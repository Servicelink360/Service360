import styled from "styled-components";
import { Form, Row, DatePicker } from "antd";
import { ActionBtn } from "@app/components/common/Common.styles";
import { FaPalette } from "react-icons/fa";
const ModalForm = styled(Form)`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
`;
const ModalRow = styled(Row)`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const ButtonActionBtn = styled(ActionBtn)`
  border: none;
  width: 7.5rem;
  font-size: 1.25rem;
  color: #ffffff;
  margin-bottom: 1rem;
  border-radius: 0.25rem;
  margin-left: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 1rem;
  background-color: rgb(55, 125, 232);
`;
const FooterRow = styled(Row)`
  width: 100%;
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0 0.4rem 0;
  border-top: 1px solid rgb(236, 224, 224);
  border-bottom: 1px solid rgb(236, 224, 224);
`;
const DateH5 = styled.h5`
  color: rgb(66, 61, 61);
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
`;
const ButtonDiv = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;
const ImageDiv = styled.div`
  width: 100%;
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
`;
const Span = styled.span`
  color: red;
`;
const Date = styled(DatePicker)`
  width: 100%;
`;
const SpanRequired = styled.span`
  color: rgb(238,106,102);
  font-size: 0.75rem;
  margin-left: 0.25rem;
`;
const H5 = styled.h5`
  padding-bottom: 0.5rem;
`;
const Label = styled.label`
  font-size: 13px;
  color: ${FaPalette('text', 1)};
  line-height: 1.5;
  font-weight: 500;
  padding: 0;
  p {
    margin-top: 0.3rem;
  }
`;
const ButtonActionBtnW = styled(ButtonActionBtn)`
  width: 3.75rem;
`;
const ActionHeaderModalWrap = styled.div`
  width: 50%;
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
  padding: 5px 0;
  justify-content: space-between;
`;

const BodyModalWrap = styled.div`
  width: 100%;
  display: flex;
  padding: 15px 0;


@media (max-width: 576px) {
    .l-padding-media-max-576 {
      padding-left: 0px !important
    }
}

@media (min-width: 576px) {
  .l-padding-media-max-576 {
    padding-left: 15px !important
  }
}

@media (min-width: 576px) {
  .padding-media-max-576 {
    padding-left: 5px !important;
    padding-right: 5px !important
  }
}


@media (max-width: 576px) {
  .r-padding-media-max-576 {
    padding-right: 0px !important
  }
}

@media (min-width: 576px) {
.r-padding-media-max-576 {
  padding-right: 15px !important
}
}
`;


const BodyModalContainerWrap = styled.div`
  .ant-modal-body{
    padding: 0px !important;
  }
`;

export {
  ActionHeaderModalWrap, BodyModalWrap, FooterModalWrap, WrapTitleModal, ModalRow, Label, ButtonActionBtnW, H5, Span, SpanRequired, ButtonActionBtn, Date, ButtonDiv, ModalForm,
  FooterRow, ImageDiv, DateH5,BodyModalContainerWrap
};
