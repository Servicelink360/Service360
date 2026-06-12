const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
const step = process.argv[2];
let s = fs.readFileSync(out, "utf8");

function rep(from, to, label) {
  if (!s.includes(from)) {
    console.error("MISSING", label);
    process.exit(1);
  }
  s = s.replace(from, to);
}

if (step === "1") {
  rep(
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
    "1",
  );
}

if (step === "2") {
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
    "2",
  );
}

if (step === "3") {
  rep(
    "          if (filters.serviceId) params.serviceId = filters.serviceId;\n        }\n\n        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, \"GET\", params);",
    "          if (filters.serviceId) params.serviceId = filters.serviceId;\n          if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();\n        }\n\n        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, \"GET\", params);",
    "3",
  );
}

if (step === "4") {
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
    "4",
  );
}

if (step === "5") {
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
    "5",
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
    "5b",
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
    "5c",
  );
}

if (step === "6") {
  rep(
    "{isDeletedReportTab && (isCustomerUser || isStaffUser) && canSoftDeleteReport(r) ? (",
    "{isDeletedReportTab && canSoftDeleteReport(r) ? (",
    "6",
  );
}

if (step === "7") {
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
    "7",
  );
  rep(
    `                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  showSearch
                  optionFilterProp="label"
                  style={{`,
    `                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  onChange={(v) => void onListFilterServiceChange(v as string | undefined)}
                  showSearch
                  optionFilterProp="label"
                  style={{`,
    "7b",
  );
}

if (step === "8") {
  rep(
    `            <Typography.Text
              strong
              style={{
                marginRight: 4,
                color: mobileUiDark ? "#ffffff" : undefined,
              }}
            >
              Select reports:
            </Typography.Text>
            <div
              className={
                mobileUiDark ? "nr-bulk-select-wrap nr-dark-select-shell" : undefined
              }
            >
              <Select
                className={
                  mobileUiDark
                    ? "nr-mobile-dark-field nr-mobile-select-dark nr-bulk-select-dark"
                    : undefined
                }
                popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                mode="multiple"
                allowClear
                placeholder="Select one or more reports on this page"
                style={
                  showMobileCards || mobileUiDark
                    ? { width: "100%", maxWidth: "none" }
                    : { flex: "1 1 280px", minWidth: 220, maxWidth: 520 }
                }
                value={selectedRowKeys}
                onChange={(vals) => setSelectedRowKeys(vals)}
                options={reportSelectOptions}
                optionFilterProp="label"
                maxTagCount="responsive"
                disabled={bulkDeleting || listLoading || !reportSelectOptions.length}
              />
            </div>`,
    `            <Typography.Text
              strong
              style={{
                marginRight: 4,
                color: mobileUiDark ? "#ffffff" : undefined,
              }}
            >
              Search:
            </Typography.Text>
            <Input.Search
              className={mobileUiDark ? "nr-mobile-dark-field nr-bulk-select-dark" : undefined}
              allowClear
              placeholder="Search by job site or service"
              disabled={bulkDeleting}
              onChange={(e) => onListSearchInputChange(e.target.value)}
              onSearch={(v) => onListSearchInputSearch(v)}
              style={
                showMobileCards || mobileUiDark
                  ? { width: "100%", maxWidth: "none" }
                  : { flex: "1 1 280px", minWidth: 220, maxWidth: 520 }
              }
            />`,
    "8",
  );
}

if (step === "9") {
  rep(
    `        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (`,
    `        {isDeletedReportTab && isAdminUser ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title="Permanently delete all reports on this page?"
              okText="Delete permanently"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              disabled={clearingDeleted || listLoading || deletedReportCount === 0}
              onConfirm={clearDeletedReports}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={clearingDeleted}
                disabled={clearingDeleted || listLoading || deletedReportCount === 0}
                className={mobileUiDark ? "nr-mobile-bulk-remove-btn" : undefined}
              >
                Delete all on page
              </Button>
            </Popconfirm>
          </div>
        ) : null}
        {isDeletedReportTab && (isCustomerUser || isStaffUser) ? (`,
    "9",
  );
}

