const fs = require("fs");
const path = require("path");

const backup = path.join(
  __dirname,
  "../../service_link_admin-main - Copy (15)/src/containers/reports/new-reports.tsx",
);
const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");

if (!fs.existsSync(backup)) {
  console.error("Backup not found:", backup);
  process.exit(1);
}

let s = fs.readFileSync(backup, "utf8").replace(/\r\n/g, "\n");

function rep(from, to, label) {
  if (!s.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  s = s.replace(from, to);
  console.log("ok:", label);
}

// --- Deleted tab: all roles (backup only showed tabs for admin) ---
rep(
  "  const showReportDeletedTabs = isAdminUser;\n  const isDeletedReportTab = isAdminUser && reportListTab === \"deleted\";",
  "  const showReportDeletedTabs = isCustomerUser || isStaffUser || isAdminUser;\n  const isDeletedReportTab = showReportDeletedTabs && reportListTab === \"deleted\";",
  "deleted-tabs-all-roles",
);

// --- autoMerge moment fix (create report crash) ---
rep(
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
  "autoMergeUsesPicker",
);

rep(
  `        } else if (isAutoMergeTemplateField(it)) {
          const t = String(it.type || "").toUpperCase();
          const staffManual =
            isStaffUser &&
            (t === "[REPORT_DATE]" || t === "[REPORT_TIME]") &&
            !isHiddenFromStaffCreate(it);
          if (staffManual) {
            const current = baseValues[fieldKey];
            if (current === undefined || current === null || current === "") {
              patch[fieldKey] = moment();
            }
          } else {
            patch[fieldKey] = resolveAutoMergeFieldValue(it, baseValues, profile);
          }
        }`,
  `        } else if (isAutoMergeTemplateField(it)) {
          if (autoMergeUsesPicker(it, isStaffUser)) {
            const current = baseValues[fieldKey];
            if (current === undefined || current === null || current === "") {
              patch[fieldKey] = moment();
            }
          } else {
            patch[fieldKey] = resolveAutoMergeFieldValue(it, baseValues, profile);
          }
        }`,
  "applyTemplateFieldDefaults-autoMerge",
);

rep(
  `    templateItemsForSubmit.forEach((it, idx) => {
      if (!isAutoMergeTemplateField(it)) return;
      patch[getTemplateFieldKey(it, idx)] = resolveAutoMergeFieldValue(it, vals, profile);
    });
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [form, templateItemsForSubmit, profile]);`,
  `    templateItemsForSubmit.forEach((it, idx) => {
      if (!isAutoMergeTemplateField(it)) return;
      if (autoMergeUsesPicker(it, isStaffUser)) return;
      patch[getTemplateFieldKey(it, idx)] = resolveAutoMergeFieldValue(it, vals, profile);
    });
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [form, templateItemsForSubmit, profile, isStaffUser]);`,
  "refreshAutoMerge",
);

rep(
  `        if (isAutoMergeTemplateField(it)) {
          // If staff is allowed to manually pick report date/time, don't auto-fill here.
          const staffManual =
            isStaffUser &&
            (fieldType === "[REPORT_DATE]" || fieldType === "[REPORT_TIME]") &&
            !isHiddenFromStaffCreate(it);
          if (!staffManual) {
            raw = raw ?? resolveAutoMergeFieldValue(it, values, profile);
          }
        }`,
  `        if (isAutoMergeTemplateField(it)) {
          if (!autoMergeUsesPicker(it, isStaffUser)) {
            raw = raw ?? resolveAutoMergeFieldValue(it, values, profile);
          }
        }`,
  "submit-autoMerge",
);

// --- keyword filter type + helper ---
rep(
  "  serviceId?: string;\n};",
  "  serviceId?: string;\n  keyword?: string;\n};",
  "keyword-type",
);

if (!s.includes("function filterReportRowsByKeyword")) {
  s = s.replace(
    "const NewReports: React.FC = () => {",
    `function filterReportRowsByKeyword(rows: any[], draft: string): any[] {
  const kw = draft.trim().toLowerCase();
  if (!kw) return rows;
  return rows.filter((r) => {
    const site = String(r.siteName || "").toLowerCase();
    const service = String(r.serviceName || "").toLowerCase();
    return site.includes(kw) || service.includes(kw);
  });
}

const NewReports: React.FC = () => {`,
  );
  console.log("ok: filterReportRowsByKeyword");
}

rep(
  'import Layout from "@app/components/layout/Layout";',
  'import Layout from "@app/components/layout/Layout";\nimport ReportListKeywordSearch from "./report-list-keyword-search";',
  "import-search",
);

rep(
  "  const showMobileCards = useNarrowViewport();\n\n  useEffect(() => {",
  "  const showMobileCards = useNarrowViewport();\n  const tableSearchKeywordRef = useRef(\"\");\n  const listSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const [listSearchDraft, setListSearchDraft] = useState(\"\");\n\n  useEffect(() => {",
  "search-refs",
);

// --- loadFilterServices + deleted count ---
rep(
  `  const loadSites = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, \`\${endPoint.JOB_SITES}/getSites\`, "GET");
    setSites(res?.data || []);
  }, []);`,
  `  const loadFilterServices = useCallback(async (siteId?: number) => {
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

rep(
  `      const params: Record<string, unknown> = {
        type: "CUSTOM",
        status: "deleted",
        page: 1,
        limit: 1,
      };
      if (+profileType === userType.STAFF) params.staffId = +profileId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.siteId) params.siteId = filters.siteId;
      if (filters.serviceId) params.serviceId = filters.serviceId;
      const res = await callAPIAsync(
        serviceType.COMMON,
        \`\${endPoint.USER_TASKS}/getAllUserTasksByUserId\`,
        "GET",
        params,
      );
      if (res?.code === 1) setDeletedReportCount(res?.data?.count ?? 0);`,
  `      const params: Record<string, unknown> = {
        type: "CUSTOM",
        status: "deleted",
      };
      if (+profileType === userType.STAFF) params.staffId = +profileId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.siteId) params.siteId = filters.siteId;
      if (filters.serviceId) params.serviceId = filters.serviceId;
      if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();
      const res = await callAPIAsync(
        serviceType.COMMON,
        \`\${endPoint.USER_TASKS}/getCountUserTasksByUserId\`,
        "GET",
        params,
      );
      if (res?.code === 1) {
        const n = typeof res.data === "number" ? res.data : +(res?.data?.count ?? 0);
        setDeletedReportCount(Number.isFinite(n) ? n : 0);
      }`,
  "deleted-count",
);

rep(
  "          if (filters.serviceId) params.serviceId = filters.serviceId;\n        }\n\n        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, \"GET\", params);",
  "          if (filters.serviceId) params.serviceId = filters.serviceId;\n          if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();\n        }\n\n        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, \"GET\", params);",
  "loadRows-keyword",
);

// --- search handlers ---
rep(
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
    try {
      await listForm.validateFields();
    } catch {
      /* filter with current values */
    }
    const v = listForm.getFieldsValue();
    const next: ListQueryFilters = {};
    if (v.dateRange?.[0] && v.dateRange?.[1]) {
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
    setListFilters((prev) => {
      const prevKw = (prev.keyword || "").trim();
      if (kw === prevKw) return prev;
      const next = { ...prev };
      if (kw) next.keyword = kw;
      else delete next.keyword;
      return next;
    });
    setPage(1);
  };

  const onListSearchInputChange = (raw: string) => {
    setListSearchDraft(raw);
    tableSearchKeywordRef.current = raw;
    if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    if (!raw.trim()) {
      applyKeywordFilter(raw);
      return;
    }
    listSearchDebounceRef.current = setTimeout(() => applyKeywordFilter(raw), 200);
  };

  const onListSearchInputSearch = (raw: string) => {
    if (listSearchDebounceRef.current) {
      clearTimeout(listSearchDebounceRef.current);
      listSearchDebounceRef.current = null;
    }
    setListSearchDraft(raw);
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
  "search-handlers",
);

// --- date range + service onChange ---
rep(
  `            <Form.Item name="dateRange" label="Date from - Date to" style={isMobilePortrait ? { width: "100%" } : undefined}>
              <div className={mobileUiDark ? "nr-dark-picker-shell" : undefined}>
                <RangePicker
                  className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                  popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                  format="DD/MM/YYYY"
                  style={isMobilePortrait || mobileUiDark ? { width: "100%" } : undefined}
                />
              </div>
            </Form.Item>`,
  `            <Form.Item
              name="dateRange"
              label="Date from - Date to"
              className={mobileUiDark ? "nr-dark-picker-shell" : undefined}
              style={isMobilePortrait ? { width: "100%" } : undefined}
            >
              <RangePicker
                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                format="DD/MM/YYYY"
                style={isMobilePortrait || mobileUiDark ? { width: "100%" } : undefined}
                onChange={() => {
                  setTimeout(() => void applyListFiltersFromForm(), 0);
                }}
              />
            </Form.Item>`,
  "date-range",
);

rep(
  `                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  showSearch
                  optionFilterProp="label"`,
  `                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  onChange={(v) => void onListFilterServiceChange(v as string | undefined)}
                  showSearch
                  optionFilterProp="label"`,
  "service-onChange",
);

// --- instant display rows ---
rep(
  `  const canUseBulkDelete =
    (isDeletedReportTab && isAdminUser) ||
    (!isDeletedReportTab &&
      (+profileType === userType.ADMIN ||
        +profileType === userType.CUSTOMER ||
        +profileType === userType.STAFF));

  const deletableRowsOnPage = useMemo(`,
  `  const canUseBulkDelete =
    (isDeletedReportTab && isAdminUser) ||
    (!isDeletedReportTab &&
      (+profileType === userType.ADMIN ||
        +profileType === userType.CUSTOMER ||
        +profileType === userType.STAFF));

  const displayRows = filterReportRowsByKeyword(rows, listSearchDraft);

  const deletableRowsOnPage = useMemo(`,
  "displayRows",
);

// --- search UI: always visible on mobile (inside existing header div), desktop in filter row ---
const mobileHeaderOld = `          {isMobilePortrait ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: listFiltersOpen ? 12 : 16,
              }}
            >
              <Button
                type="default"
                className={mobileUiDark ? "nr-mobile-btn-dark" : undefined}
                icon={<FilterOutlined />}
                onClick={() => setListFiltersOpen((open) => !open)}
                style={{ flex: 1, ...mobileDarkBtnDefaultStyle }}
                aria-expanded={listFiltersOpen}
              >
                Filters {listFiltersOpen ? <UpOutlined /> : <DownOutlined />}
              </Button>
              {+profileType !== userType.CUSTOMER ? (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  style={staffPrimaryGreen}
                  onClick={openCreate}
                  loading={listLoading}
                >
                  New
                </Button>
              ) : null}
            </div>
          ) : null}`;

const mobileHeaderNew = `          {isMobilePortrait ? (
            <div style={{ marginBottom: listFiltersOpen ? 12 : 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <Button
                  type="default"
                  className={mobileUiDark ? "nr-mobile-btn-dark" : undefined}
                  icon={<FilterOutlined />}
                  onClick={() => setListFiltersOpen((open) => !open)}
                  style={{ flex: 1, ...mobileDarkBtnDefaultStyle }}
                  aria-expanded={listFiltersOpen}
                >
                  Filters {listFiltersOpen ? <UpOutlined /> : <DownOutlined />}
                </Button>
                {+profileType !== userType.CUSTOMER ? (
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    style={staffPrimaryGreen}
                    onClick={openCreate}
                    loading={listLoading}
                  >
                    New
                  </Button>
                ) : null}
              </div>
              <ReportListKeywordSearch
                value={listSearchDraft}
                disabled={bulkDeleting}
                mobileUiDark={mobileUiDark}
                isMobilePortrait={isMobilePortrait}
                onChange={onListSearchInputChange}
                onSearch={onListSearchInputSearch}
              />
            </div>
          ) : null}`;

rep(
  `            className={[
              isMobilePortrait && !listFiltersOpen ? "new-reports-list-filters-form--collapsed" : "",
              mobileUiDark ? "new-reports-list-filters-form--dark" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              isMobilePortrait && !listFiltersOpen
                ? { display: "none", marginBottom: 0 }
                : {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px 16px",
                    alignItems: "flex-end",
                    marginBottom: 16,
                  }
            }`,
  `            className={[
              isMobilePortrait && !listFiltersOpen ? "new-reports-list-filters-form--collapsed" : "",
              mobileUiDark ? "new-reports-list-filters-form--dark" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 16px",
              alignItems: "flex-end",
              marginBottom: 16,
            }}`,
  "collapsed-form-always-show-search",
);

rep(
  `            <Form.Item style={isMobilePortrait ? { width: "100%", marginBottom: 0 } : undefined}>
              <Space wrap style={isMobilePortrait ? { width: "100%", justifyContent: "flex-end" } : undefined}>
                <ReportListKeywordSearch`,
  `            <Form.Item
              className="nr-search-row"
              style={isMobilePortrait ? { width: "100%", marginBottom: 0 } : undefined}
            >
              <Space wrap style={isMobilePortrait ? { width: "100%", justifyContent: "flex-end" } : undefined}>
                <ReportListKeywordSearch`,
  "search-row-class",
);

rep(
  `              <Space wrap style={isMobilePortrait ? { width: "100%", justifyContent: "flex-end" } : undefined}>
                <Button type="primary" icon={<SearchOutlined />} style={staffPrimaryGreen} onClick={onSearchList}>
                  Search
                </Button>`,
  `              <Space wrap style={isMobilePortrait ? { width: "100%", justifyContent: "flex-end" } : undefined}>
                <ReportListKeywordSearch
                  value={listSearchDraft}
                  disabled={bulkDeleting}
                  mobileUiDark={mobileUiDark}
                  isMobilePortrait={isMobilePortrait}
                  onChange={onListSearchInputChange}
                  onSearch={onListSearchInputSearch}
                />
                <Button type="primary" icon={<SearchOutlined />} style={staffPrimaryGreen} onClick={onSearchList}>
                  Search
                </Button>`,
  "desktop-search",
);

rep(
  `            {!listLoading && rows.length === 0 ? (
              <Empty
                description={
                  isDeletedReportTab ? "No deleted reports" : "No reports found"
                }`,
  `            {!listLoading && displayRows.length === 0 ? (
              <Empty
                description={
                  listSearchDraft.trim()
                    ? "No reports match your search"
                    : isDeletedReportTab
                      ? "No deleted reports"
                      : "No reports found"
                }`,
  "mobile-empty",
);

rep(
  "                {rows.map(renderMobileReportCard)}",
  "                {displayRows.map(renderMobileReportCard)}",
  "mobile-rows",
);

rep(
  "            dataSource={rows}",
  "            dataSource={displayRows}",
  "table-rows",
);

fs.writeFileSync(out, s, "utf8");
console.log("restored and patched", fs.statSync(out).size, "bytes");
