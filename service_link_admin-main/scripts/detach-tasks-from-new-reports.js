const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../src/containers/reports/new-reports.tsx");
let s = fs.readFileSync(file, "utf8");

// Stray comment from bad slice
s = s.replace(
  /\/\*\* PDF URLs from the API[\s\S]*?\*\/\nconst staffPrimaryGreen/,
  "const staffPrimaryGreen",
);

s = s.replace(/getUserTaskPdfField/g, "getReportPdfField");

s = s.replace(
  /const markReportUnread = useCallback\(\s*async \(row: \{ id\?: number \}\) => \{[\s\S]*?\},\s*\[profileType, clearRowReadState, refreshDashboard\],\s*\);/,
  `const markReportUnread = useCallback(
    async (row: { id?: number }) => {
      const id = row?.id;
      if (!id) return;
      setMarkingUnreadId(+id);
      try {
        const res = await markCustomReportUnread(+id, +profileType);
        if (res?.code === 1) {
          clearRowReadState(+id);
          refreshDashboard();
          message.success("Marked as unread");
        } else {
          message.error(res?.message || "Could not mark as unread");
        }
      } finally {
        setMarkingUnreadId(null);
      }
    },
    [profileType, clearRowReadState, refreshDashboard],
  );`,
);

s = s.replace(
  /const markPath =\s*\n\s*\+profileType === userType\.ADMIN[\s\S]*?if \(!markPath\) return false;\s*\n\s*markReportOpenedInFlightRef\.current\.add\(id\);/,
  `if (![+userType.ADMIN, +userType.CUSTOMER, +userType.STAFF].includes(+profileType)) return false;

      markReportOpenedInFlightRef.current.add(id);`,
);

s = s.replace(
  /try \{\s*const res = await callAPIAsync\(serviceType\.COMMON, markPath, "PATCH", \{\}\);\s*if \(res\?\.code === 1\) \{\s*markReportOpenedDoneRef\.current\.add\(id\);\s*return true;\s*\}\s*return false;\s*\} finally \{\s*markReportOpenedInFlightRef\.current\.delete\(id\);\s*\}/,
  `try {
        const res = await markCustomReportOpened(id, +profileType);
        if (res?.code === 1) {
          markReportOpenedDoneRef.current.add(id);
          return true;
        }
        return false;
      } finally {
        markReportOpenedInFlightRef.current.delete(id);
      }`,
);

// loadDeletedReportCount
s = s.replace(
  /const loadDeletedReportCount = useCallback\(async \(filters: ListQueryFilters = listFilters\) => \{[\s\S]*?\}, \[showReportDeletedTabs, profileId, profileType, listFilters\]\);/,
  `const loadDeletedReportCount = useCallback(async (filters: ListQueryFilters = listFilters) => {
    if (!showReportDeletedTabs || !profileId) return;
    try {
      const staffId = +profileType === userType.STAFF ? +profileId : undefined;
      const n = await fetchCustomReportDeletedCount(filters, staffId);
      setDeletedReportCount(n);
    } catch {
      /* ignore */
    }
  }, [showReportDeletedTabs, profileId, profileType, listFilters]);`,
);

// loadRows inner fetch
s = s.replace(
  /const reportIdFromUrl = new URLSearchParams\(location\.search\)\.get\("reportId"\);\s*let params: Record<string, any>;\s*if \(reportIdFromUrl\) \{[\s\S]*?\}\s*const res = await callAPIAsync\(serviceType\.COMMON, `\$\{endPoint\.USER_TASKS\}\/getAllUserTasksByUserId`, "GET", params\);\s*let list = res\?\.code === 1 \? res\?\.data\?\.rows \|\| \[\] : \[\];\s*if \(reportIdFromUrl && list\.length === 0\) \{\s*const one = await callAPIAsync\([\s\S]*?if \(one\?\.code === 1 && one\?\.data\) list = \[one\.data\];\s*\}\s*setRows\(list\);\s*setCount\(reportIdFromUrl \? list\.length : res\?\.data\?\.count \|\| 0\);/,
  `const reportIdFromUrl = new URLSearchParams(location.search).get("reportId");
        let list: any[] = [];
        let total = 0;

        if (reportIdFromUrl) {
          const rid = +reportIdFromUrl;
          const listed = await fetchCustomReportsList({ reportId: rid });
          list = listed.rows;
          total = list.length;
          if (!list.length) {
            const one = await fetchCustomReportById(rid);
            if (one) list = [one];
            total = list.length;
          }
        } else {
          const listed = await fetchCustomReportsList({
            page: nextPage,
            limit: nextLimit,
            tab,
            staffId: profileId && +profileType === userType.STAFF ? +profileId : undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
            siteId: filters.siteId,
            serviceId: filters.serviceId,
            keyword: filters.keyword,
            sort: sort.orderBy ? sort : undefined,
          });
          list = listed.rows;
          total = listed.count;
        }

        setRows(list);
        setCount(reportIdFromUrl ? list.length : total);`,
);

// markAll opened
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/markAllNewReportsOpened`,\s*"PATCH",\s*\{\},\s*\);/,
  "const res = await markAllCustomReportsOpened();",
);

// view title
s = s.replace(
  /return fromTpl \|\| viewRow\.reportTemplate\?\.name \|\| viewRow\.taskName \|\| "Report";/,
  "return fromTpl || buildReportDisplayTitle(viewRow);",
);

// openEdit fetch
s = s.replace(
  /const one = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{row\.id\}`,\s*"GET",\s*\);\s*if \(one\?\.code === 1 && one\?\.data\) editRow = one\.data;/g,
  "const one = await fetchCustomReportById(+row.id);\n      if (one) editRow = one;",
);

