const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
const variant = process.argv[2] || "minimal";
let s = fs.readFileSync(
  path.join(__dirname, "../src/containers/reports/new-reports-step7.tsx"),
  "utf8",
);

const blocks = {
  minimal: `        {isDeletedReportTab && isAdminUser ? (
          <div>admin delete</div>
        ) : null}

`,
  popconfirm: `        {isDeletedReportTab && isAdminUser ? (
          <Popconfirm title="x" onConfirm={clearDeletedReports}>
            <Button>Delete</Button>
          </Popconfirm>
        ) : null}

`,
  profileType: `        {isDeletedReportTab && (+profileType === userType.ADMIN) ? (
          <div>admin delete</div>
        ) : null}

`,
};

const insert = blocks[variant];
if (!insert) {
  console.error("unknown variant", variant);
  process.exit(1);
}

const needle =
  "        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (";
s = s.replace(needle, insert + needle);
fs.writeFileSync(out, s, "utf8");
console.log("applied variant", variant);