if (step === "10") {
  rep(
    `      title: isAdmin ? "Delete this report?" : "Remove this report from your list?",
      content: isAdmin
        ? "This permanently removes the report and its submitted data."
        : "The report moves to Deleted. You can restore it from the Deleted tab.",
      okText: isAdmin ? "Delete" : "Remove",`,
    `      title: isAdmin
        ? isDeletedReportTab
          ? "Permanently delete this report?"
          : "Delete this report?"
        : "Remove this report from your list?",
      content: isAdmin
        ? isDeletedReportTab
          ? "This cannot be undone."
          : "The report moves to Deleted. Permanently remove it from the Deleted tab."
        : "The report moves to Deleted. You can restore it from the Deleted tab.",
      okText: isAdmin ? (isDeletedReportTab ? "Delete permanently" : "Delete") : "Remove",`,
    "10",
  );
  rep(
    `          message.success(
            isAdmin ? "Report deleted" : "Report moved to Deleted",
          );
          setViewOpen(false);
          setViewRow(null);
          await loadRows(page, limit, listFilters);`,
    `          message.success(
            isAdmin
              ? isDeletedReportTab
                ? "Report permanently deleted"
                : "Report moved to Deleted"
              : "Report moved to Deleted",
          );
          setViewOpen(false);
          setViewRow(null);
          await loadRows(page, limit, listFilters, listSort, reportListTab);`,
    "10b",
  );
  rep(
    `        message.success(isAdmin ? "Report deleted" : "Report moved to Deleted");
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters);`,
    `        message.success(
          isAdmin
            ? isDeletedReportTab
              ? "Report permanently deleted"
              : "Report moved to Deleted"
            : "Report moved to Deleted",
        );
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters, listSort, reportListTab);`,
    "10c",
  );
  rep(
    "    [loadRows, page, limit, listFilters, profileType, refreshDashboard],\n  );\n\n  const restoreReport",
    "    [loadRows, page, limit, listFilters, listSort, reportListTab, profileType, refreshDashboard, isDeletedReportTab],\n  );\n\n  const restoreReport",
    "10d",
  );
}

if (step === "11") {
  rep(
    `                Delete this report?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  This permanently removes the report and its submitted data.
                </div>`,
    `                {isDeletedReportTab ? "Permanently delete this report?" : "Delete this report?"}
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  {isDeletedReportTab
                    ? "This cannot be undone."
                    : "The report moves to Deleted. Permanently remove it from the Deleted tab."}
                </div>`,
    "11",
  );
  rep(
    '            okText="Delete"\n            okButtonProps={{ danger: true }}\n            cancelText="Cancel"\n            onConfirm={() => deleteReport(r)}',
    '            okText={isDeletedReportTab ? "Delete permanently" : "Delete"}\n            okButtonProps={{ danger: true }}\n            cancelText="Cancel"\n            onConfirm={() => deleteReport(r)}',
    "11b",
  );
}

if (step === "12") {
  rep(
    `        {canUseBulkDelete ? (
          <div
            className={
              showMobileCards
                ? \`new-reports-bulk-bar--mobile\${mobileUiDark ? " new-reports-bulk-bar--dark" : ""}\`
                : undefined
            }`,
    `        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <Typography.Text strong style={{ color: mobileUiDark ? "#ffffff" : undefined }}>
            Search:
          </Typography.Text>
          <Input.Search
            className={mobileUiDark ? "nr-mobile-dark-field nr-bulk-select-dark" : undefined}
            allowClear
            placeholder="Search by job site or service"
            disabled={bulkDeleting}
            onChange={(e) => onListSearchInputChange(e.target.value)}
            onSearch={(v) => onListSearchInputSearch(v)}
            style={{ flex: "1 1 280px", minWidth: 220, maxWidth: 520 }}
          />
        </div>

        {canUseBulkDelete ? (
          <div
            className={
              showMobileCards
                ? \`new-reports-bulk-bar--mobile\${mobileUiDark ? " new-reports-bulk-bar--dark" : ""}\`
                : undefined
            }`,
    "12",
  );
}

if (!step) {
  console.error("usage: node _step.js <1-12>");
  process.exit(1);
}

fs.writeFileSync(out, s, "utf8");
console.log("applied step", step);
