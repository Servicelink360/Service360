import { FaPalette } from "react-icons/fa";
import styled from "styled-components";
import { Row } from "antd";
import { breakPoint } from "@app/assets/styles/breakPoints";
// import { palette } from 'styled-theme';
// const styledTheme = require("styled-theme");
// const { palette } = styledTheme;
export const BackgroundImage = styled.img`
  width: 100%;
  height: 200px;
  @media only screen and (max-width: ${breakPoint.SmTablet}px) {
    height: 150px;
  }
  max-height: 100%;
  max-width: 100%;
`;
export const SubmitButton = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  flex-direction: column;

  .btn {
    width: 100%;
    max-width: 1465px;
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      max-width: 1250px;
    }
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      max-width: 1025px;
      >div{
        margin: 0 1rem;
      }
    }
    @media only screen and (max-width: ${breakPoint.MDesktop}px) {
      max-width: 975px;
    }
    @media only screen and (max-width: ${breakPoint.SDesktop}px) {
      max-width: 900px;
    }
    @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
      max-width: 550px;
      >div{
        margin:0;
      }
    }
    @media only screen and (max-width: ${breakPoint.SmTablet}px) {
      max-width: 445px;
      >div{
         margin:0 1rem;
      }
    }
    margin: 0 auto;
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    .submit {
      margin-top: 1.25rem;
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        margin-top: 1rem;
        margin-bottom: 1rem;
      }
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
    }
    &__parent {
      width: 179px;
      height: 45px;
      background-color: #1890ff;
      font-size: 14px;
      border-radius: 6px;
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        font-size: 12px;
        width: 149px;
        height: 35px;
      }
    }
  }
