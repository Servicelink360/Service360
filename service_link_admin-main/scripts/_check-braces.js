const fs = require("fs");

function check(file) {
  const s = fs.readFileSync(file, "utf8");
  const lines = s.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/const NewReports|function NewReports/.test(lines[i])) {
      start = i;
      break;
    }
  }
  console.log(file, "component start", start + 1);
  let depth = 0;
  let inStr = null;
  let inTpl = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      const n = line[j + 1];
      if (inStr) {
        if (c === "\\" && n) {
          j++;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (inTpl) {
        if (c === "\\" && n) {
          j++;
          continue;
        }
        if (c === "`") inTpl--;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "`") {
        inTpl++;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}") depth--;
    }
    for (const ln of [1277, 3764, 4769]) {
      if (i + 1 === ln) console.log("depth at", ln, depth);
    }
    if (depth === 0 && i > start) {
      console.log("component ends at", i + 1);
      break;
    }
  }
}

check(process.argv[2] || "src/containers/reports/new-reports.tsx");
