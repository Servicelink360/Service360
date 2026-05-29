import React from "react";
// import PropTypes from 'prop-types';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "react-quill/dist/quill.bubble.css";
import "react-quill/dist/quill.core.css";
import serviceType from "@app/constants/serviceType";
import { callAPIAsync } from "../../../library/helpers/api";
import helperFunc from "../../../library/helpers/helperFunc";
import EditorWrapper from "./editor.style";
class ReactQuillComponent extends React.Component {
  quillImageCallback = () => {
    const { getBase64_Params } = helperFunc;
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (file) {
        const photo = await getBase64_Params(file);
        try {
          const response = await callAPIAsync(
            serviceType.COMMON,
            "v1/common/uploadImage",
            "POST",
            { Image: photo }
          );
          if (response?.message.toLowerCase() === "success") {
            this.props.handleUrlEditor(response?.data);
          }
        } catch (error) {}
      }
    };
  };
  modules = {
    toolbar: {
      container: [
        ["bold", "italic", "underline", "strike", "blockquote"], // toggled buttons
        // ['blockquote', 'code-block'],
        //  [{ header: 1 }, { header: 2 }, { font: [] }], // custom button values
        [{ list: "ordered" }, { list: "bullet" }],
        //  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
        // [{ 'direction': 'rtl' }],                         // text direction
        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ header: [1, 2, 3, 4, 5, 6, true] }],
        // [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        //[{ 'font': [] }],
        //[{ 'align': [] }],
        // ["link",""image"", "video"],
        //   ["clean"], // remove formatting button
      ],
      // handlers: {
      //   image: this.quillImageCallback,
      // },
    },
    clipboard: {
      // toggle to add extra line breaks when pasting HTML:
      matchVisual: false,
    },
  };
  formats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    // "link",
    //"image",
    // "video",
    "color",
  ];
  render() {
    return (
      <EditorWrapper>
        <ReactQuill
          theme="snow"
          onChange={this.props.handleChangeEditor}
          // bounds={'.EditorComponent'}
          placeholder={this.props.placeholder}
          modules={this.modules}
          formats={this.formats}
          value={this.props.editorValue}
          readOnly={this.props.readOnly}
        />
      </EditorWrapper>
    );
  }
}
// const ReactQuillComponent = ({
//   placeholder,
//   editorValue,
//   handleChangeEditor,
//   handleUrlEditor,
// }) => {

//   return (
//     <EditorWrapper>
//       <ReactQuill
//         theme="snow"
//         onChange={handleChangeEditor}
//         // bounds={'.EditorComponent'}
//         placeholder={placeholder}
//         modules={ReactQuillComponent.modules}
//         formats={ReactQuillComponent.formats}
//         value={editorValue}
//       />
//     </EditorWrapper>
//   );
// };
// const quillImageCallback = () => {
//   const { getBase64_Params } = helperFunc;
//   const input = document.createElement("input");
//   input.setAttribute("type", "file");
//   input.setAttribute("accept", "image/*");
//   input.click();
//   input.onchange = async () => {
//     const file = input.files ? input.files[0] : null;
//     if (file) {
//       const photo = await getBase64_Params(file);
//       try {
//         const response = await callAPIAsync(
//           serviceType.COMMON,
//           "v1/common/uploadImage",
//           "POST",
//           { Image: photo }
//         );
//         if (response?.message.toLowerCase() === "success") {
//         }
//       } catch (error) {}
//     }
//   };
// };
export default ReactQuillComponent;