// view refresh fetch
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{viewRow\.id\}`,\s*"GET",\s*\);\s*if \(res\?\.code === 1 && res\?\.data\) \{/,
  "const data = await fetchCustomReportById(+viewRow.id);\n        if (data) {",
);
s = s.replace(
  /setViewRow\(res\.data\);/g,
  "setViewRow(data);",
);

// Remove ensureAutoTaskName block and calls
s = s.replace(
  /\n  const ensureAutoTaskName = useCallback\(\(\) => \{[\s\S]*?\}, \[form, selectedTemplateName\]\);\n/,
  "\n",
);
s = s.replace(/\n    ensureAutoTaskName\(\);\n/g, "\n");
s = s.replace(/\n                ensureAutoTaskName\(\);\n/g, "\n");

// reportStaffId state - add after form declaration - find `const [form] = Form.useForm`
if (!s.includes("reportStaffId")) {
  s = s.replace(
    "const [form] = Form.useForm();",
    "const [form] = Form.useForm();\n  const [reportStaffId, setReportStaffId] = useState(0);",
  );
}

// openCreate - remove task fields
s = s.replace(
  /form\.setFieldsValue\(\{\s*notifiesStaff: 1,\s*staffId: isStaffUser && profile\?\.id \? \+profile\.id : 0,\s*\}\);/,
  "setReportStaffId(isStaffUser && profile?.id ? +profile.id : 0);",
);

// applyStaffSiteAssignment - use reportStaffId state
s = s.replace(
  /const formStaffId = form\.getFieldValue\("staffId"\);\s*if \(isAdminUser && formStaffId != null && formStaffId !== "" && \+formStaffId > 0\) \{\s*params\.staffId = \+formStaffId;\s*\}/,
  "if (isAdminUser && reportStaffId > 0) params.staffId = reportStaffId;",
);
s = s.replace(
  /staffId: isStaffUser && profile\?\.id \? \+profile\.id : undefined,/,
  "",
);
s = s.replace(
  /if \(a\.staffId != null && \+a\.staffId > 0\) \{\s*patch\.staffId = \+a\.staffId;\s*\} else if \(isStaffUser && profile\?\.id\) \{\s*patch\.staffId = \+profile\.id;\s*\}\s*form\.setFieldsValue\(patch\);/,
  `if (a.staffId != null && +a.staffId > 0) setReportStaffId(+a.staffId);
    else if (isStaffUser && profile?.id) setReportStaffId(+profile.id);
    form.setFieldsValue(patch);`,
);
s = s.replace(
  "}, [form, isAdminUser, isStaffUser, profile]);",
  "}, [form, isAdminUser, isStaffUser, profile, reportStaffId]);",
);

// openEdit setFieldsValue - remove task fields
s = s.replace(
  /taskName: editRow\.taskName,\s*description: editRow\.description,/,
  "description: editRow.description,",
);
s = s.replace(
  /staffId: editRow\.staffId \?\? \(profile\?\.id \? \+profile\.id : 0\),\s*serviceId:/,
  "serviceId:",
);
s = s.replace(
  /notifiesStaff: editRow\.notifiesStaff \?\? 1,\s*\}\);/,
  "});\n    setReportStaffId(editRow.staffId ?? (profile?.id ? +profile.id : 0));",
);

// submit payload block
s = s.replace(
  /const now = new Date\(\);\s*const startTime = editing\?\.startTime[\s\S]*?const payload = \{[\s\S]*?items,\s*\};/,
  `const payload = buildCustomReportSavePayload({
      values,
      items,
      profile,
      staffId: reportStaffId,
      editing,
      templateLabel: selectedTemplateName,
    });`,
);

s = s.replace(
  /if \(isAdminUser && !editing\) \{\s*const submitStaffId = values\.staffId != null && values\.staffId !== "" \? \+values\.staffId : 0;\s*if \(!Number\.isFinite\(submitStaffId\) \|\| submitStaffId <= 0\) \{\s*message\.error\("This job site has no staff assignment\. Choose another site or update the site setup\."\);\s*return;\s*\}\s*\}/,
  `if (isAdminUser && !editing && (!Number.isFinite(reportStaffId) || reportStaffId <= 0)) {
      message.error("This job site has no staff assignment. Choose another site or update the site setup.");
      return;
    }`,
);

s = s.replace(
  /if \(editing\?\.id\) \{\s*res = await callAPIAsync\(serviceType\.COMMON, `\$\{endPoint\.USER_TASKS\}\/updateCustomerReports\/\$\{editing\.id\}`, "PUT", payload\);\s*\} else \{\s*res = await callAPIAsync\(serviceType\.COMMON, `\$\{endPoint\.USER_TASKS\}\/createCustomerReports`, "POST", payload\);\s*\}/,
  `if (editing?.id) {
        res = await updateCustomReport(+editing.id, payload);
      } else {
        res = await createCustomReport(payload);
      }`,
);

s = s.replace(
  /if \(pgDetail\.includes\("uq_user_task_reports_task_name"\)\)/,
  "if (isDuplicateReportFieldNameError(res))",
);
s = s.replace(
  /const pg = res\?\.details\?\.pg;\s*const pgDetail = String\(pg\?\.detail \|\| res\?\.message \|\| ""\);\s*if \(isDuplicateReportFieldNameError\(res\)\)/,
  "if (isDuplicateReportFieldNameError(res))",
);

// canSoftDeleteReport
s = s.replace(
  /const canSoftDeleteReport = useCallback\(\s*\(row: any\) => \{[\s\S]*?\},\s*\[profileIdNum, profileTypeNum\],\s*\);/,
  `const canSoftDeleteReport = useCallback(
    (row: any) => canUserSoftDeleteCustomReport(row, profileIdNum, profileTypeNum),
    [profileIdNum, profileTypeNum],
  );`,
);

// delete restore clear
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{row\.id\}`,\s*"DELETE",\s*null,\s*\);/,
  "const res = await deleteCustomReport(+row.id);",
);
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{row\.id\}\/restore`,\s*"PATCH",\s*\{\},\s*\);/,
  "const res = await restoreCustomReport(+row.id);",
);
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{id\}\/restore`,\s*"PATCH",\s*\{\},\s*\);/g,
  "const res = await restoreCustomReport(id);",
);
s = s.replace(
  /const res: any = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/clear-deleted`,\s*"POST",\s*\{ ids \},?\s*\);/g,
  "const res: any = await clearDeletedCustomReports(ids);",
);
s = s.replace(
  /const res = await callAPIAsync\(\s*serviceType\.COMMON,\s*`\$\{endPoint\.USER_TASKS\}\/\$\{id\}`,\s*"DELETE",\s*null,\s*\);/g,
  "const res = await deleteCustomReport(id);",
);

// messages link
s = s.replace(
  /`<Link to=\{\`\/messages\?userTaskId=\$\{r\.id\}\`/,
  "<Link to={`/messages?reportId=${r.id}`",
);
s = s.replace(/userTaskId=\$\{r\.id\}/g, "reportId=${r.id}");

// hidden form fields
s = s.replace(/\n            <Form\.Item name="taskName" style=\{\{ display: "none" \}\}>[\s\S]*?<\/Form\.Item>\n/, "\n");
s = s.replace(/\n            <Form\.Item name="staffId" style=\{\{ display: "none" \}\}>[\s\S]*?<\/Form\.Item>\n/, "\n");
s = s.replace(/\n            <Form\.Item name="notifiesStaff" style=\{\{ display: "none" \}\}>[\s\S]*?<\/Form\.Item>\n/, "\n");
s = s.replace(/\n            \/\* taskName is required by API but hidden from staff UI \*\/\n/, "\n");
s = s.replace(/\n            \/\* notifiesStaff is required by API but hidden from staff UI \*\/\n/, "\n");

// Remove unused imports if possible
s = s.replace(
  "import { dateFormat, dateTimeFormat } from \"@app/config/data.config\";\nimport { AU_UTC_OFFSET, momentAu } from \"@app/library/helpers/australianDatetime\";\n",
  "import { dateFormat } from \"@app/config/data.config\";\n",
);

fs.writeFileSync(file, s, "utf8");
console.log("Patched new-reports.tsx");
