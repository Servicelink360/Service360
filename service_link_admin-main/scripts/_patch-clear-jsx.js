const fs = require("fs");
const out = "src/containers/reports/new-reports.tsx";
let s = fs.readFileSync(out, "utf8");

const oldBlock = `{isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title={
                <span>
                  Clear all deleted reports?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    This hides them from your Deleted tab (soft clear). You can`;

const idx = s.indexOf(oldBlock);
if (idx < 0) {
  console.error("start block not found");
  process.exit(1);
}
const endNeedle = `                Clear deleted
              </Button>
            </Popconfirm>
          </div>
        ) : null}`;
const endIdx = s.indexOf(endNeedle, idx);
if (endIdx < 0) {
  console.error("end block not found");
  process.exit(1);
}
const end = endIdx + endNeedle.length;

const newBlock = `{isDeletedReportTab ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title={clearDeletedConfirmTitle}
              okText={clearDeletedConfirmOkText}
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
              </Button>
            </Popconfirm>
          </div>
        ) : null}`;

s = s.slice(0, idx) + newBlock + s.slice(end);
fs.writeFileSync(out, s, "utf8");
console.log("clear-deleted jsx replaced");
