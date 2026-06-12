const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = execSync("git show HEAD:service_link_admin-main/src/containers/reports/new-reports.tsx", {
  cwd: path.join(__dirname, "../.."),
  encoding: "utf8",
});

s = s.replace(
  "  const showMobileCards = useNarrowViewport();\n\n  useEffect(() => {",
  "  const showMobileCards = useNarrowViewport();\n  const tableSearchKeywordRef = useRef(\"\");\n  const listSearchDebounceRef = useRef(null);\n\n  useEffect(() => {",
);

fs.writeFileSync(out, s, "utf8");
execSync("npm run build", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
