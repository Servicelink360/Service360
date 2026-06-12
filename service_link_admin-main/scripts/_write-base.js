const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = execSync("git show HEAD:service_link_admin-main/src/containers/reports/new-reports.tsx", {
  cwd: path.join(__dirname, "../.."),
  encoding: "utf8",
});

s = s.replace(
  `const isAutoMergeTemplateField = (it: TemplateItem) =>
  AUTO_MERGE_FIELD_TYPES.has(String(it?.type || "").toUpperCase());

const resolveAutoMergeFieldValue`,
  `const isAutoMergeTemplateField = (it: TemplateItem) =>
  AUTO_MERGE_FIELD_TYPES.has(String(it?.type || "").toUpperCase());

const autoMergeUsesPicker = (it: TemplateItem, isStaffUser: boolean): boolean => {
  const t = String(it?.type || "").toUpperCase();
  if (t !== "[REPORT_DATE]" && t !== "[REPORT_TIME]") return false;
  if (!isStaffUser) return true;
  const visibleToStaff = it?.config?.visibleToStaff;
  if (typeof visibleToStaff === "boolean") return visibleToStaff;
  return true;
};

const resolveAutoMergeFieldValue`,
);
s = s.replace("  serviceId?: string;\n};", "  serviceId?: string;\n  keyword?: string;\n};");
s = s.replace(
  "const showReportDeletedTabs = isCustomerUser || isStaffUser;",
  "const showReportDeletedTabs = isCustomerUser || isStaffUser || isAdminUser;",
);
s = s.replace(
  "  const showMobileCards = useNarrowViewport();\n\n  useEffect(() => {",
  "  const showMobileCards = useNarrowViewport();\n  const tableSearchKeywordRef = useRef(\"\");\n  const listSearchDebounceRef = useRef(null);\n\n  useEffect(() => {",
);

fs.writeFileSync(out, s, "utf8");
console.log("wrote base", fs.statSync(out).size);
