import { CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber } from 'antd';
import type { FormInstance } from 'antd/es/form';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmailRichEditor from './EmailRichEditor';

type Props = {
  emailForm: FormInstance;
  emailSaving: boolean;
  logoUploading: boolean;
  onSave: () => void;
  onRemoveLogo: () => void;
  logoUploadRequest: (opts: {
    file: string | Blob | File;
    onSuccess?: (body: unknown, xhr: XMLHttpRequest) => void;
    onError?: (error: Error) => void;
  }) => void;
};

const SAMPLE_ITEMS_TABLE = `<table class="consumables-email-preview__items">
  <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Stock code</th></tr></thead>
  <tbody><tr><td>Bin liners</td><td>1</td><td>pack</td><td>BL-001</td></tr></tbody>
</table>`;

const LOGO_W_MIN = 40;
const LOGO_H_MIN = 24;
const LOGO_MAX = 400;
const LOGO_W_DEFAULT = 140;
const LOGO_H_DEFAULT = 72;

function clampW(n: number) {
  return Math.min(LOGO_MAX, Math.max(LOGO_W_MIN, Math.round(n)));
}
function clampH(n: number) {
  return Math.min(LOGO_MAX, Math.max(LOGO_H_MIN, Math.round(n)));
}

function stripInternalTokens(html: string) {
  return String(html || '')
    .replace(/\{\{\s*logo\s*\}\}/gi, '')
    .replace(/\{\{\s*itemsTable\s*\}\}/gi, '');
}

function applyPreviewTokens(html: string) {
  return stripInternalTokens(html)
    .replace(/\{\{\s*customerName\s*\}\}/gi, 'Sample Client')
    .replace(/\{\{\s*companyName\s*\}\}/gi, 'Sample Company')
    .replace(/\{\{\s*siteName\s*\}\}/gi, 'Sample Site');
}

/** Quill size/align/font classes → inline styles so live preview + email clients show them. */
function quillHtmlForEmail(html: string) {
  return String(html || '').replace(/<([a-z0-9]+)([^>]*?)>/gi, (full, tag: string, attrs: string) => {
    const classMatch =
      attrs.match(/\sclass\s*=\s*"([^"]*)"/i) || attrs.match(/\sclass\s*=\s*'([^']*)'/i);
    if (!classMatch) return full;
    const classes = classMatch[1].split(/\s+/).filter(Boolean);
    const styles: string[] = [];
    const remaining: string[] = [];
    classes.forEach((c) => {
      switch (c) {
        case 'ql-size-small':
          styles.push('font-size:12px');
          break;
        case 'ql-size-large':
          styles.push('font-size:18px');
          break;
        case 'ql-size-huge':
          styles.push('font-size:32px');
          break;
        case 'ql-align-center':
          styles.push('text-align:center');
          break;
        case 'ql-align-right':
          styles.push('text-align:right');
          break;
        case 'ql-align-justify':
          styles.push('text-align:justify');
          break;
        case 'ql-align-left':
          styles.push('text-align:left');
          break;
        case 'ql-font-serif':
          styles.push('font-family:Georgia,Times New Roman,serif');
          break;
        case 'ql-font-monospace':
          styles.push('font-family:Courier New,Courier,monospace');
          break;
        default:
          if (!c.startsWith('ql-')) remaining.push(c);
      }
    });
    if (!styles.length) return full;
    let nextAttrs = attrs;
    if (remaining.length) {
      nextAttrs = nextAttrs.replace(classMatch[0], ` class="${remaining.join(' ')}"`);
    } else {
      nextAttrs = nextAttrs.replace(classMatch[0], '');
    }
    const styleMatch = nextAttrs.match(/\sstyle\s*=\s*"([^"]*)"/i);
    const merged = styles.join(';');
    if (styleMatch) {
      const existing = String(styleMatch[1] || '').replace(/;?\s*$/, '');
      nextAttrs = nextAttrs.replace(
        styleMatch[0],
        ` style="${existing ? `${existing};` : ''}${merged}"`,
      );
    } else {
      nextAttrs += ` style="${merged}"`;
    }
    return `<${tag}${nextAttrs}>`;
  });
}

