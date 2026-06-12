const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
const adminDir = path.join(__dirname, "..");

function head() {
  return execSync("git show HEAD:service_link_admin-main/src/containers/reports/new-reports.tsx", {
    cwd: root,
    encoding: "utf8",
  });
}

function tryBuild(s, name) {
  fs.writeFileSync(out, s, "utf8");
  try {
    execSync("npm run build", { cwd: adminDir, stdio: "pipe" });
    console.log("OK", name);
    return true;
  } catch (e) {
    const t = ((e.stdout || "") + (e.stderr || "")).match(/Line (\d+):.*conditionally/);
    console.log("FAIL", name, t ? t[0] : "other error");
    return false;
  }
}

let s = head();

// autoMerge
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
tryBuild(s, "autoMerge");

s = s.replace(
  "const showReportDeletedTabs = isCustomerUser || isStaffUser;",
  "const showReportDeletedTabs = isCustomerUser || isStaffUser || isAdminUser;",
);
tryBuild(s, "+adminTabs");

s = s.replace("  serviceId?: string;\n};", "  serviceId?: string;\n  keyword?: string;\n};");
tryBuild(s, "+keywordType");

s = s.replace(
  "  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);\n  const [bulkDeleting, setBulkDeleting]",
  "  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);\n  const tableSearchKeywordRef = useRef(\"\");\n  const [bulkDeleting, setBulkDeleting]",
);
tryBuild(s, "+searchRefBetweenUseState");

s = s.replace(
  "  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);\n  const tableSearchKeywordRef = useRef(\"\");\n  const [bulkDeleting, setBulkDeleting]",
  "  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);\n  const [bulkDeleting, setBulkDeleting]",
);
s = s.replace(
  "  const showMobileCards = useNarrowViewport();\n",
  "  const showMobileCards = useNarrowViewport();\n  const tableSearchKeywordRef = useRef(\"\");\n  const listSearchDebounceRef = useRef(null);\n",
);
tryBuild(s, "+searchRefAfterHooks");