`;
export const SectionForm = styled.section`
  display: flex;
  justify-content: space-between;
  // align-items: center;
  //flex-wrap: wrap;
  width: 100%;
  max-width: 1465px;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    max-width: 1250px;
  }
  @media only screen and (max-width: ${breakPoint.LDesktop}px) {
    max-width: 1025px;
  }
  @media only screen and (max-width: ${breakPoint.MDesktop}px) {
    max-width: 975px;
  }
  @media only screen and (max-width: ${breakPoint.SDesktop}px) {
    max-width: 900px;
  }
  @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
    max-width: 685px;
    flex-wrap: wrap;
    justify-content: center;
  }
  @media only screen and (max-width: ${breakPoint.SmTablet}px) {
    max-width: 460px;
  }
  @media only screen and (max-width: ${breakPoint.MDPhone}px) {
    width: 100%;
  }
  margin: 0 auto;
  height: 100%;
  /* max-height: 475px; */
  .left {
    width: 100%;
    max-width: 720px;
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      max-width: 612.5px;
    }
    height: 100%;
    padding: 1.75rem 4.75rem 1.75rem 3.25rem;
    &__autoHeight{
      height:auto;
      min-height: auto !important;
      align-items: stretch;
      .change__password {
        margin-top: 1.5rem;
        padding-top: 0.25rem;
      }
    }
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      padding: 1.25rem 3.5rem 1.25rem 2.25rem;
      min-height: 380px;
      margin-right: 1rem;
      margin-left: 1rem;
      max-width: 550px;
      margin-top: 1rem;
    }
    @media only screen and (max-width: ${breakPoint.SDesktop}px) {
      padding: 1.25rem 3rem 1.25rem 2.25rem;
    }

    min-height: 400px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    margin-top: 1rem;
    border-radius: 0.75rem;
    background-color: white;
    box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
    -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
    -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
    .divide {
      width: 100%;
      margin: 2.25rem 0 2.25rem 0;
      border-top: 1px solid #D9D9D9;
    }
    .change__password {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      &__main {
        margin-top: 2rem;
        width: 260px;
        background-color: #1890ff;
        font-size: 14px;
        color: white;
        height: 45px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          height: 38px;
          font-size: 12px;
          width: 200px;
        }
      }
    }
    &__input {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      &__main {
        font-size: 12px;
        margin-top: 1rem;
        height: 36px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          height: 30px;
        }
      }
      .wrapperTitleField{
        display: flex;
        align-items: baseline;
      }
      &__icon {
        margin-top: 0.5rem;
        font-size: 14px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          font-size: 14px;
        }
      }
      &__gender {
        margin-left: 1.25rem;
        color: #000000;
        font-size: 12px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          font-size: 12px;
        }
        &__star {
          color: red;
        }
      }
      &__title {
        margin-left: 1rem;
        color: #000000;
        font-size: 12px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          font-size: 12px;
        }
        &__star {
          color: red;
        }
      }
    }
    h3 {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      font-weight: bold;
      font-size: 20px;
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        font-size: 14px;
      }
      width: 100%;
    }
  }
  .right {
    display: flex;
    justify-content: flex-start;
    //align-items: center;
    align-content: space-between;
    flex-direction: column;
    width: 100%;
    max-width: 720px;
    margin-top: 1rem;
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      max-width: 612.5px;
    }
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      margin-right: 1rem;
      margin-left: 1rem;
      max-width: 550px;
    }
    &-top {
      padding: 1.75rem 4.75rem 1.75rem 3.25rem;
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        padding: 1.25rem 3.5rem 1.25rem 2.25rem;
        min-height: 200px;
        max-width: 550px;
      }
      @media only screen and (max-width: ${breakPoint.SDesktop}px) {
        padding: 1.25rem 3rem 1.25rem 2.25rem;
      }
      @media only screen and (max-width: ${breakPoint.SmTablet}px) {
        max-width: 445px;
      }
      @media only screen and (max-width: ${breakPoint.MDPhone}px) {
        width: 100%;
      }
      width: 100%;
      height: 100%;
      min-height: 250px;
      
      border-radius: 0.75rem;
      background-color: white;
      box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      h3 {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        font-weight: bold;
        font-size: 20px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          font-size: 14px;
        }
        width: 100%;
      }
      &__input {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        &__main {
          margin-top: 1rem;
          font-size: 12px;
          height: 36px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            height: 30px;
          }
        }

        &__icon {
          margin-top: 0.5rem;
          font-size: 14px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 14px;
          }
        }
        &__gender {
          margin-left: 1.25rem;
          color: #000000;
          font-size: 12px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 12px;
          }
          &__star {
            color: red;
          }
        }
        &__title {
          margin-left: 1rem;
          color: #000000;
          font-size: 12px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 12px;
          }
          &__star {
            color: red;
          }
        }
      }
    }
    &-bottom {
      padding: 1.75rem 4.75rem 1.75rem 3.25rem;
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        padding: 1.25rem 3.5rem 1.25rem 2.25rem;
        min-height: 150px;
        margin-top: 1rem;
        max-width: 550px;
      }
      @media only screen and (max-width: ${breakPoint.SDesktop}px) {
        padding: 1.25rem 3rem 1.25rem 2.25rem;
      }
      @media only screen and (max-width: ${breakPoint.SmTablet}px) {
        max-width: 445px;
      }
      @media only screen and (max-width: ${breakPoint.MDPhone}px) {
        width: 100%;
      }
      width: 100%;
      // height: 100%;
      // margin-top: 1.5rem;
      min-height: 202px;
      border-radius: 0.75rem;
      background-color: white;
      box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
      h3 {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        font-weight: bold;
        font-size: 20px;
        @media only screen and (max-width: ${breakPoint.LDesktop}px) {
          font-size: 14px;
        }
        width: 100%;
      }
      &__input {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        &__main {
          font-size: 12px;
          margin-top: 1rem;
          height: 36px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            height: 30px;
          }
        }

        &__icon {
          margin-top: 0.5rem;
          font-size: 14px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 14px;
          }
        }
        &__gender {
          margin-left: 1.25rem;
          color: #000000;
          font-size: 12px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 12px;
          }
          &__star {
            color: red;
          }
        }
        &__title {
          margin-left: 1rem;
          color: #000000;
          font-size: 12px;
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            font-size: 12px;
          }
          &__star {
            color: red;
          }
        }
      }
    }
  }
