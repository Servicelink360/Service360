import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
  clipboard: { matchVisual: false },
};

const formats = [
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'align',
  'list',
  'bullet',
  'indent',
  'link',
];

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  /** Fires on every user edit for instant live preview (in addition to Form onChange). */
  onLiveChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export default function EmailRichEditor({
  value,
  onChange,
  onLiveChange,
  placeholder,
  minHeight = 100,
}: Props) {
  return (
    <div
      className="consumables-rich-editor"
      style={{ ['--editor-min-height' as string]: `${minHeight}px` }}
    >
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={(html, _delta, source) => {
          if (source === 'silent') return;
          onChange?.(html);
          onLiveChange?.(html);
        }}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
