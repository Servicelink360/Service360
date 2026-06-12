const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");

let s = execSync("git show HEAD:service_link_admin-main/src/containers/reports/new-reports.tsx", {
  cwd: root,
  encoding: "utf8",
});

// only module-level autoMergeUsesPicker
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

fs.writeFileSync(out, s, "utf8");
execSync("npm run build", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
