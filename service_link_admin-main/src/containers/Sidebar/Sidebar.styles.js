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
    background:
      radial-gradient(120% 55% at 0% 0%, rgba(120, 220, 80, 0.28) 0%, transparent 55%),
      linear-gradient(165deg, #06452b 0%, #00351f 48%, #002b1b 100%);
    width: 250px;
    flex: 0 0 250px;
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

      button.mobile-sidebar-close,
      .mobile-sidebar-close {
        flex: 0 0 auto;
        margin-left: auto;
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        min-height: 44px !important;
        border-radius: 50% !important;
        border: 1px solid #e5e7eb !important;
        background: #ffffff !important;
        color: #111111 !important;
        font-size: 18px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35) !important;
        padding: 0 !important;
      }

      .mobile-sidebar-close .anticon {
        color: #111111 !important;
      }

      html[data-color-mode='dark'] & button.mobile-sidebar-close,
      html[data-color-mode='dark'] & .mobile-sidebar-close,
      body.app-shell-dark & button.mobile-sidebar-close {
        background: rgba(0, 0, 0, 0.45) !important;
        border: 2px solid rgba(255, 255, 255, 0.85) !important;
        color: #ffffff !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
      }

      html[data-color-mode='dark'] & .mobile-sidebar-close .anticon,
      body.app-shell-dark & .mobile-sidebar-close .anticon {
        color: #ffffff !important;
      }
    }

    /* Colored groups — match /nav-mock */
    .isoNavGroup {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .isoNavGroup-bar {
      width: 3px;
      height: 14px;
      border-radius: 2px;
      background: var(--g, #7CFFB2);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--g, #7CFFB2) 28%, transparent);
      flex-shrink: 0;
    }

    .isoNavGroup-title {
      flex: 1;
      min-width: 0;
      font-size: 10px !important;
      font-weight: 800 !important;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--g, #7CFFB2) !important;
      line-height: 1.2;
    }

    .ant-menu-dark .isoNavGroup-submenu > .ant-menu-submenu-title {
      height: auto !important;
      line-height: 1.2 !important;
      margin: 2px 8px 0 !important;
      padding: 7px 8px !important;
      border-radius: 8px !important;
      background: transparent !important;
    }

    .ant-menu-dark .isoNavGroup-submenu > .ant-menu-submenu-title:hover {
      background: rgba(255, 255, 255, 0.08) !important;
    }

    .ant-menu-dark .isoNavGroup-submenu.ant-menu-submenu-open > .ant-menu-submenu-title {
      background: color-mix(in srgb, var(--g, #7CFFB2) 14%, transparent) !important;
    }

    .ant-menu-dark .isoNavGroup-submenu > .ant-menu-submenu-title .ant-menu-submenu-arrow {
      color: rgba(255, 255, 255, 0.65) !important;
    }

    /*
      Match /nav-mock for EVERY group:
      - Level 1 under a group (Messages, Tickets, Tasks, Templates, …) = same indent
      - Level 2 (Pending, Asset register, Admins, …) = one step deeper
    */
    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub {
      background: transparent !important;
    }

    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-item,
    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu {
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-item,
    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu > .ant-menu-submenu-title {
      padding-left: 28px !important;
      padding-right: 36px !important;
      height: 36px !important;
      line-height: 36px !important;
      margin: 0 !important;
      background: transparent !important;
    }

    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu > .ant-menu-sub {
      background: transparent !important;
    }

    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu > .ant-menu-sub > .ant-menu-item,
    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu > .ant-menu-sub > .ant-menu-submenu {
      padding-left: 0 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > .ant-menu-submenu > .ant-menu-sub > .ant-menu-item,
    .isomorphicSidebar
      .isoNavGroup-submenu
      > .ant-menu-sub
      > .ant-menu-submenu
      > .ant-menu-sub
      > .ant-menu-submenu
      > .ant-menu-submenu-title {
      padding-left: 44px !important;
      padding-right: 36px !important;
      height: 34px !important;
      line-height: 34px !important;
    }

    /* Beat legacy 40px li padding inside every colored group */
    .isomorphicSidebar.ant-layout-sider .isoNavGroup-submenu > .ant-menu-sub > li,
    .isomorphicSidebar .isoNavGroup-submenu > .ant-menu-sub > li {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .isoMenuHolder--child {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .isoMenuHolder--child .anticon,
    .isoMenuHolder--child svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
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
      width: 250px !important;
      flex: 0 0 250px !important;

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
      padding: 1.5rem 1rem 0.75rem;
      @media only screen and (max-width: ${breakPoint.XLDesktop}px) {
        padding: 1.15rem 0.85rem 0.55rem;
      }
      align-items: center;
      flex-direction: column;
      background-color: transparent;
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