function previewRichHtml(html: string) {
  return quillHtmlForEmail(applyPreviewTokens(html));
}

function LiveRichField({
  value,
  onChange,
  onLive,
  minHeight,
  placeholder,
}: {
  value?: string;
  onChange?: (html: string) => void;
  onLive: (html: string) => void;
  minHeight: number;
  placeholder?: string;
}) {
  return (
    <EmailRichEditor
      value={value}
      minHeight={minHeight}
      placeholder={placeholder}
      onChange={(html) => {
        onChange?.(html);
        onLive(html);
      }}
    />
  );
}

type Edge = 'e' | 'w' | 'n' | 's' | 'se' | 'sw' | 'ne' | 'nw';

function clampSize(width: number, _height: number, aspect: number) {
  const ax = aspect > 0.05 ? aspect : LOGO_W_DEFAULT / LOGO_H_DEFAULT;
  let w = Math.round(width);
  let h = Math.round(w / ax);
  if (h > LOGO_MAX) {
    h = LOGO_MAX;
    w = Math.round(h * ax);
  }
  if (h < LOGO_H_MIN) {
    h = LOGO_H_MIN;
    w = Math.round(h * ax);
  }
  if (w > LOGO_MAX) {
    w = LOGO_MAX;
    h = Math.round(w / ax);
  }
  if (w < LOGO_W_MIN) {
    w = LOGO_W_MIN;
    h = Math.round(w / ax);
  }
  return { width: clampW(w), height: clampH(h) };
}

