const fs = require("fs");
const path = require("path");

const reportsDir = path.join(__dirname, "../src/containers/reports");
const mainPath = path.join(reportsDir, "new-reports.tsx");

let main = fs.readFileSync(mainPath, "utf8");

const fixes = [
  [/form keys \uFFFD duplicate/g, "form keys — duplicate"],
  [/photos 1\uFFFD80%, save report 80\uFFFD100%/g, "photos 1–80%, save report 80–100%"],
  [/Uploading\uFFFD/g, "Uploading…"],
  [/only \uFFFD resolve/g, "only — resolve"],
  [/from URL \uFFFD avoids/g, "from URL — avoids"],
  [/modal \uFFFD reference/g, "modal — reference"],
  [/card list \uFFFD \$dark/g, "card list — $dark"],
  [/Read \uFFFD click/g, "Read — click"],
  [/only \uFFFD not report/g, "only — not report"],
  [
    /unread first \? read first\), no \uFFFDclear sort\uFFFD/g,
    'unread first → read first), no "clear sort"',
  ],
  [/\.join\(" \uFFFD "\)/g, ".join(REPORT_LIST_SEP)"],
  [/\|\| "\uFFFD"/g, "|| EM_DASH"],
  [/return "\uFFFD"/g, "return EM_DASH"],
  [
    /<span style=\{\{ color: "#bfbfbf" \}\}>\uFFFD<\/span>/g,
    '<span style={{ color: "#bfbfbf" }}>{EM_DASH}</span>',
  ],
  [/You can\uFFFDt restore/g, "You can't restore"],
  [/>\s*\n\s*"\uFFFD"\s*\n\s*<\//g, ">\n                    {EM_DASH}\n                  </"],
];

for (const [re, rep] of fixes) {
  main = main.replace(re, rep);
}

const remaining = main.split("\n").filter((l) => l.includes("\uFFFD"));
if (remaining.length) {
  console.warn("Remaining corrupted lines:", remaining.length);
  remaining.slice(0, 5).forEach((l) => console.warn(l.slice(0, 100)));
}

const lines = main.split("\n");
const slice = (start, end) => lines.slice(start - 1, end).join("\n");

const fieldUtilsBody = [slice(36, 217), slice(388, 555)].join("\n")
  .replace(/^type TemplateItem/m, "export type TemplateItem");

const fieldUtils = `import moment from "moment";
import { fixTextEncoding } from "@app/library/report-templates/templateItemUtils";

/** Em dash placeholder for empty table / meta values. */
export const EM_DASH = "—";

${fieldUtilsBody}
`;

const uploadBody = slice(218, 387)
  .replace(/^const SUBMIT_PROGRESS_MEDIA_MAX/m, "export const SUBMIT_PROGRESS_MEDIA_MAX")
  .replace(/^const SUBMIT_PROGRESS_SAVE_START/m, "export const SUBMIT_PROGRESS_SAVE_START")
  .replace(/^const SUBMIT_PROGRESS_SAVE_CAP/m, "export const SUBMIT_PROGRESS_SAVE_CAP")
  .replace(/^const delay /m, "export const delay ")
  .replace(/^const TemplateImageUpload/m, "export const TemplateImageUpload")
  .replace(/^const TemplateVideoUpload/m, "export const TemplateVideoUpload")
  .replace(/^const TemplateFileUpload/m, "export const TemplateFileUpload");

const templateUploads = `import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import UploadImageMultil, { UploadImageMultilHandle } from "@app/components/common/upload-image-multi";
import endPoint from "@app/constants/endPoint";
import serviceType from "@app/constants/serviceType";
import { callAPIUploadAsync } from "@app/library/helpers/api";
import type { UploadFile } from "antd/es/upload/interface";
import { Button, message, Progress, Typography, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { parseMediaListValue } from "./new-reports-field-utils";

${uploadBody}
`;

const importBlock = `import {
  EM_DASH,
  TemplateItem,
  autoMergeUsesPicker,
  getOptions,
  getTemplateFieldKey,
  getTemplateLabel,
  getYesNoPreset,
  isAutoMergeTemplateField,
  isJunkTemplateField,
  isJsonMediaFieldType,
  isTimeLikeLabel,
  isTimeLikeTemplateItem,
  legacyFieldKey,
  matchReportItemForTemplate,
  mergeReportMediaRowsForForm,
  parseMediaListValue,
  parseReportItemValueForForm,
  reportFieldStorageKey,
  resolveAutoMergeFieldValue,
  serviceCandidatesForTemplateAtSite,
  templateMatchesSiteServices,
} from "./new-reports-field-utils";
import {
  SUBMIT_PROGRESS_MEDIA_MAX,
  SUBMIT_PROGRESS_SAVE_CAP,
  SUBMIT_PROGRESS_SAVE_START,
  TemplateFileUpload,
  TemplateImageUpload,
  TemplateVideoUpload,
  delay,
} from "./new-reports-template-uploads";
`;

const head = lines.slice(0, 35).join("\n");
let tail = lines.slice(555).join("\n");

// Remove duplicate InitData type if still in tail - line 556 was ListQueryFilters
// Remove unused UploadImageMultil import from main if only used in uploads
tail = tail
  .replace(
    'import UploadImageMultil, { UploadImageMultilHandle } from "@app/components/common/upload-image-multi";\n',
    "",
  )
  .replace('import type { UploadFile } from "antd/es/upload/interface";\n', "")
  .replace(/, Upload\b/g, (m, offset, s) => {
    // only remove Upload from antd import if UploadOutlined still used
    const chunk = s.slice(Math.max(0, offset - 200), offset + 50);
    return chunk.includes("Upload,") ? m : m;
  });

const legacyOld = `                  if (isJsonMediaFieldType(fieldType)) {
                    const multiple = fieldType === "IMAGES";
                    const UploadComp = multiple ? TemplateImageUpload : TemplateVideoUpload;
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <UploadComp />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "FILE") {`;

const legacyNew = `                  if (fieldType === "IMAGES" || fieldType === "PHOTOS") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateImageUpload multiple />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "PHOTO" || fieldType === "IMAGE") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateImageUpload multiple={false} />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "VIDEOS" || fieldType === "VIDEO") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateVideoUpload />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "FILE" || fieldType === "FILES" || fieldType === "UPLOAD") {`;

tail = tail.replace(legacyOld, legacyNew);

const newMain = `${head}\n${importBlock}\n${tail}`;

fs.writeFileSync(path.join(reportsDir, "new-reports-field-utils.ts"), fieldUtils, "utf8");
fs.writeFileSync(path.join(reportsDir, "new-reports-template-uploads.tsx"), templateUploads, "utf8");
fs.writeFileSync(mainPath, newMain, "utf8");

console.log("Wrote new-reports-field-utils.ts, new-reports-template-uploads.tsx, updated new-reports.tsx");
