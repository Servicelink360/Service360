import moment from "moment";
import endPoint from "@app/constants/endPoint";
import serviceType from "@app/constants/serviceType";
import { callAPIAsync } from "@app/library/helpers/api";
import { userType } from "../../constants/statusUser";

/** Backend stores custom reports on user_tasks; this module is the reports layer only. */
export const CUSTOM_REPORT_TYPE = "CUSTOM";

export type CustomReportListFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: number;
  serviceId?: string;
  keyword?: string;
};

export type CustomReportListSort = {
  orderBy?: string;
  orderValue?: string;
};

export type CustomReportListParams = CustomReportListFilters & {
  page?: number;
  limit?: number;
  tab?: "active" | "deleted";
  reportId?: number;
  staffId?: number;
  sort?: CustomReportListSort;
};

function listQueryParams(input: CustomReportListParams): Record<string, unknown> {
  if (input.reportId) {
    return {
      type: CUSTOM_REPORT_TYPE,
      reportId: +input.reportId,
      page: 1,
      limit: 1,
    };
  }

  const params: Record<string, unknown> = {
    type: CUSTOM_REPORT_TYPE,
    status: input.tab === "deleted" ? "deleted" : "s",
    page: input.page ?? 1,
    limit: input.limit ?? 100,
  };

  if (input.sort?.orderBy) {
    params.orderBy = input.sort.orderBy;
    params.orderValue = input.sort.orderValue;
  }
  if (input.staffId) params.staffId = input.staffId;
  if (input.startDate) params.startDate = input.startDate;
  if (input.endDate) params.endDate = input.endDate;
  if (input.siteId) params.siteId = input.siteId;
  if (input.serviceId) params.serviceId = input.serviceId;
  if (input.keyword?.trim()) params.keyword = input.keyword.trim();

  return params;
}

export async function fetchCustomReportsList(input: CustomReportListParams) {
  const res = await callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/getAllUserTasksByUserId`,
    "GET",
    listQueryParams(input),
  );
  if (res?.code !== 1) {
    return { rows: [] as any[], count: 0 };
  }
  return {
    rows: (res?.data?.rows || []) as any[],
    count: res?.data?.count || 0,
  };
}

export async function fetchCustomReportById(reportId: number) {
  const res = await callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/${reportId}`,
    "GET",
  );
  return res?.code === 1 ? res.data : null;
}

export async function fetchCustomReportDeletedCount(filters: CustomReportListFilters, staffId?: number) {
  const params: Record<string, unknown> = {
    type: CUSTOM_REPORT_TYPE,
    status: "deleted",
  };
  if (staffId) params.staffId = staffId;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.siteId) params.siteId = filters.siteId;
  if (filters.serviceId) params.serviceId = filters.serviceId;
  if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();

  const res = await callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/getCountUserTasksByUserId`,
    "GET",
    params,
  );
  if (res?.code !== 1) return 0;
  const n = typeof res.data === "number" ? res.data : +(res?.data?.count ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function generateAutoReportInternalName(templateLabel?: string): string {
  const base = String(templateLabel || "New Report").trim() || "New Report";
  return `${base} - ${moment().format("YYYY-MM-DD HH-mm-ss")}`;
}

export type BuildCustomReportSavePayloadInput = {
  values: Record<string, any>;
  items: any[];
  profile?: { id?: number };
  staffId: number;
  editing?: any | null;
  templateLabel?: string;
};

/** Maps report form values to the backend create/update DTO (task fields live here, not in UI). */
export function buildCustomReportSavePayload(input: BuildCustomReportSavePayloadInput) {
  const { values, items, profile, staffId, editing, templateLabel } = input;
  const now = new Date();
  const startTime = editing?.startTime ? new Date(editing.startTime) : now;
  const endTime = editing?.endTime ? new Date(editing.endTime) : now;
  const checkIn = editing?.checkIn ? new Date(editing.checkIn) : now;
  const completed = editing?.checkOut ? new Date(editing.checkOut) : now;

  const existingName = String(editing?.taskName || values.taskName || "").trim();
  const taskName =
    existingName || generateAutoReportInternalName(templateLabel);

  return {
    taskName,
    description: values.description || "",
    siteId: +values.siteId,
    siteName: values.siteName || "",
    siteLocation: values.siteLocation || "",
    siteAddress: values.siteAddress || "",
    staffId: staffId > 0 ? staffId : profile?.id ? +profile.id : 0,
    serviceId: values.serviceId || "",
    serviceName: values.serviceName || "",
    customerName: values.customerName || "",
    companyName: values.companyName || "",
    customerId: +values.customerId,
    startTime,
    endTime,
    checkIn,
    completed,
    status: 1,
    reportTemplateId: +values.reportTemplateId,
    notifiesStaff: editing?.notifiesStaff != null ? +editing.notifiesStaff : 1,
    items,
  };
}

export async function createCustomReport(payload: ReturnType<typeof buildCustomReportSavePayload>) {
  return callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/createCustomerReports`,
    "POST",
    payload,
  );
}