`;
export const SectionInformation = styled.section`
  .choose {
    width: 100%;
    max-width: 100%;
    position: relative;
    background-color: white;
    height: 200px;
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      height: 170px;
    }
    @media only screen and (max-width: ${breakPoint.MDPhone}px) {
      height: 225px;
    }
    max-height: 100%;
    &__tab {
      position: absolute;
      bottom: 0;
      left: 6.5%;
      right: 6.5%;
      max-width: 890px;
      height: 100%;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      text-align: center;
      //  flex-wrap: wrap;
      overflow: auto;
      max-height: 45px;
      &-active {
        height: 100%;
        display: flex;
        color: #1890ff;
        justify-content: center;
        align-items: center;
        background-color: #f1f3f6;
      }
      &-deactive {
        background-color: #ffffff;
        height: 100%;
        display: flex;
        color: #000000;
        justify-content: center;
        align-items: center;
      }
      span {
        cursor: pointer;
        font-size: 14px;
        //  color: #000000;
        min-width: 148px;
        width: 100%;
        transition: background-color 0.5s ease-in-out, color 0.5s ease-in-out;
        &:hover {
          height: 100%;
          display: flex;
          color: #1890ff;
          justify-content: center;
          align-items: center;
          background-color: #f1f3f6;
        }
      }
      @media only screen and (max-width: ${breakPoint.SmTablet}px) {
        span {
          font-size: 12px;
        }
      }
      @media only screen and (max-width: ${breakPoint.MDPhone}px) {
        span {
          //       min-width: 18px;
          //padding: 0 1rem;
          font-size: 12px;
        }
      }
    }
    &__information {
      position: relative;
      top: 10%;
      left: 20.5%;
      max-width: 100%;
      h2 {
        font-size: 24px;
        font-weight: bold;
      }
      h3 {
        font-size: 18px;
      }
      p {
        font-size: 12px;
        margin-top: 0.5rem;
      }
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        h2 {
          font-size: 20px;
        }
        h3 {
          font-size: 16px;
        }
      }
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        top: 7.5%;
        left: 21%;
        h2 {
          font-size: 14px;
        }
        h3 {
          font-size: 12px;
        }
        p {
          font-size: 10px;
        }
      }
      @media only screen and (max-width: ${breakPoint.MDesktop}px) {
        left: 22%;
      }
      @media only screen and (max-width: ${breakPoint.SDesktop}px) {
        left: 23%;
      }
      @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
        left: 28.5%;
      }
      @media only screen and (max-width: ${breakPoint.SmTablet}px) {
        left: 38.5%;
      }
      @media only screen and (max-width: ${breakPoint.MDPhone}px) {
        left: 7.5%;
        //   margin-left:1.5rem;
        top: 42.5%;
      }
    }
    &__avatar {
      position: relative;
      top: -30%;
      left: 6.5%;
      width: 100%;
      .ant-image-mask{
        border-radius:50%;
        &:hover, &:focus{
          border-radius:50%;
        }
      }
      &__main {
        position: absolute;
        .camera {
          position: absolute;
            box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          bottom: 6px;
          right: -6px;
          cursor: pointer;
          object-fit: contain;
          width: 44px;
          height: 44px;
          border:none;
          span{
            font-size: 22px;
          }
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            width: 3.5rem;
            height: 3.5rem;
            right: -10%;
          }
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            width: 2.75rem;
            height: 2.75rem;
            right: -7.5%;
          }
          @media only screen and (max-width: ${breakPoint.MDesktop}px) {
            right: -10%;
          }
          @media only screen and (max-width: ${breakPoint.SDesktop}px) {
            right: -10%;
          }
          @media only screen and (max-width: ${breakPoint.SmTablet}px) {
            width: 2.5rem;
            height: 2.5rem;
          }
          @media only screen and (max-width: ${breakPoint.MDPhone}px) {
            width: 40px;
            height: 40px;
            right: 0%;
            span{
              font-size: 18px;
            }
          }
        }
        &__circle {
          /* position: relative; */
          width: 190px;
          height: 190px;
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            width: 175px;
            height: 175px;
            background-color: #e6e6e6;
          }
          @media only screen and (max-width: ${breakPoint.LDesktop}px) {
            width: 145px;
            height: 145px;
          }
          cursor: pointer;
          box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          border-radius: 50%;
          object-fit: cover;
          border: 6.5px solid #ffffff;
        }
      }
    }
  }
