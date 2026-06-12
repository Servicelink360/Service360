const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = fs.readFileSync(out, "utf8");

// Helper above NewReports component
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
}

s = s.replace(
  'import ReportListKeywordSearchBar from "./report-list-keyword-search-bar";',
  'import ReportListKeywordSearch from "./report-list-keyword-search";',
);

// Remove debounce cleanup effect (optional noise)
s = s.replace(
  `  useEffect(() => {
    return () => {
      if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMobilePortrait) setListFiltersOpen(true);
  }, [isMobilePortrait]);`,
  `  useEffect(() => {
    if (!isMobilePortrait) setListFiltersOpen(true);
  }, [isMobilePortrait]);`,
);

// Replace buildListFiltersSnapshot + useCallback applyKeywordFilter with plain handlers
const handlerBlock = `  const buildListFiltersSnapshot = useCallback(
    (keywordRaw: string) => {
      const v = listForm.getFieldsValue();
      const next: ListQueryFilters = {};
      if (v.dateRange?.[0] && v.dateRange?.[1]) {
        next.startDate = v.dateRange[0].format("YYYY-MM-DD");
        next.endDate = v.dateRange[1].format("YYYY-MM-DD");
      }
      if (v.siteId != null && v.siteId !== "") next.siteId = +v.siteId;
      if (v.serviceId != null && v.serviceId !== "") next.serviceId = String(v.serviceId);
      const kw = keywordRaw.trim();
      if (kw) next.keyword = kw;
      return next;
    },
    [listForm],
  );

  const applyListFiltersFromForm = async () => {
    try {
      await listForm.validateFields();
    } catch {
      /* keep filtering with current field values */
    }
    const next = buildListFiltersSnapshot(tableSearchKeywordRef.current);
    setListFilters(next);
    setPage(1);
  };

  const applyKeywordFilter = useCallback(
    (raw: string) => {
      tableSearchKeywordRef.current = raw;
      const next = buildListFiltersSnapshot(raw);
      setListFilters((prev) => {
        if (
          (prev.keyword || "").trim() === (next.keyword || "").trim() &&
          prev.startDate === next.startDate &&
          prev.endDate === next.endDate &&
          prev.siteId === next.siteId &&
          prev.serviceId === next.serviceId
        ) {
          return prev;
        }
        return next;
      });
      setPage(1);
    },
    [buildListFiltersSnapshot],
  );

  const onListSearchInputChange = (raw: string) => {
    tableSearchKeywordRef.current = raw;
    setListSearchDraft(raw);
    if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    if (!raw.trim()) {
      applyKeywordFilter(raw);
      return;
    }
    listSearchDebounceRef.current = setTimeout(() => applyKeywordFilter(raw), 250);
  };

  const onListSearchInputSearch = (raw: string) => {
    if (listSearchDebounceRef.current) {
      clearTimeout(listSearchDebounceRef.current);
      listSearchDebounceRef.current = null;
    }
    setListSearchDraft(raw);
    applyKeywordFilter(raw);
  };`;

const replacementHandlers = `  const applyListFiltersFromForm = async () => {
    try {
      await listForm.validateFields();
    } catch {
      /* keep filtering with current field values */
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
  };`;

if (!s.includes(handlerBlock)) {
  console.error("handler block not found");
  process.exit(1);
}
s = s.replace(handlerBlock, replacementHandlers);

// Replace displayRows useMemo with plain const
s = s.replace(
  `  const displayRows = useMemo(() => {
    const kw = listSearchDraft.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((r) => {
      const site = String(r.siteName || "").toLowerCase();
      const service = String(r.serviceName || "").toLowerCase();
      return site.includes(kw) || service.includes(kw);
    });
  }, [rows, listSearchDraft]);`,
  "  const displayRows = filterReportRowsByKeyword(rows, listSearchDraft);",
);

// Mobile: always-visible search in header row (in-place edit)
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
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
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

if (!s.includes(mobileHeaderOld)) {
  console.error("mobile header block not found");
  process.exit(1);
}
s = s.replace(mobileHeaderOld, mobileHeaderNew);

// Desktop search in form row; hide duplicate on mobile portrait
s = s.replace(
  `                <ReportListKeywordSearchBar
                  value={listSearchDraft}
                  disabled={bulkDeleting}
                  mobileUiDark={mobileUiDark}
                  isMobilePortrait={isMobilePortrait}
                  onChange={onListSearchInputChange}
                  onSearch={onListSearchInputSearch}
                />`,
  `{!isMobilePortrait ? (
                  <ReportListKeywordSearch
                    value={listSearchDraft}
                    disabled={bulkDeleting}
                    mobileUiDark={mobileUiDark}
                    isMobilePortrait={isMobilePortrait}
                    onChange={onListSearchInputChange}
                    onSearch={onListSearchInputSearch}
                  />
                ) : null}`,
);

fs.writeFileSync(out, s, "utf8");
console.log("fixed instant search", fs.statSync(out).size);
