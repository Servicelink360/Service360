const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = fs.readFileSync(out, "utf8");

function rep(from, to, label) {
  if (!s.includes(from)) {
    console.error("MISSING:", label);
    process.exit(1);
  }
  s = s.replace(from, to);
  console.log("ok:", label);
}

rep(
  `  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows]);

  const rowSelection = canUseBulkDelete`,
  `  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows]);

  const clearDeletedConfirmTitle = isAdminUser
    ? "Permanently delete all reports on this page?"
    : (
      <span>
        Clear all deleted reports?
        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
          This hides them from your Deleted tab (soft clear). You cannot restore after clearing.
        </div>
      </span>
    );
  const clearDeletedConfirmOkText = isAdminUser ? "Delete permanently" : "Clear deleted";
  const clearDeletedButtonLabel = isAdminUser ? "Delete all on page" : "Clear deleted";

  const rowSelection = canUseBulkDelete`,
  "clear-deleted-consts",
);

rep(
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
  "clear-deleted-jsx",
);

rep(
  `t restore after clearing.
                  </div>
                </span>
              }
              okText="Clear deleted"
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
                Clear deleted
              </Button>`,
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
  "clear-deleted-jsx-tail",
);

rep(
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
  "search-in-filter-form",
);

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
  "confirmDeleteViewReport",
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
  "confirmDeleteViewReport-success",
);

rep(
  `        message.success(isAdmin ? "Report deleted" : "Report moved to Deleted");
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not delete this report");
      }
    },
    [loadRows, page, limit, listFilters, profileType, refreshDashboard],
  );`,
  `        message.success(
          isAdmin
            ? isDeletedReportTab
              ? "Report permanently deleted"
              : "Report moved to Deleted"
            : "Report moved to Deleted",
        );
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters, listSort, reportListTab);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not delete this report");
      }
    },
    [loadRows, page, limit, listFilters, listSort, reportListTab, profileType, refreshDashboard, isDeletedReportTab],
  );`,
  "deleteReport",
);

rep(
  `            title={
              <span>
                Delete this report?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  This permanently removes the report and its submitted data.
                </div>
              </span>
            }
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteReport(r)}`,
  `            title={
              <span>
                {isDeletedReportTab ? "Permanently delete this report?" : "Delete this report?"}
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  {isDeletedReportTab
                    ? "This cannot be undone."
                    : "The report moves to Deleted. Permanently remove it from the Deleted tab."}
                </div>
              </span>
            }
            okText={isDeletedReportTab ? "Delete permanently" : "Delete"}
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteReport(r)}`,
  "admin-row-popconfirm",
);

fs.writeFileSync(out, s, "utf8");
console.log("finalized", fs.statSync(out).size);
