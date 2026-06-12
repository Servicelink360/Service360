const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const adminDir = path.join(__dirname, "..");
const out = path.join(adminDir, "src/containers/reports/new-reports.tsx");

function build(name) {
  try {
    execSync("npm run build", { cwd: adminDir, stdio: "pipe" });
    console.log("OK", name);
    return true;
  } catch (e) {
    const t = ((e.stdout || "") + (e.stderr || "")).match(/Line (\d+):.*conditionally/);
    console.log("FAIL", name, t ? t[0] : "build error");
    return false;
  }
}

function base() {
  return execSync("git show HEAD:service_link_admin-main/src/containers/reports/new-reports.tsx", {
    cwd: path.join(__dirname, "../.."),
    encoding: "utf8",
  });
}

function write(s) {
  fs.writeFileSync(out, s, "utf8");
}

// Start with all safe module + ref changes
let s = base();
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
write(s);
if (!build("base")) process.exit(1);

// loadFilterServices
s = s.replace(
  `  const loadInit = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      \`\${endPoint.PRODUCTS_INIT_DATA}?items=REPORT_TEMPLATES\`,
      "GET",
    );
    setInit((res?.data || {}) as InitData);
  }, []);

  const loadSites = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, \`\${endPoint.JOB_SITES}/getSites\`, "GET");
    setSites(res?.data || []);
  }, []);`,
  `  const loadInit = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      \`\${endPoint.PRODUCTS_INIT_DATA}?items=REPORT_TEMPLATES\`,
      "GET",
    );
    setInit((res?.data || {}) as InitData);
  }, []);

  const loadFilterServices = useCallback(async (siteId?: number) => {
    const params: Record<string, number> = {};
    if (siteId != null && +siteId > 0) params.siteId = +siteId;
    const res = await callAPIAsync(
      serviceType.COMMON,
      \`\${endPoint.JOB_SITES}/getServicesBySite\`,
      "GET",
      params,
    );
    setFilterServices(res?.data || []);
  }, []);

  const loadSites = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, \`\${endPoint.JOB_SITES}/getSites\`, "GET");
    setSites(res?.data || []);
    await loadFilterServices();
  }, [loadFilterServices]);`,
);
write(s);
if (!build("+loadFilterServices")) process.exit(1);

// search handlers plain
const searchFrom = `  const onListFilterSiteChange = async (siteId: number | undefined) => {
    listForm.setFieldsValue({ serviceId: undefined });
    if (!siteId) {
      setFilterServices([]);
      return;
    }
    const res = await callAPIAsync(serviceType.COMMON, \`\${endPoint.JOB_SITES}/getServicesBySite\`, "GET", { siteId });
    setFilterServices(res?.data || []);
  };

  const onSearchList = async () => {
    const v = await listForm.validateFields();
    const next: ListQueryFilters = {};
    if (v.dateRange?.[0] && v.dateRange[1]) {
      next.startDate = v.dateRange[0].format("YYYY-MM-DD");
      next.endDate = v.dateRange[1].format("YYYY-MM-DD");
    }
    if (v.siteId != null && v.siteId !== "") next.siteId = +v.siteId;
    if (v.serviceId != null && v.serviceId !== "") next.serviceId = String(v.serviceId);
    setListFilters(next);
    setPage(1);
  };`;

const searchTo = `  const applyListFiltersFromForm = async () => {
    const v = await listForm.validateFields();
    const next: ListQueryFilters = {};
    if (v.dateRange?.[0] && v.dateRange[1]) {
      next.startDate = v.dateRange[0].format("YYYY-MM-DD");
      next.endDate = v.dateRange[1].format("YYYY-MM-DD");
    }
    if (v.siteId != null && v.siteId !== "") next.siteId = +v.siteId;
    if (v.serviceId != null && v.serviceId !== "") next.serviceId = String(v.serviceId);
    const kw = tableSearchKeywordRef.current.trim();
    if (kw) next.keyword = kw;
    setListFilters(next);
    setPage(1);
  };

  const applyKeywordFilter = (raw: string) => {
    tableSearchKeywordRef.current = raw;
    const kw = raw.trim();
    let changed = false;
    setListFilters((prev) => {
      const prevKw = (prev.keyword || "").trim();
      if (kw === prevKw) return prev;
      changed = true;
      const next = { ...prev };
      if (kw) next.keyword = kw;
      else delete next.keyword;
      return next;
    });
    if (changed) setPage(1);
  };

  const onListSearchInputChange = (raw: string) => {
    tableSearchKeywordRef.current = raw;
    if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    listSearchDebounceRef.current = setTimeout(() => applyKeywordFilter(raw), 400);
  };

  const onListSearchInputSearch = (raw: string) => {
    if (listSearchDebounceRef.current) {
      clearTimeout(listSearchDebounceRef.current);
      listSearchDebounceRef.current = null;
    }
    applyKeywordFilter(raw);
  };

  const onListFilterSiteChange = async (siteId: number | undefined) => {
    listForm.setFieldsValue({ siteId: siteId ?? undefined, serviceId: undefined });
    await loadFilterServices(siteId);
    await applyListFiltersFromForm();
  };

  const onListFilterServiceChange = async (serviceId?: string) => {
    listForm.setFieldsValue({ serviceId: serviceId ?? undefined });
    await applyListFiltersFromForm();
  };

  const onSearchList = async () => {
    await applyListFiltersFromForm();
  };`;

if (!s.includes(searchFrom)) {
  console.error("searchFrom missing");
  process.exit(1);
}
s = s.replace(searchFrom, searchTo);
write(s);
if (!build("+searchHandlers")) process.exit(1);

console.log("all incremental steps passed");
