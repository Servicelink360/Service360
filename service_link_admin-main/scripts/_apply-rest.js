const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const adminDir = path.join(__dirname, "..");
const out = path.join(adminDir, "src/containers/reports/new-reports.tsx");

function mustReplace(s, from, to, label) {
  if (!s.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  return s.replace(from, to);
}

function build(name) {
  try {
    execSync("npm run build", { cwd: adminDir, stdio: "pipe" });
    console.log("OK", name);
    return true;
  } catch (e) {
    const text = (e.stdout || "") + (e.stderr || "");
    const t = text.match(/Line (\d+):.*conditionally/);
    console.log("FAIL", name, t ? t[0] : text.split("\n").slice(-3).join(" "));
    return false;
  }
}

let s = fs.readFileSync(out, "utf8");
console.log("start bytes", s.length);

// search handlers
s = mustReplace(s,
  `  const onListFilterSiteChange = async (siteId: number | undefined) => {
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
  };`,
  `  const applyListFiltersFromForm = async () => {
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
  };`,
  "search handlers",
);
fs.writeFileSync(out, s, "utf8");
if (!build("search")) process.exit(1);

// loadFilterServices if not present
if (!s.includes("loadFilterServices")) {
  s = mustReplace(s,
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
    "loadFilterServices",
  );
  fs.writeFileSync(out, s, "utf8");
  if (!build("loadFilterServices")) process.exit(1);
}

console.log("done partial apply");
