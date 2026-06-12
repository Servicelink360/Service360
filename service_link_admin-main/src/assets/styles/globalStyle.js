import { createGlobalStyle } from "styled-components";
import { palette, font } from "styled-theme";
// import 'antd/dist/antd.css';
import { breakPoint } from "@app/assets/styles/breakPoints";
const GlobalStyles = createGlobalStyle`
// @font-face {  
//   font-family: 'DXIcons';  
//   src: url(icons/dxicons.woff) format('woff'), url(icons/dxicons.ttf) format('truetype');  
//   font-weight: normal;  
//   font-style: normal; 
// }  
.ck-editor__editable {
  min-height: 100px;
}
.ant-input-number-input{
  text-align: right !important;
  padding: 0 30px !important;
}
textarea.ant-input{
  border: 1px solid #d9d9d9 !important;
}
 .ant-btn{
    border-radius: 5px;
  
  }
  .h-inputForm {
    max-width: 243px !important;
    width: 100%;
    @media only screen and (max-width: ${breakPoint.LDesktop}px) {
      max-width: 100% !important;
    }
  }
  body{
    // overflow-y: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
 .ant-table {
    font-size: 12px;
    max-width: 100%;
    overflow-x: auto;
}
  .logo {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }

  .ant-table-thead > tr.ant-table-row-hover:not(.ant-table-expanded-row) > td, .ant-table-tbody > tr.ant-table-row-hover:not(.ant-table-expanded-row) > td, .ant-table-thead > tr:hover:not(.ant-table-expanded-row) > td, .ant-table-tbody > tr:hover:not(.ant-table-expanded-row) > td {
    background: #f8f8f8!important;
  }

  .ant-row.ant-form-item {
    margin-bottom: 5px;
  }

  .has-success.has-feedback {
    .ant-select {
      .ant-select-selection {
        .ant-select-selection__rendered {
          .ant-select-selection__placeholder {
            display: none !important;
          }
        }
      }
    }
  }

  /*-----------------------------------------------*/
  // style for project category menu [ScrumBoard]
  /*-----------------------------------------------*/
  .project-category {
    .ant-select-dropdown-menu {
      .ant-select-dropdown-menu-item {
        padding: 8px 12px;
        color: #000000;
        font-family: 'Montserrat','Roboto';
        font-weight: 400;
      }
    }
  }

  /*-----------------------------------------------*/
  // style for project menu [ScrumBoard]
  /*-----------------------------------------------*/
  .ant-dropdown {
    &.project-menu {
      width: 280px;
      top: 133px !important;

      .ant-dropdown-menu {
        padding: 0;
        overflow: hidden;

        .ant-dropdown-menu-item {
          min-height: 54px;
          line-height: auto;
          display: flex;
          align-items: center;
          padding: 10px 20px;

          &:first-child {
            padding: 0;
            border-bottom: 1px solid #f4f6fd;

            &:hover,
            &:focus {
              background-color: #ffffff;
            }
          }

          &:hover,
          &:focus {
            background-color: #F3F5FD;
          }

          &:last-child {
            background-color: #E6EAF8;
          }
        }
      }
    }
  }

  /*-----------------------------------------------*/
  // style for popover [ScrumBoard]
  /*-----------------------------------------------*/
  .ant-popover {
    .ant-checkbox-group {
      display: flex;
      flex-direction: column;
      .ant-checkbox-group-item {
        margin: 5px 0;
        span {
          font-size: 14px;
          color: #788195;
          text-transform: capitalize;
        }
      }
    }
  }

  /*-----------------------------------------------*/
  // style for modal [ScrumBoard]
  /*-----------------------------------------------*/
  .ant-modal-wrap {
    .ant-modal {
      .ant-modal-content {
        .ant-modal-body {
          .render-form-wrapper {
            padding: 10px;
            h2 {
              margin: 0;
            }
            form {
              padding: 15px 0 3px;
              .field-container {
                margin-bottom: 26px;
              }
            }
          }
        }
      }
    }
  }


/*-----------------------------------------------*/
  // style form previous GlobalStyles
  /*-----------------------------------------------*/

  .ant-table-thead > tr.ant-table-row-hover:not(.ant-table-expanded-row) > td, .ant-table-tbody > tr.ant-table-row-hover:not(.ant-table-expanded-row) > td, .ant-table-thead > tr:hover:not(.ant-table-expanded-row) > td, .ant-table-tbody > tr:hover:not(.ant-table-expanded-row) > td {
    background: #f8f8f8!important;
}

font-family: ${font("primary", 0)};

h1,
h2,
h3,
h4,
h5,
h6,
a,
p,
li,
input,
textarea,
span,
div,
img,
svg {
  &::selection {
    background: ${palette("primary", 0)};
    color: #fff;
  }
}

.ant-row:not(.ant-form-item) {
  ${"" /* margin-left: -8px;
  margin-right: -8px; */
  };
  &:before,
  &:after {
    display: none;
  }
}

.ant-row > div {
  padding: 0;
}

.isoLeftRightComponent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.isoCenterComponent {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
/********** Add Your Global CSS Here **********/

body {
  -webkit-overflow-scrolling: touch;
}

html h1,
html h2,
html h3,
html h4,
html h5,
html h6,
html a,
html p,
html li,
input,
textarea,
span,
div,
html,
body,
html a {
  margin-bottom: 0;
  font-family: 'Montserrat','Roboto', sans-serif!important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.004);
}

html ul {
  -webkit-padding-start: 0px;
  list-style: none;
  margin-bottom: 0;
}

.scrollbar-track-y,
.scrollbar-thumb-y {
  width: 5px !important;
}

.scrollbar-track-x,
.scrollbar-thumb-x {
  height: 5px !important;
}

.scrollbar-thumb {
  border-radius: 0 !important;
}

.scrollbar-track {
  background: rgba(222, 222, 222, 0.15) !important;
}

.scrollbar-thumb {
  border-radius: 0 !important;
  background: rgba(0, 0, 0, 0.5) !important;
}

.ant-popover-placement-bottom > .ant-popover-content > .ant-popover-arrow:after,
.ant-popover-placement-bottomLeft
  > .ant-popover-content
  > .ant-popover-arrow:after,
.ant-popover-placement-bottomRight
  > .ant-popover-content
  > .ant-popover-arrow:after,
.ant-popover-placement-top > .ant-popover-content > .ant-popover-arrow:after,
.ant-popover-placement-topLeft
  > .ant-popover-content
  > .ant-popover-arrow:after,
.ant-popover-placement-topRight
  > .ant-popover-content
  > .ant-popover-arrow:after {
  left: 0;
  margin-left: -4px;
}

/* Instagram Modal */

.ant-modal-wrap.instagram-modal .ant-modal {
  max-width: 935px;
  width: 100% !important;
}

@media only screen and (max-width: 991px) {
  .ant-modal-wrap.instagram-modal .ant-modal {
    padding: 0 60px;
  }
}

@media only screen and (max-width: 767px) {
  .ant-modal-wrap.instagram-modal .ant-modal {
    max-width: 580px;
  }
  .ant-modal{
    top: 10px;
    width: 100% !important;
  }
}

.ant-modal-wrap.instagram-modal .ant-modal-content {
  border-radius: 0;
}

.ant-modal-wrap.instagram-modal .ant-modal-content button.ant-modal-close {
  position: fixed;
  color: #fff;
}

.ant-modal-wrap.instagram-modal .ant-modal-content button.ant-modal-close i {
  font-size: 24px;
}

.ant-modal-wrap.instagram-modal .ant-modal-content .ant-modal-body {
  padding: 0;
}

/********** Add Your Global RTL CSS Here **********/

/* Popover */

html[dir='rtl'] .ant-popover {
  text-align: right;
}

/* Ecommerce Card */

html[dir='rtl'] .isoCardInfoForm .ant-input {
  text-align: right;
}

/* Modal */

html[dir='rtl'] .has-success.has-feedback:after,
html[dir='rtl'] .has-warning.has-feedback:after,
html[dir='rtl'] .has-error.has-feedback:after,
html[dir='rtl'] .is-validating.has-feedback:after {
  left: 0;
  right: auto;
}

html[dir='rtl'] .ant-modal-close {
  right: inherit;
  left: 0;
}

html[dir='rtl'] .ant-modal-footer {
  text-align: left;
}

html[dir='rtl'] .ant-modal-footer button + button {
  margin-left: 0;
  margin-right: 8px;
}

html[dir='rtl'] .ant-confirm-body .ant-confirm-content {
  margin-right: 42px;
}

html[dir='rtl'] .ant-btn > .anticon + span,
html[dir='rtl'] .ant-btn > span + .anticon {
  margin-right: 0.5em;
}

html[dir='rtl'] .ant-btn-loading span {
  margin-left: 0;
  margin-right: 0.5em;
}

html[dir='rtl']
  .ant-btn.ant-btn-loading:not(.ant-btn-circle):not(.ant-btn-circle-outline) {
  padding-left: 25px;
  padding-right: 29px;
}

html[dir='rtl']
  .ant-btn.ant-btn-loading:not(.ant-btn-circle):not(.ant-btn-circle-outline)
  .anticon {
  margin-right: -14px;
  margin-left: 0;
}

/* Confirm */

html[dir='rtl'] .ant-modal.ant-confirm .ant-confirm-body > .anticon {
  margin-left: 16px;
  margin-right: 0;
  float: right;
}

html[dir='rtl'] .ant-modal.ant-confirm .ant-confirm-btns {
  float: left;
}

html[dir='rtl'] .ant-modal.ant-confirm .ant-confirm-btns button + button {
  margin-right: 10px;
  margin-left: 0;
}

/* Message */

html[dir='rtl'] .ant-message .anticon {
  margin-left: 8px;
  margin-right: 0;
}

/* Pop Confirm */

html[dir='rtl'] .ant-popover-message-title {
  padding-right: 20px;
  padding-left: 0;
}

html[dir='rtl'] .ant-popover-buttons {
  text-align: left;
}

/* Notification */

html[dir='rtl']
  .ant-notification-notice-closable
  .ant-notification-notice-message {
  padding-left: 24px;
  padding-right: 0;
}

html[dir='rtl']
  .ant-notification-notice-with-icon
  .ant-notification-notice-message,
html[dir='rtl']
  .ant-notification-notice-with-icon
  .ant-notification-notice-description {
  margin-right: 48px;
}

html[dir='rtl'] .ant-notification-notice-close {
  right: auto;
  left: 16px;
}

html[dir='rtl'] .ant-notification-notice-with-icon {
  left: 0;
}

.ant-notification-notice-with-icon {
  min-height: 22px;
}

.ant-notification-notice-icon {
  top: 50%;
  transform: translateY(-50%);
}

/* Dropzone */

html[dir='rtl'] .dz-hidden-input {
  display: none;
}
.btn100{
  width: 100%;
}
.center{
  display:flex;
  justify-content: center;
  align-items:center;
}
.ant-form {
  label {
    font-weight: 500;
    &.required:after,
    &.ant-form-item-required:after {
      content: "*";
      display: inline-block;
      margin-left: 5px;
      color: #FF5B58;
    }
  }
}
.ant-form-item-label > label{
  height:100% !important;
}
.ant-row.ant-form-item{
  margin-bottom: 10px;
}
.row__marginTop10 .ant-row.ant-form-item{
  margin-bottom: 0px;
  margin-top: 10px;
}
.ant-form-item-label{
  text-align: left !important;
}
.ant-form-item-label > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before{
  position: absolute !important;
  right: -6px;
  margin-right:0 !important;
}

.ant-picker-input > input,.ant-form label,.ant-input,.ant-select,.ant-upload,.ant-table-column-title,.ant-btn {
  font-size: 12px!important;
}
.ant-input, .ant-picker-middle{
  &.middle{
    height: 32px;
  }
}
.ant-table-thead > tr > th{
  background: #397d36 !important;
  color: #fff !important;
  &:first-child {
    border-top-left-radius: 4px !important;
  }
  &:last-child {
    border-top-right-radius: 4px !important;
  }
}
.ant-table-column-title {
  white-space: nowrap;
}

.isoLayoutContentWrapper {
  padding: 6px !important;
  width:100%;
}

.isoComponentTitle {
  margin-bottom: 10px!important;
}

.ant-modal-header {
  padding: 10px 25px!important;
}

.ant-form-item-control-input-content{
  font-size: 12px!important;
}
.ant-table-cell{
  font-size: 12px!important;
}

.ant-picker-dropdown,.ant-select-item{
  font-size: 12px !important;
}

.btnDelete {
  padding: 0;
  border: none;
  background: none;
  color:#f64744;
}

.btnLink {
  padding: 0;
  border: none;
  background: none;
  color:#4482FF;
}

.btnLink:hover {
  cursor: pointer;
}

.btnLink i {
  font-size: 18px;
  color: #4482FF;
}

.btnLink .delete i{
  color:#f64744;
}

/* Report faults — evenly spaced row action icons (view, message, restore, delete) */
.report-faults-row-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-evenly;
  width: 100%;
  box-sizing: border-box;
}

.report-faults-row-actions > * {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin: 0 !important;
}

.report-faults-row-actions .btnLink,
.report-faults-row-actions .btnDelete,
.report-faults-row-actions button {
  margin: 0 !important;
  padding: 4px;
  line-height: 1;
  vertical-align: middle;
}

.new-reports-row-actions.ant-space {
  display: flex !important;
  justify-content: space-evenly !important;
}

.new-reports-row-actions .ant-space-item {
  margin: 0 !important;
}

.gFontSize{
  font-size: 12px!important;
}
.gTextRight{
  text-align: right ;
}
.gTextCenter{
  text-align: center ;
}
.gWith100Percent{
  width: 100%;
}

.ant-pagination{
  font-size: 12px!important;
}

.ant-modal-body {
    padding: 12px 24px!important;
}

.ant-select-item-option-active:not(.ant-select-item-option-disabled) {
  background-color: #fc832b !important;
}

.status{
  font-size: 12px !important;
  width: 130px !important;
  text-align: center !important;
  height: 26px !important;
  padding: 1px 3px !important;
}
.ant-table-tbody > tr.ant-table-row > td,th {
  padding: 7px !important;
}
.inputNumberSplit {
  .ant-form-item-control{
    align-items: center;
  }
}

.upload-attachment {
  width: 100%;
  .ant-image {
    width: 100%;
    height: 100%;
    text-align: center;
  }
  .ant-image-img {
    width: auto;
    max-width: 100%;
    max-height:100%;
    display: inline-block;
  }

  .trash-attachment {
    position: fixed;
    z-index: 2000;
    right: 100px;
    bottom: 100px;
    :hover {
      cursor: pointer;
    }    
    .ant-avatar {
      background-color: #fff;
      box-shadow: 0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d;
      transition: color .3s;
      width: 44px;
      height: 44px;
      line-height: 44px;
      font-size: 20px;
      color: #f64744;
    }    
  }  

  .thumbPDF {
	  text-align: center;
    position: relative;
    width: 100%;
    height: 100%;
	  :after {
			content: "";
			display: inline-block;
			width: 0;
			height: 100%;
			vertical-align: middle;
		}
    :hover {
      cursor: pointer;
    }
	  .wrap-thumb {
		  width: 100%;
		  display: inline-block;
		  vertical-align: middle;		
	  }
    .anticon {
      font-size: 25px;
		  color: #F40F02;
    }
    .name {
		  margin-top: 8px;
		  font-size: 12px;
		  white-space: nowrap;
  		overflow: hidden;
  		text-overflow: ellipsis;
	  }
  }
  .thumbMsg {
	  text-align: center;
    position: relative;
    width: 100%;
    height: 100%;
	  :after {
			content: "";
			display: inline-block;
			width: 0;
			height: 100%;
			vertical-align: middle;
		}
    :hover {
      cursor: pointer;
    }
	  .wrap-thumb {
		  width: 100%;
		  display: inline-block;
		  vertical-align: middle;		
	  }
    .anticon {
      font-size: 25px;
		  color: #F40F02;
    }
    .name {
		  margin-top: 8px;
		  font-size: 12px;
		  white-space: nowrap;
  		overflow: hidden;
  		text-overflow: ellipsis;
	  }
    .rm-btn {
      position: absolute;
      top: -2px;
      right: -2px;
    }
  }
  .thumbEml {
	  text-align: center;
    position: relative;
    width: 100%;
    height: 100%;
	  :after {
			content: "";
			display: inline-block;
			width: 0;
			height: 100%;
			vertical-align: middle;
		}
    :hover {
      cursor: pointer;
    }
	  .wrap-thumb {
		  width: 100%;
		  display: inline-block;
		  vertical-align: middle;		
	  }
    img {
      max-height: 60px;
    }
    .anticon {
      font-size: 25px;
		  color: #F40F02;
    }
    .name {
		  margin-top: 8px;
		  font-size: 12px;
		  white-space: nowrap;
  		overflow: hidden;
  		text-overflow: ellipsis;
	  }
    .rm-btn {
      position: absolute;
      top: -2px;
      right: -2px;
    }
  }
}

.service-icon {
  width: 15px;
  height: 15px;
  display: inline-block;
  vertical-align: middle;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  margin-left: 3px;
  margin-top: -2px;
}

.trash-attachment {
  &.pdf {
    color: #f64744;
  }
}

.isomorphicSidebar {
  &.ant-layout-sider-collapsed {
    width: 0!important;
    min-width: 0!important;
  }
  .logo__information__avatar {
    img {
      display: inline-block;
    }
  }
}

.isomorphicTopbar {
  &.collapsed {
    padding-left: 28px!important;
  }
}

.ant-form-item {
  &.break-line {
    .ant-form-item-label {
      padding-bottom: 5px;
      width:100%;
      label {
        &:after {
          display:none;
        }
      }
      .ant-form-item-required {
        &:before {
          display: none;
        }
        &:after {
          display: inline-block;
        }
      }
    }
    .ant-form-item-control {
      min-width: inherit;
    }
  }
  &.hide-label {
    .ant-form-item-label {
      display: none;
    }
  }
}

.lbl-danger {
  color: rgb(217, 54, 62)!important;
}



.padd-bt-15 {
  padding-bottom: 15px;
}

.wrap-box {
  width: 100%;
  padding : 20px 30px;
  border: 1px solid rgb(240, 240, 240);
  margin-bottom : 15px;
}

.posted-by {
  font-size: 12px;
  padding-bottom: 5px;
  font-weight: 500;
}

.ant-divider-horizontal {
  margin: 5px 0!important;
}

.icon-prefix {
  display: inline-block;
  width: 16px;
  vertical-align: middle;
  margin-left: 5px;
  line-height: 1;

  &.dg {
    color: #ff0a18;
  }
  &.pass {
    color: #6daf51;
  }
  &.labour {
    color: #ff0917;
  }
  &.exthandle {
    color: #ff141e;
  }
}

.ant-form-item.inp-new-right {
  height: 35px;
  width: calc(100% - 70px);
  display: inline-block;
}

.ant-form .h-justify-right .ant-form-item-control {
  margin-right: 8px;
}
.noWrapCell {
  white-space: normal!important;
}

.btn-new-right {
  display: inline-block!important;
  max-width: 70px;
}

.total-note {
  text-align: right;
  padding-top: 12px;
  .success {
    color: rgb(46, 204, 113);
  }
  .error {
    color: rgb(235, 42, 96);
  }
}

@media (prefers-reduced-motion: no-preference) {
    .Box-logo {
        animation: Box-logo-spin infinite 15s linear;
        animation-delay: 2s;
        opacity: 0;
    }
}

@keyframes Box-logo-spin {
  0% { transform: translate(0%, 0%) scale(1, 1) ; 
       filter: hue-rotate(120deg);  
       opacity:0 ; 
     }
 30% { transform: translate(0%, 0%) scale(1, 1); 
       opacity:1 ; 
     }
 31% { transform: translate(0%, -60%) scale(1.2, 0.8); }
 31.5% { transform: translate(0%, -60%) rotate(15deg); }
 32% { transform: translate(0%, -60%) rotate(-15deg); }
 32.5% { transform: translate(0%, -60%) rotate(15deg); }
 33% { transform: translate(0%, -60%) rotate(-15deg); }
 33.5% { transform: translate(0%, 0%) scale(1, 1); } 
 56% { transform: translate(0%, 0%) scale(1, 1);
         filter: hue-rotate(60deg);
        }
 57% { transform: translate(0%, 0%) scale(1.1, 1.05);
       filter: hue-rotate(60deg);  
     }
 60% { transform: translate(0%, 0%) scale(1, 1); 
       filter: hue-rotate(180deg);
     }
 68% { transform: translate(0%, 0%) scale(1, 1); 
       
     }
 70% { transform: translate(0%, 0%) scale(1.25, 1.15); 
   filter: hue-rotate(120deg);
     }
 74% { transform: translate(0%, 0%) scale(1, 1); 
   filter: hue-rotate(180deg);
   }  
 85% { transform: translate(0%, 0%) scale(1, 1);
       opacity: 1;
     }
 100% { opacity: 0; } 
}

.macro-btn-list {
  width: 100%;
  display: block;
  overflow: hidden;
  button {
    float: left;
    margin-bottom: 5px;
    margin-right: 5px;  /* and that, will result in a 10px gap */
  }
}

.wrap-checkbx-area {
  padding-bottom: 20px;
  h5 {
    padding-bottom: 10px;
  }
  .ant-row {
    padding: 0 15px;
    .ant-col {
      margin-bottom: 10px;
    }
  }
  
}

// .frm-invoice {
//   .ant-form-item-label {
//     label {
//       min-width: 110px;
//     }
//   }
  
// }

.components-table-nested {
  .ant-table {
    margin: 0!important;
    padding-left: 33px;
  }
}

.e-reportviewer-icon {
  font-family : 'ej-webfont'!important;
}

.e-icon, .e-rte-toolbar-icon, .e-background-color, .e-font, .e-rte-footericon, .e-resize-handle, .e-ddl-icon {
  font-family : 'ej-webfont'!important;
}

.lbl-route {
  h3 {
    display: inline-block;
  }
}

.relative {
  position: relative
}

.ant-btn.btn-copy {
  display: inline-block;
  border: none;
  &.btn-absolute {
    position: absolute;
    bottom: 12px;
    left: 100%;
    z-index: 20;
    padding : 4px 5px;
  }
}

#qr-code-container {
  opacity: 0;
  height: 0;
  width: 0;
}

.hide-qr {
  opacity: 0;
  height: 0;
  width: 0;
}

.ant-checkbox-group {
  flex-flow: row wrap;
}

.item-service {
  white-space : nowrap;
  margin-bottom: 5px!important;
  margin-right : 7px!important;
  margin-left : 0!important;
}

.btn-help {
  margin-right : 40px;
}

.btn-help .ico {
  display: inline-block;
    color: #ffffff;
    font-size: 30px;
    border-radius: 50%;
    overflow: hidden;
    width: 30px;
    height: 30px;
    line-height: 1;
    vertical-align: middle;
    margin-right: 5px;
}

.btn-help .text {
  display: inline-block;
  vertical-align: middle;
  color: #000000;
  font-size: 14px;
  font-weight: 500;
}

.hold-hide {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  top: 0;
  right: 0;
}

]
@font-face{
  font-family: text-security-disc;
  src: url("https://raw.githubusercontent.com/noppa/text-security/master/dist/text-security-disc.woff");
}
.password-prevent{
  -webkit-text-security: disc;
  font-family: text-security-disc;
}


.ag-theme-balham .ag-header-cell {
  background: #397d36 !important;
  color: #fff !important;
  font-size: 12px !important;
  font-family: 'Montserrat','Roboto',sans-serif !important;
  font-weight: normal !important;
}

.ag-theme-balham .ag-pinned-right-header {
  background: #397d36 !important;
  color: #fff !important;
}
.ant-upload-list-item-image{
  height: 60px  !important;
}

/* Mobile nav drawer (class only exists on portrait mobile menu) */
.mobile-left-nav-drawer.ant-drawer .ant-drawer-content-wrapper {
  width: 100vw !important;
  max-width: 100vw !important;
}

.mobile-left-nav-drawer .ant-drawer-content,
.mobile-left-nav-drawer .ant-drawer-body {
  height: 100%;
  overflow-y: auto;
  padding: 0;
  background: #397d36 !important;
}

.mobile-left-nav-drawer .mobile-sidebar-header {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 8px;
  flex-shrink: 0;
  background: #397d36;
  padding: 10px 12px 10px 10px;
  min-height: auto;
}

.mobile-left-nav-drawer .mobile-sidebar-header__brand {
  flex: 0 1 auto;
  min-width: 0;
  max-width: calc(100% - 56px);
  background: #fff;
  padding: 8px 10px;
}

.mobile-left-nav-drawer .mobile-sidebar-header__brand .logo,
.mobile-left-nav-drawer .mobile-sidebar-header__brand .logo--mobile-drawer {
  width: auto !important;
  max-width: 100%;
  display: block !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
}

.mobile-left-nav-drawer .mobile-sidebar-header__brand .logo__main {
  display: block !important;
  width: 68px !important;
  max-width: 68px !important;
  height: auto !important;
  max-height: 42px !important;
  object-fit: contain;
}

.mobile-left-nav-drawer .mobile-sidebar-close.ant-btn {
  position: fixed !important;
  top: 12px !important;
  right: 12px !important;
  left: auto !important;
  z-index: 1101 !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 50% !important;
  background: #fff !important;
  color: #333 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

.mobile-left-nav-drawer .mobile-sidebar-close.ant-btn .anticon {
  font-size: 18px;
  line-height: 1;
}

.mobile-left-nav-drawer .mobile-sidebar-close:active {
  background: #f0f0f0;
  transform: scale(0.96);
}

.mobile-left-nav-drawer .isomorphicSidebar--drawer {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: #397d36 !important;
}

.mobile-left-nav-drawer .mobile-sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: #397d36 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu {
  max-height: none !important;
  min-height: auto !important;
  background: #397d36 !important;
  display: block !important;
  visibility: visible !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-item,
.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-submenu-title {
  display: flex !important;
  visibility: visible !important;
  color: #f0f0f0 !important;
  background-color: #397d36 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-item-selected {
  background-color: #85c179 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-submenu-open > .ant-menu-submenu-title,
.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-submenu-selected > .ant-menu-submenu-title,
.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-submenu-active > .ant-menu-submenu-title {
  background-color: #397d36 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-item:hover,
.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-submenu-title:hover {
  background-color: #85c179 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-sub,
.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-sub .ant-menu-item {
  background: #397d36 !important;
  background-color: #397d36 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .ant-menu-sub .ant-menu-item-selected {
  background-color: #85c179 !important;
}

.mobile-left-nav-drawer .isoDashboardMenu .nav-text,
.mobile-left-nav-drawer .isoDashboardMenu .anticon {
  color: #fff !important;
  visibility: visible !important;
}

/* Mobile portrait: dashboard and layout tweaks */
@media (max-width: 768px) and (orientation: portrait) {
  .dashboard-report-badges {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px 8px;
    justify-items: center;
    margin-top: 16px;
    padding: 0 8px;
  }

  .dashboard-report-badge__circle,
  .dashboard-faults-badge__icon-wrap,
  .dashboard-messages-badge__icon-wrap {
    width: 64px !important;
    height: 64px !important;
    font-size: 26px !important;
  }

  .dashboard-report-badge__circle--action {
    font-size: 28px !important;
  }

  .dashboard-report-badge__label,
  .dashboard-messages-badge__label {
    margin-top: 8px;
    font-size: 11px;
    text-align: center;
    line-height: 1.2;
  }

  .dashboard-messages-badge__icon-wrap {
    border-radius: 50%;
    background: #1677ff;
    color: #fff;
    font-size: 28px;
  }
}

/* Upload thumbnails: 4 per row on mobile */
@media (max-width: 768px) {
  .image-upload-grid-wrap {
    width: 100%;
  }

  .image-upload-grid-wrap .image-upload-grid.ant-upload,
  .image-upload-grid-wrap .image-upload-grid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    width: 100% !important;
  }

  .image-upload-grid-wrap .ant-upload-list-picture-card {
    display: contents !important;
  }

  .image-upload-grid-wrap .ant-upload-list-picture-card-container,
  .image-upload-grid-wrap .ant-upload.ant-upload-select-picture-card {
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    aspect-ratio: 1 / 1;
  }

  .image-upload-grid-wrap .ant-upload-list-picture-card .ant-upload-list-item {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 8px !important;
  }

  .image-upload-grid-wrap .ant-upload-list-picture-card .ant-upload-list-item-info::before {
    width: 100% !important;
    height: 100% !important;
    padding-top: 0 !important;
  }

  .image-upload-grid-wrap .ant-upload-list-picture-card .ant-upload-list-item-thumbnail,
  .image-upload-grid-wrap .ant-upload-list-picture-card .ant-upload-list-item-thumbnail img,
  .image-upload-grid-wrap .ant-upload-list-picture-card .ant-upload-list-item-image {
    width: 100% !important;
    height: 100% !important;
    max-height: none !important;
    object-fit: cover;
  }
}

/* Mobile dark mode — class + inline styles (toggle in top bar) */
.mobile-portrait-topbar--dark {
  background-color: #000000 !important;
  border-bottom: 1px solid #1a1a1a !important;
}

.isomorphicTopbar.mobile-portrait-topbar--dark h2,
.mobile-portrait-topbar--dark h2,
.isomorphicTopbar.mobile-portrait-topbar--dark .isoUser .usernameWrapper .information h5.username,
.mobile-portrait-topbar--dark .username,
.mobile-portrait-topbar--dark h5.username,
.mobile-portrait-topbar--dark .usernameWrapper,
.mobile-portrait-topbar--dark .isoUser .anticon {
  color: #ffffff !important;
}

.isomorphicTopbar.mobile-portrait-topbar--dark .isoRight li.isoColorMode .isoColorModeToggle {
  color: #ffffff !important;
  border: 1px solid #5a5a5a !important;
  background: rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
}

.isomorphicTopbar.mobile-portrait-topbar--dark .isoRight li.isoColorMode .isoColorModeToggle .anticon,
.isomorphicTopbar.mobile-portrait-topbar--dark .isoRight li.isoColorMode .isoColorModeToggle .anticon svg {
  color: #ffffff !important;
  fill: currentColor !important;
}

.isomorphicTopbar.mobile-portrait-topbar--dark .isoRight li.isoColorMode .isoColorModeToggle:hover,
.isomorphicTopbar.mobile-portrait-topbar--dark .isoRight li.isoColorMode .isoColorModeToggle:focus-visible {
  background: rgba(255, 255, 255, 0.18) !important;
}

.mobile-portrait-topbar--dark .triggerBtn::before {
  color: #ffffff !important;
}

.isoLayoutContentWrapper:has(.new-reports-page-dark),
.isoLayoutContentWrapper:has(.new-reports-theme-dark),
.isoExampleWrapper:has(.new-reports-page-dark),
.isoExampleWrapper:has(.new-reports-theme-dark),
.isoBoxWrapper:has(.new-reports-page-dark),
.isoBoxWrapper:has(.new-reports-theme-dark),
.new-reports-list-wrap.new-reports-page-dark,
.new-reports-list-wrap.new-reports-theme-dark,
.report-faults-list-wrap.new-reports-page-dark,
.report-faults-list-wrap.new-reports-theme-dark {
  background: #000000 !important;
  box-shadow: none !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
}

html[data-color-mode="dark"] .isomorphicContent:has(.new-reports-page-dark),
html[data-color-mode="dark"] #main-content:has(.new-reports-page-dark),
html[data-color-mode="dark"] .isoContentMainLayout:has(.new-reports-page-dark) {
  background: #000000 !important;
}

.isoLayoutContentWrapper:has(.new-reports-page-dark) {
  padding: 0 !important;
}

.isoBoxWrapper:has(.new-reports-page-dark),
body.new-reports-page-body-dark .isoBoxWrapper,
.isoBoxWrapper.new-reports-layout-dark {
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
}

.isoExampleWrapper:has(.new-reports-page-dark) {
  padding: 0 !important;
}

.ant-row:has(.new-reports-page-dark),
.ant-col:has(.new-reports-page-dark) {
  background: transparent !important;
}

.new-reports-list-wrap.new-reports-page-dark,
.new-reports-list-wrap.new-reports-theme-dark,
.report-faults-list-wrap.new-reports-page-dark,
.report-faults-list-wrap.new-reports-theme-dark {
  min-height: 100%;
}

.new-reports-theme-dark {
  color: #f0f0f0;
}

.new-reports-theme-dark .new-reports-list-filters--dark .ant-form-item-label > label,
.new-reports-theme-dark .ant-form-item-label > label {
  color: #b0b0b0 !important;
}

/* Ant Design v4 + v5 form controls */
.new-reports-theme-dark .ant-input,
.new-reports-theme-dark .ant-input-affix-wrapper,
.new-reports-theme-dark .ant-picker,
.new-reports-theme-dark .ant-picker-range,
.new-reports-theme-dark .ant-picker-input,
.new-reports-theme-dark .ant-picker-input > input,
.new-reports-theme-dark .ant-calendar-picker-input,
.new-reports-theme-dark .ant-select-selector,
.new-reports-theme-dark .ant-select-selection,
.new-reports-theme-dark .ant-select-single .ant-select-selector,
.new-reports-theme-dark .ant-select:not(.ant-select-customize-input) .ant-select-selector,
.new-reports-theme-dark .nr-mobile-dark-field,
.new-reports-theme-dark .nr-mobile-dark-field .ant-select-selector,
.new-reports-theme-dark .nr-mobile-dark-field.ant-select .ant-select-selector,
.new-reports-theme-dark .nr-mobile-dark-field.ant-picker,
.new-reports-theme-dark .nr-mobile-select-dark .ant-select-selector,
.new-reports-theme-dark .nr-mobile-select-dark.ant-select .ant-select-selection {
  background: #141414 !important;
  background-color: #141414 !important;
  border-color: #333333 !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .ant-select-selection__rendered,
.new-reports-theme-dark .ant-select-selection__placeholder,
.new-reports-theme-dark .ant-select-selection-item,
.new-reports-theme-dark .ant-select-selection-search-input {
  color: #ffffff !important;
}

.new-reports-theme-dark .ant-picker-input > input,
.new-reports-theme-dark .ant-calendar-picker-input input {
  color: #ffffff !important;
  background: transparent !important;
}

.new-reports-theme-dark .ant-select-arrow,
.new-reports-theme-dark .ant-picker-suffix,
.new-reports-theme-dark .ant-picker-separator,
.new-reports-theme-dark .ant-picker-active-bar {
  background: transparent !important;
  color: transparent !important;
}

.new-reports-theme-dark .ant-calendar-picker-icon {
  color: #9a9a9a !important;
}

.new-reports-theme-dark .new-reports-list-filters-form--dark {
  background: #0a0a0a !important;
  padding: 12px !important;
  border-radius: 8px !important;
  border: 1px solid #2e2e2e !important;
}

/* Mobile: keep job-site/service search visible when other filters are collapsed */
.new-reports-list-filters-form--collapsed .ant-form-item:not(.nr-search-row) {
  display: none !important;
}

/* Select shells — beats antd default #fff on .ant-select-selector */
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap {
  width: 100%;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select {
  width: 100%;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select:not(.ant-select-customize-input) .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-multiple .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select.ant-select-multiple:not(.ant-select-customize-input) .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-list-filters--dark .ant-select .ant-select-selector,
html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-list-filters--dark .ant-select-selection,
html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-list-filters--dark .ant-select-selection--single,
html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-list-filters--dark .ant-select-selection--multiple {
  background: #141414 !important;
  background-color: #141414 !important;
  border-color: #444444 !important;
  color: #ffffff !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select-selection-item,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select-selection-placeholder,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select-selection__placeholder,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selection-placeholder,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selection__placeholder {
  color: #9a9a9a !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-select-shell .ant-select-arrow,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-arrow,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-clear {
  color: #9a9a9a !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-picker-shell .ant-picker,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-picker-shell .ant-picker-range,
html[data-color-mode="dark"] .new-reports-theme-dark .ant-picker,
html[data-color-mode="dark"] .new-reports-theme-dark .ant-picker-range,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-mobile-dark-field.ant-picker,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-picker-shell .ant-picker-input > input {
  background: #141414 !important;
  background-color: #141414 !important;
  border-color: #444444 !important;
  color: #ffffff !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-picker-shell .ant-picker-suffix,
html[data-color-mode="dark"] .new-reports-theme-dark .nr-dark-picker-shell .ant-picker-separator {
  color: #9a9a9a !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-tab .ant-tabs-tab-btn {
  color: #8c8c8c !important;
}

html[data-color-mode="dark"] .new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-tab-active .ant-tabs-tab-btn {
  color: #69b1ff !important;
}

/* Dropdown / calendar panels (portaled) */
.nr-mobile-dark-dropdown.ant-select-dropdown,
.nr-mobile-dark-dropdown .ant-select-dropdown-menu,
.nr-mobile-dark-dropdown.ant-picker-dropdown .ant-picker-panel-container,
.nr-mobile-dark-dropdown .ant-picker-panel,
.nr-mobile-dark-calendar.ant-picker-dropdown .ant-picker-panel-container,
.nr-mobile-dark-calendar .ant-picker-panel,
.nr-mobile-dark-calendar .ant-picker-header,
.nr-mobile-dark-calendar .ant-picker-body,
.nr-mobile-dark-calendar .ant-picker-content,
.nr-mobile-dark-calendar .ant-picker-cell,
.nr-mobile-dark-calendar .ant-picker-time-panel {
  background: #141414 !important;
  color: #ffffff !important;
  border-color: #333333 !important;
}

.nr-mobile-dark-dropdown .ant-select-item,
.nr-mobile-dark-dropdown .ant-select-dropdown-menu-item {
  color: #f0f0f0 !important;
  background: #141414 !important;
}

.nr-mobile-dark-dropdown .ant-select-item-option-active,
.nr-mobile-dark-dropdown .ant-select-dropdown-menu-item-active,
.nr-mobile-dark-dropdown .ant-select-dropdown-menu-item:hover {
  background: #262626 !important;
}

.nr-mobile-dark-calendar .ant-picker-cell-in-view {
  color: #f0f0f0 !important;
}

.nr-mobile-dark-calendar .ant-picker-header button {
  color: #f0f0f0 !important;
}

.new-reports-theme-dark .nr-mobile-btn-dark.ant-btn,
.new-reports-theme-dark .ant-btn-default:not(.ant-btn-primary):not(.ant-btn-dangerous):not(.ant-btn-link) {
  background: #141414 !important;
  border-color: #333333 !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .ant-btn-default[disabled],
.new-reports-theme-dark .ant-btn[disabled]:not(.ant-btn-primary):not(.ant-btn-dangerous) {
  background: #1a1a1a !important;
  border-color: #2a2a2a !important;
  color: #666666 !important;
}

.new-reports-theme-dark .ant-btn-dangerous[disabled] {
  background: #2a1515 !important;
  border-color: #4a2a2a !important;
  color: #8c5a5a !important;
}

.new-reports-theme-dark .ant-btn-link.ant-btn[disabled] {
  background: #1a1a1a !important;
}

.new-reports-theme-dark .nr-mobile-checkbox .ant-checkbox-inner {
  background-color: #1a1a1a !important;
  border-color: #444444 !important;
}

.new-reports-theme-dark .nr-mobile-checkbox.ant-checkbox-checked .ant-checkbox-inner {
  background-color: #389e0d !important;
  border-color: #389e0d !important;
}

.new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-nav::before {
  border-bottom-color: #2a2a2a !important;
}

.new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-tab {
  color: #8c8c8c !important;
}

.new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-tab-active .ant-tabs-tab-btn {
  color: #ffffff !important;
}

.new-reports-theme-dark .new-reports-mobile-tabs--dark .ant-tabs-ink-bar {
  background: #52c41a !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark {
  background: #1a1a1a !important;
  border: 2px solid #525252 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
}

/* Bulk multi-select (Ant Design v4 + v5) */
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap,
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap .ant-select {
  width: 100%;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap .ant-select.ant-select-multiple:not(.ant-select-customize-input) .ant-select-selector,
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-dark.ant-select-multiple:not(.ant-select-customize-input) .ant-select-selector,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select .ant-select-selector,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select .ant-select-selection,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection--multiple,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-multiple .ant-select-selector,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection--multiple,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection__rendered,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-overflow,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-search,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-search-input {
  background: #141414 !important;
  background-color: #141414 !important;
  border-color: #444444 !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-placeholder,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection__placeholder,
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap .ant-select-selection-placeholder {
  color: #9a9a9a !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap .ant-select-arrow,
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-bulk-select-wrap .ant-select-clear {
  color: #9a9a9a !important;
  background: transparent !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-item,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection__choice {
  background: #262626 !important;
  border-color: #444444 !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-btn-dangerous,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-btn.ant-btn-dangerous,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-btn-danger,
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-mobile-bulk-remove-btn.ant-btn-danger {
  background: #3a1f1f !important;
  border-color: #6b3030 !important;
  color: #ff9c9c !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-btn-dangerous[disabled],
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-btn-danger[disabled],
.new-reports-theme-dark .new-reports-bulk-bar--dark .nr-mobile-bulk-remove-btn.ant-btn-danger[disabled] {
  background: #2a1515 !important;
  border-color: #4a2a2a !important;
  color: #8c5a5a !important;
}

.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-selection-search__field,
.new-reports-theme-dark .new-reports-bulk-bar--dark .ant-select-search__field {
  background: transparent !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .nr-mobile-pdf-btn.ant-btn,
.new-reports-theme-dark .nr-mobile-btn-dark.nr-mobile-pdf-btn {
  background: #1a1a1a !important;
  border-color: #444444 !important;
  color: #e8e8e8 !important;
}

.new-reports-theme-dark .nr-mobile-pdf-btn.ant-btn .anticon {
  color: #e8e8e8 !important;
}

.new-reports-theme-dark .new-reports-mobile-pagination.ant-pagination {
  color: #b0b0b0 !important;
}

.new-reports-theme-dark .new-reports-mobile-pagination .ant-pagination-item {
  background: #141414 !important;
  border-color: #333333 !important;
}

.new-reports-theme-dark .new-reports-mobile-pagination .ant-pagination-item a {
  color: #ffffff !important;
}

.new-reports-theme-dark .new-reports-mobile-pagination .ant-pagination-item-active {
  background: #389e0d !important;
  border-color: #389e0d !important;
}

.new-reports-theme-dark .new-reports-mobile-pagination .ant-pagination-prev .ant-pagination-item-link,
.new-reports-theme-dark .new-reports-mobile-pagination .ant-pagination-next .ant-pagination-item-link {
  background: #141414 !important;
  border-color: #333333 !important;
  color: #ffffff !important;
}

.new-reports-theme-dark .ant-empty-description {
  color: #8c8c8c !important;
}

.new-reports-theme-dark .nr-mobile-report-meta-label {
  color: #d0d6de !important;
}

.new-reports-theme-dark .nr-mobile-report-meta-value {
  color: #ffffff !important;
  font-weight: 500 !important;
}

.submitted-report-view-modal--mobile-dark .ant-modal-content {
  background: #141414 !important;
  color: #ffffff !important;
}

.submitted-report-view-modal--mobile-dark .ant-modal-body {
  background: #141414 !important;
  color: #ffffff !important;
}

.submitted-report-view-modal--mobile-dark .ant-modal-footer {
  background: #0a0a0a !important;
  border-top-color: #2a2a2a !important;
}

.new-report-form-modal-wrap--dark.ant-modal-wrap .ant-modal-mask {
  background-color: rgba(0, 0, 0, 0.82) !important;
}

.new-report-form-modal--dark .ant-modal-content {
  background: #262626 !important;
  color: #f0f0f0 !important;
  border: 2px solid #5a5a5a !important;
  border-radius: 14px !important;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 28px 90px rgba(0, 0, 0, 0.95),
    0 12px 40px rgba(0, 0, 0, 0.75) !important;
  overflow: hidden;
}

.new-report-form-modal--dark .ant-modal-header {
  background: linear-gradient(180deg, #397d36 0%, #2f6b2c 100%) !important;
  border-bottom: none !important;
}

.new-report-form-modal--dark .ant-modal-title,
.new-report-form-modal--dark .ant-modal-title span {
  color: #ffffff !important;
  font-weight: 700 !important;
}

.new-report-form-modal--dark .ant-modal-close {
  color: rgba(255, 255, 255, 0.88) !important;
}

.new-report-form-modal--dark .ant-modal-body {
  background: #262626 !important;
}

.new-report-form-modal--dark .ant-modal-footer {
  background: #1e1e1e !important;
  border-top: 1px solid #404040 !important;
}

.new-report-form-modal--dark .ant-form-item-label > label {
  color: #b0b0b0 !important;
}

.new-report-form-modal--dark .ant-select-selector,
.new-report-form-modal--dark .ant-select:not(.ant-select-customize-input) .ant-select-selector,
.new-report-form-modal--dark .ant-input,
.new-report-form-modal--dark textarea.ant-input,
.new-report-form-modal--dark .ant-input-number,
.new-report-form-modal--dark .ant-picker {
  background: #1a1a1a !important;
  border-color: #555555 !important;
  color: #ffffff !important;
}

.new-report-form-modal--dark .ant-select-selection-placeholder {
  color: #9a9a9a !important;
}

/* Create / edit modal — media upload (attachFiles) */
.new-report-form-modal--dark label,
.new-report-form-modal--dark .ant-form label {
  color: #b0b0b0 !important;
}

.new-report-form-modal--dark .ant-upload {
  color: rgba(255, 255, 255, 0.88) !important;
  width: 100%;
}

.new-report-form-modal--dark .ant-upload-select {
  display: block !important;
  width: 100% !important;
}

.new-report-form-modal--dark .ant-upload-select > button,
.new-report-form-modal--dark .ant-upload .ant-upload-select button {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-height: 88px !important;
  padding: 16px 12px !important;
  background: #1a1a1a !important;
  background-color: #1a1a1a !important;
  border: 1px dashed #555555 !important;
  border-radius: 8px !important;
  color: #f0f0f0 !important;
  cursor: pointer !important;
}

.new-report-form-modal--dark .ant-upload-select .anticon,
.new-report-form-modal--dark .ant-upload-select button .anticon {
  color: #9a9a9a !important;
  font-size: 24px !important;
}

.new-report-form-modal--dark .ant-upload-select button div {
  color: #f0f0f0 !important;
}

.new-report-form-modal--dark .ant-upload-list-item {
  background: #1a1a1a !important;
  border: 1px solid #444444 !important;
  border-radius: 6px !important;
  margin-top: 8px !important;
  padding: 8px 12px !important;
}

.new-report-form-modal--dark .ant-upload-list-item-name,
.new-report-form-modal--dark .ant-upload-list-item-info {
  color: #f0f0f0 !important;
}

.new-report-form-modal--dark .ant-upload-list-item .anticon {
  color: rgba(255, 255, 255, 0.65) !important;
}

.new-report-form-modal--dark .ant-upload-list-item:hover .ant-upload-list-item-info {
  background: #262626 !important;
}

.dashboard-content--dark {
  background: #000000 !important;
}

.dashboard-content--dark .isoBoxWrapper {
  background: #121212 !important;
  border-radius: 18px !important;
  border: 1px solid #333333 !important;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 20px 60px rgba(0, 0, 0, 0.95) !important;
}

.dashboard-content--dark .dashboard-report-badge__circle--reports,
.dashboard-content--dark .dashboard-report-badge__circle--checkin,
.dashboard-content--dark .dashboard-report-badge__circle--tickets,
.dashboard-content--dark .dashboard-report-badge__circle--faults,
.dashboard-content--dark .dashboard-messages-badge__icon-wrap {
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.95);
}

.dashboard-content--dark .dashboard-report-badge__label,
.dashboard-content--dark .dashboard-messages-badge__label,
.dashboard-content--dark .dashboard-title,
.dashboard-content--dark .status-wrap .lable,
.dashboard-content--dark .status-wrap .count {
  color: #f5f5f5 !important;
}

/* Dashboard page (mobile + desktop) dark mode */
body.dashboard-page-body-dark #main-content,
body.dashboard-page-body-dark .isomorphicContent {
  background: #000000 !important;
}

body.dashboard-page-body-dark .isoBoxWrapper {
  background: #121212 !important;
  border-radius: 18px !important;
  border: 1px solid #333333 !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95) !important;
}

body.dashboard-page-body-dark .dashboard-section-heading,
body.dashboard-page-body-dark .dashboard-report-badge__label,
body.dashboard-page-body-dark .dashboard-messages-badge__label {
  color: #f5f5f5 !important;
}

/* Extra specificity: DashboardWarp class */
.dashboard-page--dark .dashboard-section-heading,
.dashboard-page--dark .dashboard-report-badge__label,
.dashboard-page--dark .dashboard-messages-badge__label {
  color: #f5f5f5 !important;
}

.dashboard-page--dark {
  background: #000000 !important;
}

/* Mobile portrait dashboard dark mode (no desktop impact; do not affect list pages) */
@media (max-width: 768px) and (orientation: portrait) {
  html[data-color-mode="dark"] body.dashboard-page-body-dark #main-content {
    background: #000000 !important;
  }

  html[data-color-mode="dark"] body.dashboard-page-body-dark #main-content .isoBoxWrapper {
    background: #121212 !important;
    border: 1px solid #333333 !important;
    border-radius: 18px !important;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 20px 60px rgba(0, 0, 0, 0.95) !important;
  }

  html[data-color-mode="dark"] body.dashboard-page-body-dark #main-content .dashboard-section-heading,
  html[data-color-mode="dark"] body.dashboard-page-body-dark #main-content .dashboard-report-badge__label,
  html[data-color-mode="dark"] body.dashboard-page-body-dark #main-content .dashboard-messages-badge__label {
    color: #f5f5f5 !important;
  }
}

/* Report Faults — mobile portrait table fits viewport (no horizontal scroll) */
@media (max-width: 768px) and (orientation: portrait) {
  .isoLayoutContentWrapper:has(.report-faults-list-wrap--mobile-portrait),
  .isoExampleWrapper:has(.report-faults-list-wrap--mobile-portrait) {
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  body.new-reports-page-body-dark .isoLayoutContentWrapper:has(.report-faults-list-wrap--mobile-portrait) {
    padding-top: 0 !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-table--mobile-portrait table {
    table-layout: fixed !important;
    width: 100% !important;
  }

  .report-faults-list-wrap--mobile-portrait .ant-table-thead > tr > th,
  .report-faults-list-wrap--mobile-portrait .ant-table-tbody > tr > td {
    padding: 8px 4px !important;
  }

  .report-faults-list-wrap--mobile-portrait .ant-table-selection-column {
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    padding-left: 2px !important;
    padding-right: 2px !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-row-actions {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-evenly;
    width: 100%;
    gap: 0;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-row-actions .btnLink,
  .report-faults-list-wrap--mobile-portrait .report-faults-row-actions button.btnDelete {
    margin-right: 0 !important;
    padding: 2px 4px;
    line-height: 1;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-row-actions .anticon {
    font-size: 16px;
  }

  .report-faults-list-wrap--mobile-portrait .ant-table-body,
  .report-faults-list-wrap--mobile-portrait .ant-table-content {
    overflow-x: hidden !important;
  }

  .report-faults-list-wrap--mobile-portrait .ant-table-wrapper {
    overflow-x: hidden !important;
  }

  .report-faults-list-wrap--mobile-portrait .new-reports-list-filters .ant-form-item,
  .report-faults-list-wrap--mobile-portrait .new-reports-list-filters .nr-dark-picker-shell,
  .report-faults-list-wrap--mobile-portrait .new-reports-list-filters .ant-picker,
  .report-faults-list-wrap--mobile-portrait .new-reports-list-filters .ant-input {
    width: 100% !important;
    max-width: 100% !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-mobile-filters-form .ant-form-item {
    margin-bottom: 0 !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-mobile-filters-form .ant-form-item-control-input,
  .report-faults-list-wrap--mobile-portrait .report-faults-mobile-filters-form .ant-form-item-control-input-content {
    background: transparent !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-filter-search {
    width: 100%;
    margin-top: 4px;
    margin-bottom: 0;
    background: transparent !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-filter-search .ant-btn {
    width: 100%;
  }

  /* RangePicker active bar / wrapper bleed (white strip) */
  .report-faults-list-wrap--mobile-portrait .ant-picker-active-bar {
    display: none !important;
  }

  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-mobile-filters-form
    .ant-input.nr-mobile-dark-field,
  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-mobile-filters-form
    input.ant-input,
  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-filter-keyword
    .ant-input,
  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-filter-keyword
    .ant-input-affix-wrapper {
    background-color: #141414 !important;
    background: #141414 !important;
    border-color: #444444 !important;
    color: #ffffff !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-filter-keyword .ant-input-affix-wrapper {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .report-faults-list-wrap--mobile-portrait .report-faults-filter-keyword .ant-input {
    border: 1px solid #d9d9d9 !important;
  }

  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-filter-keyword
    .ant-input {
    border-color: #444444 !important;
  }

  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark
    .report-faults-mobile-filters-form
    .nr-dark-picker-shell
    .ant-picker {
    background: #141414 !important;
    border-color: #444444 !important;
  }

  .report-faults-list-wrap--mobile-portrait .new-reports-bulk-bar--mobile .nr-bulk-select-wrap,
  .report-faults-list-wrap--mobile-portrait .new-reports-bulk-bar--mobile .nr-bulk-select-wrap .ant-select {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
  }

  .report-faults-list-wrap--mobile-portrait .new-reports-bulk-bar--mobile .ant-select-selector {
    min-height: 36px;
  }

  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait
    .new-reports-bulk-bar--dark
    .nr-mobile-bulk-remove-btn,
  html[data-color-mode="dark"]
    .report-faults-list-wrap--mobile-portrait
    .new-reports-bulk-bar--dark
    .nr-mobile-bulk-remove-btn .anticon {
    color: #ff9c9c !important;
  }
}

/* Messages — mobile portrait: list OR chat (not side-by-side) */
@media (max-width: 768px) and (orientation: portrait) {
  .isoLayoutContentWrapper:has(.messages-page-root),
  .isoExampleWrapper:has(.messages-page-root) {
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  .messages-page-root .messages-page-sidebar {
    min-height: 0;
  }

  .messages-page-root .messages-page-chat-header .ant-tabs-nav {
    margin-bottom: 0;
  }

  .messages-page-root .messages-page-chat-header .ant-tabs-nav-wrap {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .messages-page-root .messages-page-composer .ant-upload-list {
    max-width: 100%;
  }

  .messages-page-root .messages-page-composer textarea.ant-input {
    width: 100% !important;
  }

  .messages-page-root .message-bubble-row {
    max-width: 100% !important;
  }
}

/* Fault report view modal — horizontal header + content left / status right */
.report-fault-view-modal-wrap .ant-modal {
  max-width: calc(100vw - 32px);
}

.report-fault-view-modal__title {
  font-weight: 600;
  font-size: 16px;
}

.report-fault-view-modal__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 20px 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.report-fault-view-modal__meta-row .report-fault-view-modal__field {
  flex: 0 1 auto;
  min-width: 120px;
}

.report-fault-view-modal__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  padding-top: 16px;
}

.report-fault-view-modal__content {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 62%;
}

.report-fault-view-modal__content .report-fault-view-modal__field + .report-fault-view-modal__field,
.report-fault-view-modal__content .report-fault-view-modal__media-block {
  margin-top: 16px;
}

.report-fault-view-modal__aside {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  padding-top: 0;
}

.report-fault-view-modal__aside .report-fault-view-modal__field {
  text-align: right;
}

.report-fault-view-modal__label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  line-height: 1.4;
}

.report-fault-view-modal__value {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
  line-height: 1.5;
  word-break: break-word;
}

.report-fault-view-modal__message.ant-typography {
  margin-bottom: 0 !important;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
}

.report-fault-view-modal__media-block .report-fault-view-modal__label {
  margin-bottom: 8px;
}

.report-fault-view-modal__media {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-fault-view-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .report-fault-view-modal__main {
    flex-direction: column;
  }

  .report-fault-view-modal__content {
    max-width: 100%;
  }

  .report-fault-view-modal__aside {
    flex-direction: row;
    align-items: flex-start;
    width: 100%;
    justify-content: flex-start;
  }

  .report-fault-view-modal__aside .report-fault-view-modal__field {
    text-align: left;
  }
}

`;

export default GlobalStyles;