`;
export const BackgroundMain = styled.section`
  position: relative;
  width: 100%;
  /* background-color:red; */
  .camera {
    position: absolute;
    bottom: 0;
    right: 0;
    cursor: pointer;
    object-fit: contain;
    width: 44px;
    height: 44px;
    margin: 0 1.25rem 1rem 0;
    box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -webkit-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
          -moz-box-shadow: 0px 1px 5px 2px rgba(230, 230, 230, 0.75);
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      margin: 0 0.9rem 1rem 0;
      width: 3.5rem;
      height: 3.5rem;
    }
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      margin: 0 0.9rem 1rem 0;
      width: 2.75rem;
      height: 2.75rem;
    }
    @media only screen and (max-width: ${breakPoint.SDesktop}px) {
      margin: 0 0.9rem 0.75rem 0;
    }
    @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
      margin: 0 0.9rem 0.75rem 0;
    }
    @media only screen and (max-width: ${breakPoint.SmTablet}px) {
      margin: 0 0.75rem 0.75rem 0;
      width: 2.5rem;
      height: 2.5rem;
    }
    @media only screen and (max-width: ${breakPoint.MDPhone}px) {
      width: 2.25rem;
      height: 2.25rem;
    }
  }
  h3,
  h4 {
    position: absolute;
    top: 0;
    right: 0;
    color: white;
    font-size: 14px;
  }
  h3 {
    margin: 1.5rem 1.75rem 0 0;
  }
  h4 {
    margin: 3.5rem 1.75rem 0 0;
  }
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    h3,
    h4 {
      font-size: 12px;
      top: 7.5%;
      right: 0;
    }
    h3 {
      margin: 0.5rem 1.25rem 0 0;
    }
    h4 {
      margin: 2.25rem 1.25rem 0 0;
    }
  }
  @media only screen and (max-width: ${breakPoint.LDesktop}px) {
    h3,
    h4 {
      top: 7.5%;
    }
    h4 {
      margin: 2.25rem 1.25rem 0 0;
    }
  }
  @media only screen and (max-width: ${breakPoint.SDesktop}px) {
    h3,
    h4 {
      top: 2.5%;
    }
    h3 {
      margin: 1rem 1.25rem 0 0;
    }
    h4 {
      margin: 2.5rem 1.25rem 0 0;
    }
  }
  @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
    h3,
    h4 {
      top: 2.5%;
      /* font-size: 10px; */
    }
    h4 {
      margin: 2.75rem 1.25rem 0 0;
    }
  }
  @media only screen and (max-width: ${breakPoint.SmTablet}px) {
    h3,
    h4 {
      top: 2.5%;
      font-size: 10px;
    }
    h3 {
      margin: 1rem 1rem 0 0;
    }
    h4 {
      margin: 2.25rem 1rem 0 0;
    }
  }
  @media only screen and (max-width: ${breakPoint.SmPhone}px) {
    h3,
    h4 {
      top: 2.5%;
      font-size: 8px;
    }
    h4 {
      margin: 2.5rem 1rem 0 0;
    }
  }
`;
export const ProfileWrapper = styled.div`
  .changeAvatar {
    display: flex;
    &--btn {
      display: flex;
      flex-direction: column;
      margin-left: 25px;
      margin-top: 15px;
      font-size: 12px !important;
      input {
        display: none;
      }
    }
    @media screen and (max-width: 380px) {
      &--btn {
        margin-left: 15px;
      }
    }
  }
  .formUser {
    margin-top: 20px;
  }
`;
export const Label = styled.label`
  font-size: 13px;
  color: ${FaPalette("text", 1)};
  line-height: 1.5;
  font-weight: 500;
  padding: 0;
  span {
    display: inline-block;
    padding-bottom: 0.5rem;
  }
`;
export const Div = styled(Row)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  .formItem {
    width: 100%;
  }
`;
export const ContentWrapper = styled.div`
  padding: 30px 0;
`;

export default ProfileWrapper;
