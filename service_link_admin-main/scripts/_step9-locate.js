const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
const where = process.argv[2] || "before";
let s = fs.readFileSync(
  path.join(__dirname, "../src/containers/reports/new-reports-step7.tsx"),
  "utf8",
);

const block = `        {isDeletedReportTab && isAdminUser ? (
          <div>admin delete</div>
        ) : null}

`;

if (where === "before") {
  const needle =
    "        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (";
  s = s.replace(needle, block + needle);
} else if (where === "after") {
  const needle = `        ) : null}

        {showMobileCards ? (`;
  s = s.replace(needle, `        ) : null}

${block}        {showMobileCards ? (`);
} else if (where === "end") {
  s = s.replace(
    "export default NewReports;",
    `${block}export default NewReports;`,
  );
} else {
  console.error("unknown where", where);
  process.exit(1);
}

fs.writeFileSync(out, s, "utf8");
console.log("insert at", where);
