const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = fs.readFileSync(out, "utf8");

const insert = `        {isDeletedReportTab && isAdminUser ? (
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

`;

const needle =
  "        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (";
if (!s.includes(needle)) {
  console.error("MISSING needle");
  process.exit(1);
}
s = s.replace(needle, insert + needle);
fs.writeFileSync(out, s, "utf8");
console.log("insert-only admin block applied");
