const fs = require("fs");
const out = "src/containers/reports/new-reports.tsx";
let s = fs.readFileSync(out, "utf8");

const step = process.argv[2];

if (step === "consts") {
  s = s.replace(
    "  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows]);\n\n  const rowSelection = canUseBulkDelete",
    `  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows]);

  const clearDeletedConfirmTitle = isAdminUser
    ? "Permanently delete all reports on this page?"
    : "Clear all deleted reports? This hides them from your Deleted tab (soft clear). You cannot restore after clearing.";
  const clearDeletedConfirmOkText = isAdminUser ? "Delete permanently" : "Clear deleted";
  const clearDeletedButtonLabel = isAdminUser ? "Delete all on page" : "Clear deleted";

  const rowSelection = canUseBulkDelete`,
  );
}

if (step === "jsx") {
  s = s.replace(
    `        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title={
                <span>
                  Clear all deleted reports?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    This hides them from your Deleted tab (soft clear). You can`,
    `        {isDeletedReportTab ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title={clearDeletedConfirmTitle}`,
  );
  s = s.replace(
    /t restore after clearing\.[\s\S]*?>\s*Clear deleted\s*<\/Button>/,
    `              okText={clearDeletedConfirmOkText}
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
                {clearDeletedButtonLabel}
              </Button>`,
  );
}

if (step === "search") {
  s = s.replace(
    `            </Form.Item>
            {supportsTableSort && (showMobileCards || isMobilePortrait) ? (`,
    `            </Form.Item>
            <Form.Item label="Search" style={isMobilePortrait ? { width: "100%" } : undefined}>
              <Input
                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                allowClear
                placeholder="Job site or service"
                onChange={(e) => onListSearchInputChange(e.target.value)}
                onPressEnter={(e) => onListSearchInputSearch((e.target as HTMLInputElement).value)}
                style={isMobilePortrait || mobileUiDark ? { width: "100%" } : { minWidth: 220 }}
              />
            </Form.Item>
            {supportsTableSort && (showMobileCards || isMobilePortrait) ? (`,
  );
}

fs.writeFileSync(out, s, "utf8");
console.log("step", step, "done");