export async function updateCustomReport(
  reportId: number,
  payload: ReturnType<typeof buildCustomReportSavePayload>,
) {
  return callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/updateCustomerReports/${reportId}`,
    "PUT",
    payload,
  );
}

export async function deleteCustomReport(reportId: number) {
  return callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/${reportId}`, "DELETE", null);
}

export async function restoreCustomReport(reportId: number) {
  return callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/${reportId}/restore`,
    "PATCH",
    {},
  );
}

export async function clearDeletedCustomReports(ids: number[]) {
  return callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/clear-deleted`,
    "PATCH",
    { ids },
  );
}

export async function markAllCustomReportsOpened() {
  return callAPIAsync(
    serviceType.COMMON,
    `${endPoint.USER_TASKS}/markAllNewReportsOpened`,
    "PATCH",
    {},
  );
}

export async function markCustomReportOpened(reportId: number, viewerType: number) {
  const markPath =
    viewerType === userType.ADMIN
      ? `${endPoint.USER_TASKS}/markAdminOpened/${reportId}`
      : viewerType === userType.CUSTOMER
        ? `${endPoint.USER_TASKS}/markCustomerOpened/${reportId}`
        : viewerType === userType.STAFF
          ? `${endPoint.USER_TASKS}/markStaffOpened/${reportId}`
          : null;
  if (!markPath) return null;
  return callAPIAsync(serviceType.COMMON, markPath, "PATCH", {});
}

export async function markCustomReportUnread(reportId: number, viewerType: number) {
  const markPath =
    viewerType === userType.ADMIN
      ? `${endPoint.USER_TASKS}/markAdminUnread/${reportId}`
      : viewerType === userType.CUSTOMER
        ? `${endPoint.USER_TASKS}/markCustomerUnread/${reportId}`
        : null;
  if (!markPath) return null;
  return callAPIAsync(serviceType.COMMON, markPath, "PATCH", {});
}

export function isCustomReportRow(row: any): boolean {
  return String(row?.type || "").toUpperCase() === CUSTOM_REPORT_TYPE;
}

export function canUserSoftDeleteCustomReport(
  row: any,
  profileId: number,
  profileType: number,
): boolean {
  if (!profileId || !row?.id) return false;
  if (!isCustomReportRow(row)) return false;
  if (profileType === userType.ADMIN) return true;
  if (profileType === userType.CUSTOMER) {
    return +row.customerId === profileId || +row.createdBy === profileId;
  }
  if (profileType === userType.STAFF) {
    return +row.staffId === profileId && +row.createdBy === profileId;
  }
  return false;
}

export function isDuplicateReportFieldNameError(res: any): boolean {
  const pgDetail = String(res?.details?.pg?.detail || res?.message || "");
  return pgDetail.includes("uq_user_task_reports_task_name");
}