function ResizableLogo({
  src,
  width,
  height,
  onSizeChange,
  onPick,
  onRemove,
  uploading,
}: {
  src: string;
  width: number;
  height: number;
  onSizeChange: (size: { width: number; height: number }) => void;
  onPick: () => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const dragRef = useRef<{
    edge: Edge;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspect: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [aspect, setAspect] = useState(() =>
    height > 0 ? width / height : LOGO_W_DEFAULT / LOGO_H_DEFAULT,
  );
  const onSizeChangeRef = useRef(onSizeChange);
  onSizeChangeRef.current = onSizeChange;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const nextAspect = img.naturalWidth / img.naturalHeight;
    setAspect(nextAspect);
    // Sync height to natural aspect from current width so vertical scale matches.
    const synced = clampSize(width, Math.round(width / nextAspect), nextAspect);
    if (synced.width !== width || synced.height !== height) {
      onSizeChangeRef.current(synced);
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const ax = d.aspect > 0 ? d.aspect : aspectRef.current;
      let nextW = d.startW;
      let nextH = d.startH;

      if (d.edge === 'e' || d.edge === 'w') {
        const delta = d.edge === 'e' ? e.clientX - d.startX : d.startX - e.clientX;
        nextW = d.startW + delta;
        nextH = nextW / ax;
      } else if (d.edge === 'n' || d.edge === 's') {
        const delta = d.edge === 's' ? e.clientY - d.startY : d.startY - e.clientY;
        nextH = d.startH + delta;
        nextW = nextH * ax;
      } else {
        // Corners: use the dominant delta so both axes move.
        const dx =
          d.edge === 'se' || d.edge === 'ne' ? e.clientX - d.startX : d.startX - e.clientX;
        const dy =
          d.edge === 'se' || d.edge === 'sw' ? e.clientY - d.startY : d.startY - e.clientY;
        if (Math.abs(dx) >= Math.abs(dy)) {
          nextW = d.startW + dx;
          nextH = nextW / ax;
        } else {
          nextH = d.startH + dy;
          nextW = nextH * ax;
        }
      }

      onSizeChangeRef.current(clampSize(nextW, nextH, ax));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const startDrag = (edge: Edge) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
      aspect: aspectRef.current,
    };
    setDragging(true);
  };

  return (
    <div
      className={`consumables-email-logo-resize${dragging ? ' is-dragging' : ''}`}
      style={{ width, height }}
    >
      <button
        type="button"
        className="consumables-email-preview__logo-btn"
        disabled={uploading}
        title="Change logo"
        onClick={onPick}
      >
        <img src={src} alt="" draggable={false} onLoad={onImgLoad} />
      </button>
      <button
        type="button"
        className="consumables-email-preview__logo-x"
        aria-label="Remove logo"
        title="Remove logo"
        disabled={uploading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      >
        <CloseOutlined />
      </button>
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--w"
        onPointerDown={startDrag('w')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--e"
        onPointerDown={startDrag('e')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--n"
        onPointerDown={startDrag('n')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--s"
        onPointerDown={startDrag('s')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--nw"
        onPointerDown={startDrag('nw')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--ne"
        onPointerDown={startDrag('ne')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--sw"
        onPointerDown={startDrag('sw')}
        title="Drag to resize"
      />
      <span
        className="consumables-email-logo-resize__handle consumables-email-logo-resize__handle--se"
        onPointerDown={startDrag('se')}
        title="Drag to resize"
      />
    </div>
  );
}

export default function EmailTemplateEditor({
  emailForm,
  emailSaving,
  logoUploading,
  onSave,
  onRemoveLogo,
  logoUploadRequest,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logoUrl = Form.useWatch('logoUrl', emailForm);
  const logoWidthWatch = Form.useWatch('logoWidth', emailForm);
  const logoHeightWatch = Form.useWatch('logoHeight', emailForm);
  const headingText = Form.useWatch('headingText', emailForm);
  const introText = Form.useWatch('introText', emailForm);
  const closingText = Form.useWatch('closingText', emailForm);
  const signatureHtml = Form.useWatch('signatureHtml', emailForm);

  const [live, setLive] = useState({
    headingText: '<p>Consumables delivery</p>',
    introText: '',
    closingText: '',
    signatureHtml: '',
    logoUrl: '',
    logoWidth: LOGO_W_DEFAULT,
    logoHeight: LOGO_H_DEFAULT,
  });

  useEffect(() => {
    setLive({
      headingText: headingText || '<p>Consumables delivery</p>',
      introText: introText || '',
      closingText: closingText || '',
      signatureHtml: signatureHtml || '',
      logoUrl: logoUrl || '',
      logoWidth: clampW(Number(logoWidthWatch) || LOGO_W_DEFAULT),
      logoHeight: clampH(Number(logoHeightWatch) || LOGO_H_DEFAULT),
    });
  }, [
    headingText,
    introText,
    closingText,
    signatureHtml,
    logoUrl,
    logoWidthWatch,
    logoHeightWatch,
  ]);

  const setLogoSize = useCallback(
    (size: { width: number; height: number }) => {
      const width = clampW(size.width);
      const height = clampH(size.height);
      emailForm.setFieldsValue({ logoWidth: width, logoHeight: height });
      setLive((s) => ({ ...s, logoWidth: width, logoHeight: height }));
    },
    [emailForm],
  );

  const previewHtml = useMemo(() => {
    const w = live.logoWidth;
    const h = live.logoHeight;
    const logo = live.logoUrl
      ? `<img src="${live.logoUrl}" alt="" width="${w}" height="${h}" style="width:${w}px;height:${h}px;object-fit:contain;max-width:100%;display:block;margin:12px 0 8px;border:0;" />`
      : '';
    return [
      previewRichHtml(live.introText) ||
        '<p style="color:#9ca3af">Intro appears here</p>',
      SAMPLE_ITEMS_TABLE,
      previewRichHtml(live.closingText) ||
        '<p style="color:#9ca3af">Closing appears here</p>',
      logo,
      previewRichHtml(live.signatureHtml) ||
        '<p style="color:#9ca3af">Signature appears here</p>',
    ].join('');
  }, [live]);

  const pickLogo = () => {
    if (logoUploading) return;
    fileRef.current?.click();
  };

  const onLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void logoUploadRequest({ file });
  };

  return (
    <div className="consumables-email-template consumables-email-template--live consumables-email-template--compact">
      <section className="consumables-card">
        <header className="consumables-card__head">
          <div>
            <h3>Email body and signature</h3>
            <p>Edits update the live preview on the right as you type.</p>
          </div>
        </header>
        <div className="consumables-card__body">
          <Form form={emailForm} layout="vertical" requiredMark="optional">
            <Form.Item name="logoUrl" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="logoWidth" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="logoHeight" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item
              name="headingText"
              label="Email heading"
              className="consumables-email-field"
              trigger="onChange"
              getValueFromEvent={(html: string) => html}
            >
              <LiveRichField
                minHeight={56}
                placeholder="Consumables delivery"
                onLive={(html) => setLive((s) => ({ ...s, headingText: html }))}
              />
            </Form.Item>
            <Form.Item
              name="introText"
              label="Intro text"
              extra="Tokens: {{customerName}} {{companyName}} {{siteName}}"
              className="consumables-email-field"
              trigger="onChange"
              getValueFromEvent={(html: string) => html}
            >
              <LiveRichField
                minHeight={80}
                placeholder="Please find the consumables list below."
                onLive={(html) => setLive((s) => ({ ...s, introText: html }))}
              />
            </Form.Item>
            <Form.Item
              name="closingText"
              label="Closing text"
              className="consumables-email-field"
              trigger="onChange"
              getValueFromEvent={(html: string) => html}
            >
              <LiveRichField
                minHeight={80}
                placeholder="If you have any questions, reply to this email..."
                onLive={(html) => setLive((s) => ({ ...s, closingText: html }))}
              />
            </Form.Item>
            <Form.Item
              name="signatureHtml"
              label="Company signature"
              extra="Brand, contact details, and company description"
              className="consumables-email-field"
              style={{ marginBottom: 12 }}
              trigger="onChange"
              getValueFromEvent={(html: string) => html}
            >
              <LiveRichField
                minHeight={160}
                placeholder="Company name, contact details, and description..."
                onLive={(html) => setLive((s) => ({ ...s, signatureHtml: html }))}
              />
            </Form.Item>
            <div className="consumables-email-logo-row">
              <span className="consumables-email-logo-row__label">Logo</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onLogoFile}
              />
              <div className="consumables-email-preview__logo-wrap">
                {live.logoUrl ? (
                  <>
                    <ResizableLogo
                      src={live.logoUrl}
                      width={live.logoWidth}
                      height={live.logoHeight}
                      onSizeChange={setLogoSize}
                      onPick={pickLogo}
                      onRemove={onRemoveLogo}
                      uploading={logoUploading}
                    />
                    <span className="consumables-email-logo-resize__hint">
                      {`Drag any side or corner - ${live.logoWidth} x ${live.logoHeight}px`}
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    className="consumables-email-preview__logo-btn"
                    disabled={logoUploading}
                    title="Add logo"
                    onClick={pickLogo}
                  >
                    <span className="consumables-email-preview__logo-ph">
                      {logoUploading ? '�' : <UploadOutlined />}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </Form>
        </div>
      </section>

      <section className="consumables-card consumables-email-live">
        <header className="consumables-card__head">
          <div>
            <h3>Live preview</h3>
            <p>Actual email width (~600px), as in the inbox.</p>
          </div>
        </header>
        <div className="consumables-card__body consumables-email-live__stage">
          <div className="consumables-email-preview consumables-email-preview--full" aria-label="Email preview">
            <div className="consumables-email-preview__message">
              <div
                className="consumables-email-preview__title"
                dangerouslySetInnerHTML={{
                  __html:
                    previewRichHtml(live.headingText) ||
                    '<p>Consumables delivery</p>',
                }}
              />
              <p>Hello Sample Client,</p>
              <p>
                <strong>Site:</strong> Sample Site
              </p>
              <div
                className="consumables-email-preview__html"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="consumables-actions">
        <Button type="primary" loading={emailSaving} onClick={onSave}>
          Save template
        </Button>
      </div>
    </div>
  );
}
