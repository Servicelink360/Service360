import styled from "styled-components";
import { palette } from "styled-theme";
import { transition, borderRadius } from "@app/lib/helpers/style_utils";
import WithDirection from "@app/lib/helpers/rtl";
import { breakPoint } from "@app/assets/styles/breakPoints";
const SidebarWrapper = styled.div`
  @media only screen and (max-width: 768px) and (orientation: portrait) {
    width: 0;
    flex: 0 0 0;
    overflow: visible;
    position: static;
  }

  .isomorphicSidebar {
    position: relative;
    z-index: 1000;
    background: #397d36;
    width: 280px;
    flex: 0 0 280px;
    height: 100%;
    max-height: 936px;
    overflow: hidden;

    &.isomorphicSidebar--drawer {
      width: 100%;
      flex: none;
      max-height: none;
      height: 100%;
      min-height: 100%;

      .mobile-sidebar-header {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        background: #397d36;
        padding: 10px 12px 10px 10px;
      }

      .mobile-sidebar-header__brand .logo {
        width: auto !important;
        flex-direction: row !important;
        background: transparent !important;
        padding: 0 !important;
      }

      .mobile-sidebar-header__brand .logo__main {
        width: 68px !important;
        max-width: 68px !important;
        max-height: 42px !important;
      }

      .mobile-sidebar-close {
        flex: 0 0 auto;
        margin-left: auto;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 50%;
        border: none;
        background: #fff;
        color: #333;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }

    /* Override ant-menu-dark defaults (navy #001529, blue #1890ff) — green only */
    .ant-menu-dark,
    .ant-menu-dark .ant-menu {
      background: #397d36 !important;
      color: #f0f0f0;
    }

    .ant-menu-dark .ant-menu-item,
    .ant-menu-dark .ant-menu-submenu-title {
      background-color: #397d36 !important;
      color: #f0f0f0 !important;
    }

    .ant-menu-dark .ant-menu-item-selected {
      background-color: #85c179 !important;
      color: #f0f0f0 !important;
    }

    .ant-menu-dark .ant-menu-submenu-open > .ant-menu-submenu-title,
    .ant-menu-dark .ant-menu-submenu-selected > .ant-menu-submenu-title,
    .ant-menu-dark .ant-menu-submenu-active > .ant-menu-submenu-title {
      background-color: #397d36 !important;
      color: #f0f0f0 !important;
    }

    .ant-menu-dark .ant-menu-item:hover,
    .ant-menu-dark .ant-menu-submenu-title:hover {
      background-color: #85c179 !important;
      color: #f0f0f0 !important;
    }

    .ant-menu-dark .ant-menu-inline.ant-menu-sub,
    .ant-menu-dark .ant-menu-sub {
      background: #397d36 !important;
    }

    .ant-menu-dark .ant-menu-sub .ant-menu-item {
      background-color: #397d36 !important;
      color: #f0f0f0 !important;
    }

    .ant-menu-dark .ant-menu-sub .ant-menu-item-selected {
      background-color: #85c179 !important;
      color: #f0f0f0 !important;
    }
    @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
      overflow: auto;
    }
    @media only screen and (max-width: ${breakPoint.SmTablet}px) {
      overflow: hidden;
      }
    .scrollarea {
      height: calc(100vh - 70px);
    }

    @media only screen and (max-width: 767px) {
      width: 240px !important;
      flex: 0 0 240px !important;

      &.isomorphicSidebar--drawer {
        width: 100% !important;
        flex: none !important;
      }
    }

    &.ant-layout-sider-collapsed {
      @media only screen and (max-width: 767px) {
        width: 0;
        min-width: 0 !important;
        max-width: 0 !important;
        flex: 0 0 0 !important;
      }
    }
    
    .bottom {
      display: flex;
      position: absolute;
      bottom: 15%;
      z-index: 10;
      @media only screen and (max-width: ${breakPoint.SmDesktop}px) {
        bottom: -5%;
      }
      @media only screen and (max-width: ${breakPoint.SmTablet}px) {
        display:none;
      }
      left: 0;
      justify-content: center;
      align-items: center;
      width: 100%;
      img {
        z-index: 2;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 55px;
        margin-top: 1rem;
        max-width: 4vw;
        @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          margin-top: 2rem;
        }
        height: 64px;
        object-fit: contain;
      }
    }
    .logo {
      width: 100%;
      display: flex;
      padding: 0.75rem 1rem;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        padding: 0.65rem 0.85rem;
      }
      align-items: center;
      flex-direction: column;
      background-color: #ffffff;
      justify-content: center;
      &__icon {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 100%;
        margin-top: 0.75rem;
        margin-bottom: 2rem;
        border-radius: 0.25rem;
        border: 1px solid #475866;
        padding: 0.5rem 0.75rem;
        @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
          padding: 0.65rem 18px;
          margin-top: 0.5rem;
        }
        
        &__child {
          cursor: pointer;
          font-size: 1rem;
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            font-size: 0.75rem;
          }
          &:hover{
                color: #f0f0f0 !important;
              }
        }
      }
      &__main {
        width: 100%;
        max-width: 200px;
        height: auto;
        max-height: 88px;
        display: block;
        margin: 0 auto;
        object-fit: contain;
      }
      &__information {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        &__avatar {
          img {
            width: 40px;
            height: 40px;
            @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
              width: 40px;
              height: 40px;
              margin-right: 0.75rem;
            }
            object-fit: cover;
            margin-right: 1rem;
            //      border: 1.5px solid #D0D4D7;
            border-radius: 50%;
          }
        }
        &-r {
          display: flex;
          cursor: pointer;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-top: 0.25rem;
          line-height: 1rem;
          flex-direction: column;
          h4,
          h3 {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            text-transform: capitalize;
            max-width: 100%;
            color: #d0d4d7;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
          }
          h3 {
            font-size: 18px;
          }
          h4 {
            font-size: 12px;
          }
          @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
            h3 {
              font-size: 14px;
            }
            h4 {
              margin-top : 0.35rem;
              font-size: 12px;
            }
          }
        }
      }
    }
    .mainNav {
      div:first-child {
        overflow: overlay !important
      }
    }
    .isoLogoWrapper {
      height: 2.5rem;
      background: #01152b;
      padding: 0 10px;
      text-align: center;
      overflow: hidden;
      ${borderRadius()};
      h3 {
        a {
          font-size: 21px;
          font-weight: 300;
          line-height: 70px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: ${palette("grayscale", 6)};
          display: block;
          text-decoration: none;
        }
      }
    }

    &.ant-layout-sider-collapsed {
      .isoLogoWrapper {
        padding: 0;

        h3 {
          a {
            font-size: 27px;
            font-weight: 500;
            letter-spacing: 0;
          }
        }
      }
    }
    .ant-menu-item-selected > span > a{
      color: #f0f0f0 !important;
    }
    .isoDashboardMenu {
      /* padding-top: 35px; */
      padding-bottom: 35px;
      ${'' /* background: #001529; */}
      position: relative;
      height: 100%;
      max-height: 35rem;
      background: transparent;

      .ant-menu-submenu-open {
        background-color: #397d36;
      }
      @media only screen and (max-width: ${breakPoint.LDesktop}px) {
        max-height: 22.5rem;
      }
      @media only screen and (max-width: ${breakPoint.MDesktop}px) {
        max-height: 35rem;
      }
      overflow: unset;
      z-index: 12;
      a {
        text-decoration: none;
        font-weight: 500;
        color: #dbd5d5;
      }

      .ant-menu-item {
        width: 100%;
        display: -ms-flexbox;
        display: flex;
        -ms-flex-align: center;
        align-items: center;
        background: #397d36;
        padding-left: 1rem!important;
        /* padding: 0 24px; */
        margin: 0;
      }

      .isoMenuHolder {
        display: flex;
        align-items: center;
        i {
          font-size: 19px;
          color: white;
          margin: ${(props) =>
    props["data-rtl"] === "rtl" ? "0 0 0 30px" : "0 10px 0 0"};
          width: 18px;
          padding-right: 0!important;
          ${transition()};
        }
      }

      .anticon {
        font-size: 18px;
        margin-right: 10px;
        color: white;
        ${transition()};
      }

      .nav-text {
        font-size: 14px;
        color: white;
        font-weight: 500;
        margin-left : 5px;
        ${transition()};
      }
      .ant-menu-submenu-open > .ant-menu-submenu-title,
      .ant-menu-submenu-selected > .ant-menu-submenu-title,
      .ant-menu-submenu-active > .ant-menu-submenu-title {
        background-color: #397d36 !important;
      }
      .ant-menu-item:hover,
      .ant-menu-submenu-title:hover {
        background-color: #85c179 !important;
      }
      .ant-menu-item-selected {
        background-color: #85c179 !important;
        .anticon {
          color: #397d36;
        }

        i {
          color: #f0f0f0;
        }

        .nav-text {
          color: #f0f0f0;
        }
      }

      > li {
        &:hover {
          i,
          .anticon,
          .nav-text {
            color: #f0f0f0;
          }
        }
      }
    }

    .ant-menu-dark .ant-menu-inline.ant-menu-sub {
      background: #397d36 !important;
    }

    .ant-menu-dark .ant-menu-submenu-selected {
      background-color: #397d36 !important;
    }

    .ant-menu-submenu-inline {
      padding: 0;
      background: #397d36;
    }

    .ant-menu-submenu-inline,
    .ant-menu-submenu-vertical {
      > .ant-menu-submenu-title {        
        width: 100%;
        display: flex;
        align-items: center;
        margin: 0;
        padding-left: 1rem!important;
        height: auto;

        > span {
          display: flex;
          align-items: center;
        }

        .ant-menu-submenu-arrow {
          left: ${(props) => (props["data-rtl"] === "rtl" ? "25px" : "auto")};
          right: ${(props) => (props["data-rtl"] === "rtl" ? "auto" : "25px")};

          &:before,
          &:after {
            width: 8px;
            ${transition()};
          }

          &:before {
            transform: rotate(-45deg) translateX(3px);
          }

          &:after {
            transform: rotate(45deg) translateX(-3px);
          }

          ${"" /* &:after {
            content: '\f123';
            font-family: 'Ionicons' !important;
            font-size: 16px;
            color: inherit;
            left: ${props => (props['data-rtl'] === 'rtl' ? '16px' : 'auto')};
            right: ${props => (props['data-rtl'] === 'rtl' ? 'auto' : '16px')};
            ${transition()};
          } */
          }
        }

        &:hover {
          .ant-menu-submenu-arrow {
            &:before,
            &:after {
              color: #ffffff;
            }
          }
        }
      }

      .ant-menu-inline,
      .ant-menu-submenu-vertical {
        > li:not(.ant-menu-item-group) {
          padding-left: ${(props) =>
    props["data-rtl"] === "rtl" ? "0px !important" : "40px !important"};
          padding-right: ${(props) =>
    props["data-rtl"] === "rtl" ? "74px !important" : "0px !important"};
          font-size: 13px;
          font-weight: 400;
          margin: 0;
          color: inherit;
          ${transition()};

          &:hover {
            a {
              color: #f0f0f0 !important;
            }
          }
          // .ant-menu-item-selected{
          //   a {
          //     color: #f0f0f0 !important;
          //   }
          // }
        }

        .ant-menu-item-group {
          padding-left: 0;

          .ant-menu-item-group-title {
            padding-left: 100px !important;
          }
          .ant-menu-item-group-list {
            .ant-menu-item {
              padding-left: 125px !important;
            }
          }
        }
      }

      .ant-menu-sub {
        box-shadow: none;
        background-color: #397d36 !important;
        a {
          font-size: 13px;
        }
        .ant-menu-item {
          background-color: #397d36 !important;
        }
        .ant-menu-item-selected {
          background-color: #85c179 !important;
        }
      }
    }

    &.ant-layout-sider-collapsed {
      .nav-text {
        display: none;
      }

      .ant-menu-submenu-inline > {
        .ant-menu-submenu-title:after {
          display: none;
        }
      }

      .ant-menu-submenu-vertical {
        > .ant-menu-submenu-title:after {
          display: none;
        }

        .ant-menu-sub {
          background-color: #85c179 !important;

          .ant-menu-item {
            height: 35px;
          }
        }
      }
    }
  }
`;

export default WithDirection(SidebarWrapper);
