import { breakPoint } from "@app/assets/styles/breakPoints";
import { Button, Form } from "antd";
import { FaLock, FaUser } from "react-icons/fa";
import styled from "styled-components";
import A from '@app/assets/images/signin/p1.jpg'
import B from '@app/assets/images/signin/p2.jpg'
import C from "@app/assets/images/signin/p4.jpg"
import D from "@app/assets/images/signin/p3.jpg"

const PasswordIcon = styled(FaLock)`
  color: white;
  width: 10px;
  height: 11.43px;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    width: 7px;
    height: 8.43px;
  }
`;
const EmailIcon = styled(FaUser)`
  color: white;
  width: 10px;
  height: 11.43px;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    width: 7px;
    height: 8.43px;
  }
`;
const MainParent = styled.main`
  width: 100vw;
  height: 100%;
  
  margin: 0 auto;
  overflow: hidden;
  //padding-bottom: 4.5rem;
  background-color: #EFEFEF;
  section {
    width: 100%;
    .signin {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
     // flex-direction: column;
      flex-wrap: wrap;
      .logo {
        @media only screen and (max-width: ${breakPoint.SmTablet}px) {
          display: none;
        }
        &-child {
          width: 157px;
          object-fit: contain;
          height: 52px;
          margin: 1.5rem 0;
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            width: 6.5rem;
            height: 4rem;
            margin: 0;
          }
        }
      }
      &__copyright {
        display: flex;
        height: 52px;
        margin: 1rem 0;
        @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          margin: 0.75rem 0;
        }
        @media only screen and (max-width: ${breakPoint.SmTablet}px) {
          display: none;
        }
        width: 100%
        justify-content: space-between;
        align-items: center;
        &__struck {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          &-icon {
            width: 50px;
            object-fit: contain;
            height: 56.1px;
            padding-bottom: 0.15rem;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              width: 35px;
              height: 41.1px;
              padding-bottom: 0rem;
            }
          }
        }
        &-center {
          display: flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          &-icon {
            width: 1rem;
            font-size: 0.75rem;
          //  height: 2.5rem;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
                margin-top: 0.5rem;
            }
          }
        }
        h3 {
          color: #2d2d2c;
          font-size: 14px;
          margin-left: 0.25rem;
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              font-size: 11px;
              margin-top: 0.5rem;
          }
        }
      }
      &__background {
        position: relative;
        // border-radius: 1rem;
        width: 100vw;
        height: 100vh;
        overflow: hidden;

        .span-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;   
          color: transparent;
          background-size: cover;
          background-position: 0 0;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 0.5s, transform 6s;
          z-index: 0;
          -webkit-backface-visibility: hidden;   

          &.active {
            opacity: 1;
            transform: scale(1.06);
          }          

          &.move-right {
            background-size: cover;
            min-width: 106vw;
            min-height: 106vh;
            background-position : -40px 0;
            transition: opacity 0.5s, background-position 6s;
            &.active {
              transform: none;
              background-position : 0 0;
            }
          }         

          &:nth-child(1) {            
            background-image: url(${A});    
            background-position: center;        
          }
          &:nth-child(2) {
            background-image: url(${B});   
            background-position: center;        
          }
          &:nth-child(3) {
            background-image: url(${C}); 
            background-position: center;               
          }
          &:nth-child(4) {
            background-image: url(${D}); 
            background-position: center;         
          }
        }

        
        &__img {
          display:none;
        }
        @media only screen and (max-width: ${breakPoint.MDPhone}px) {
          &__img {
            display:block;
            object-fit:cover;
            width: 100%;
            height: 100%;
            
      //      min-height: 1334px;
          }
        }
        /* @media only screen and (max-width: ${breakPoint.LDPhone}px) {
          display:flex;
          justify-content: center;
          align-items: center;
        } */
        @keyframes scale {
          100% {
            transform: scale(1);
          }
        }
        @keyframes fade-in {
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }
        .signin__signature {
          transform: scale(0.94) ;
          opacity: 0;
          filter: blur(4px);
          animation: fade-in .5s .5s forwards cubic-bezier(0.11, 0, 0.5, 0),scale 3s forwards cubic-bezier(0.5, 1, 0.89, 1);
          position: absolute;
          color: #ffffff;
          left: 284px;
          top: 24%;
          text-transform: uppercase;
          font-size: 71px;
          line-height: 75px;
          text-align: left;
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            font-size: 44px;
            line-height: 54px;
            left: 158px;
          }
          @media only screen and (max-width: ${breakPoint.MDesktop}px) {
            top: 30%;
          }
          @media only screen and (max-width: ${breakPoint.SDesktop}px) {
            left: 40px;
            font-size: 34px;
            line-height: 44px;
            top: 34%;
          }
          @media only screen and (max-width: ${breakPoint.MTablet}px) {
            display: none
          }
          span {
            display: block;
            text-shadow: 0px 3px 5px rgba(0,0,0,0.82);
           
          }
          span:nth-child(2), span:nth-child(4) {
            font-weight: bold;
          }
          span:nth-child(2) {
            font-size: 117px;
            line-height: 128px;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              font-size: 108px;
              line-height: 115px;
            }
            @media only screen and (max-width: ${breakPoint.LDesktop}px) {
              font-size: 80px;
              line-height: 90px;
            }
            @media only screen and (max-width: ${breakPoint.MDesktop}px) {
              font-size: 80px;
              line-height: 80px;
            }
            @media only screen and (max-width: ${breakPoint.SDesktop}px) {
              font-size: 80px;
              line-height: 90px;
            }
          }

          span:nth-child(4) {
            font-size: 117px;
            line-height: 128px;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              font-size: 108px;
              line-height: 115px;
            }
            @media only screen and (max-width: ${breakPoint.LDesktop}px) {
              font-size: 70px;
              line-height: 80px;
            }
            @media only screen and (max-width: ${breakPoint.MDesktop}px) {
              font-size: 80px;
              line-height: 90px;
            }
            @media only screen and (max-width: ${breakPoint.SDesktop}px) {
              font-size: 80px;
              line-height: 90px;
            }
          }
          // span:nth-child(3) {
          //   font-size: 121px;
          //   line-height: 128px;
          //   @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          //     font-size: 80px;
          //     line-height: 90px;
          //   }
          //   @media only screen and (max-width: ${breakPoint.SDesktop}px) {
          //     font-size: 70px;
          //     line-height: 80px;
          //   }
          // }
          
        }
        h1 {
          transform: scale(0.94);
          opacity: 0;
          filter: blur(4px);
          animation: fade-in .5s .5s forwards cubic-bezier(0.11, 0, 0.5, 0),scale 3s forwards cubic-bezier(0.5, 1, 0.89, 1);
          position: absolute;
          color: white;
          font-weight: bold;
          left: 0;
          bottom: 0;
          font-size: 45px;
          margin: 0 0 1rem 3.5rem;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              margin: 0 0 0.75rem 2rem;
            font-size: 45px;
          }
          @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
              margin: 0 0 0.5rem 2rem;
            font-size: 45px;
          }
          @media only screen and (max-width: ${breakPoint.SmTablet}px) {
          bottom: 13.5%;
          font-size: 35px;
          display:none;
          }
          @media only screen and (max-width: ${breakPoint.MDPhone}px) {
          display: none;
          }
        }
        &-copyright {
          display:none;
          @media only screen and (max-width: ${breakPoint.SmTablet}px) {
            position: absolute;
            margin-bottom: 2rem;
            display:flex;
            justify-content:center;
            align-items:center;
            bottom: 0;
            left: 0;
            text-align:center;
            width: 100%;
            color: white;
            &__title {
              margin-left: 0.25rem;
              color: white;
              font-size: 10px;
              span {
                font-weight: 600;
              }
            }
            &__icon {
              font-size: 0.5rem;
            }
          }
         
        }
      }      
    }
  }
  @keyframes backgroundChange {
    33% {      
      background-image: url(${A});
       -webkit-transform: scale(1.15);
            transform: scale(1.15);
        
           // transition: transform 1s ease-in-out;
    }
    66% {     
     background-image: url(${B});
      -webkit-transform: scale(1.25);
           transform: scale(1.25);
       
         //  transition: transform 1s ease-in-out;
   }
    100% {
     
      background-image: url(${C});
       -webkit-transform: scale(1.1);
            transform: scale(1.1);
        
     //       transition: transform 1s ease-in-out;
    }
  }
  @keyframes imageAnimationMoveRight { 
    0% {
        opacity: 0;
        background-position : 0 0;
        animation-timing-function: ease-in;
    }
    10% {
        opacity: 1;
        background-position : -20px 0;
        animation-timing-function: ease-out;
    }
    20% {
        opacity: 1;
        background-position : -40px 0;
    }
    25% {
        background-position : -40px 0;
    }
    100% { opacity: 0 }
  }

  @keyframes imageAnimationZoomIn { 
    0% {
        opacity: 0;
        animation-timing-function: ease-in;
    }
    10% {
      opacity: 1;
    }
    20% {
        transform: scale(1.05);
        animation-timing-function: ease-out;
    }
    40% {
        opacity: 1;
        transform: scale(1.1);
    }
    60% {
        transform: scale(1.1);
    }
    100% { opacity: 0 }
  }
`;
const WrapperForm = styled(Form)`
  display: flex;
  justify-content: end;
  height: 100%;
  min-height: -moz-available; /* WebKit-based browsers will ignore this. */
  min-height: -webkit-fill-available; /* Mozilla-based browsers will ignore this. */
  min-height: fill-available;
  width: 100vw;
  font-size: 12px !important;
  align-items: center;
  -webkit-box-sizing:border-box;
  @media only screen and (max-width: ${breakPoint.SmTablet}px) {
    justify-content: center;
  }
`;
const SubmitButton = styled(Button)`
  display: flex;
  margin: 1.25rem 0 2.2rem 0;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    // margin: 0.75rem 0 2rem 0;
    // padding: 0 0.25rem;
  }
  border-radius: 0.25rem;
  background-color: #397d36;
  justify-content: center;
  align-items: center;
  color: white;
  border: none;
  font-size: 12px;
  cursor: pointer;
  height: 35.28px;
  width: 100%;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    height: 25.28px;
    font-size: 10px;
  }
`;
// const TableWrapper = styled(Table)`
const FormDiv = styled.div`
  display: flex;
  overflow: hidden;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  top: 0;
  right: 0;
  margin-right: 209px !important;
  // height: 465.81px !important;
  // position: absolute !important;
  z-index: 999;
  width: 435px !important;
  @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
    margin-right: 160px !important;
    width: 425px !important;
    height: auto !important;
  }
  @media only screen and (max-width: ${breakPoint.SDesktop}px) {
    margin-right: 60px !important;
  }
  @media only screen and (max-width: ${breakPoint.SmTablet}px) {
    margin-right: 40px !important;
    margin-right: 0 !important;
    /* width: 354px;
    height: 355.81px; */
  }
  @media only screen and (max-width: ${breakPoint.LDPhone}px) {
    width: 375px !important;
  } 
  @media only screen and (max-width: ${breakPoint.SmPhone}px) {
    width: 340px !important;
  } 
  @media only screen and (max-width: ${breakPoint.TinyPhone}px) {
    width: 300px !important;
  } 
  border-radius: 1rem;
  background: linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65));
  .forgot {
    width: 100% !important;;
    padding: 2.25rem 0 !important;;
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      // font-size: 9px;
      // padding-top: 0.75rem !important;;
    }
    border-top: 1px dotted #6d7f86 !important;;
    font-size: 12px !important;;
    text-align: center !important;;
    cursor: pointer !important;;
    color: white !important;;
  }
  .wrapperForm {
    padding: 0 36px;
    @media only screen and (max-width: ${breakPoint.SmTablet}px) {
      padding: 0 35px;
    }
    @media only screen and (max-width: ${breakPoint.LDPhone}px) {
      padding: 0 30px;
    } 
    @media only screen and (max-width: ${breakPoint.SmPhone}px) {
      padding: 0 20px;
    } 
  }
  .save {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
    .checkbox {
      transform: scale(0.75);
    }
    &__child {
      color: white;

      margin-left: 0.5rem;
      font-size: 12px;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        // font-size: 9px;
        margin-left: 0.25rem;
      }
    }
  }
  .email__password {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    width: 100%;
    padding-bottom: 10px;
    &__child {
      width: 100%;
      margin: 0.5rem 0 1.25rem 0;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        margin: 0.4rem 0 0.65rem 0;
      }
      border-bottom: 1px solid #727777;
      input {
        outline: none;
        border: none;
        color: #ffffff;
        font-size: 12px;
        padding: 5px 5px 5px 8px;
        @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          font-size: 11px;
        }
        background-color: transparent;
        width: 100%;
      }
    }
    span {
      color: white;
      font-size: 15px;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        font-size: 11px;
      }
      font-weight: 600;
      margin-top: 0;
      margin-left: 0.4rem;
    }
  }
  .email {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    width: 100%;
    padding-bottom: 10px;
    &__child {
      width: 100%;
      margin: 0.5rem 0 1.25rem 0;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        margin: 0.4rem 0 1.75rem 0;
      }
      border-bottom: 1px solid #727777;
      input {
        outline: none;
        border: none;
        color: #ffffff;
        font-size: 12px;
        padding: 5px 5px 5px 8px;
        @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          font-size: 11px;
        }
        background-color: transparent;
        width: 100%;
      }
    }
    span {
      color: white;
      font-size: 15px;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        font-size: 11px;
      }
      font-weight: 600;
      margin-top: 0;
      margin-left: 0.4rem;
    }
  }
  div {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
  }
  .header {
    font-size: 40px;
    height: 42px;
    color: #397d36;
    font-weight: bold;
    padding: 45px 0 40px 0;
    display: flex;
    justify-content: space-between;
    width: -webkit-fill-available;
    span {
      color: rgba(0, 0, 0, 0.1);
      padding-left: 14px;
      // text-stroke: 1px #397d36;
      -webkit-text-stroke: 1px #397d36;
      font-family: Arial, Helvetica, sans-serif !important;
    }
    @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      height: 37px;
      font-size: 37px;
    }
    @media only screen and (max-width: ${breakPoint.SDesktop}px) {
      padding: 40px 0 50px 0;
    }
    @media only screen and (max-width: ${breakPoint.LDPhone}px) {
      height: 31px;
      font-size: 31px;

    }
    @media only screen and (max-width: ${breakPoint.SMPhone}px) {
      height: 33px;
      font-size: 33px;
      padding: 20px 0 30px 0;
    }
    @media only screen and (max-width: ${breakPoint.TinyPhone}px) {
      height: 27px;
      font-size: 27px;
      padding: 20px 0 30px 0;
    }
  }
  .endOfForm {
    color: #fff;
    text-align: center;
    width: 100%;
    margin-bottom: 35px;
  }
  .title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.2);
    padding: 12px 36px;
    &__img {
      width: 100%;
      height: 38px;
      display: block;
      // @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
      //   width: 25px;
      //   height: 25px;
      // }
      object-fit: contain;
    }
    span {
      font-size: 28px;
      line-height: 28px;
      color: #fff;
      text-transform: uppercase;
      font-weight: 600;
      
    }
    h2 {
      color: #397d36;
      margin-top: 0.25rem;
      margin-bottom: 1rem;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        margin-bottom: 0.5rem;
      }
      font-weight: bold;
      font-size: 22px;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        font-size: 16px;
      }
    }
  }
`;
export { MainParent, EmailIcon, PasswordIcon, FormDiv, SubmitButton, WrapperForm };

