const authEndPoint = {
    GET_USER_BY_ID: 'v1/users/',

    REGISTER: 'v1/register',
    CHANGE_STATUS: 'v1/users/updateStatus/'

}

const profileEndPoint = {
    GET_USER_PROFILE: "v1/users/profile",
    CHANGE_PROFILE: "v1/users/changeProfile",
    CHANGE_PASSWORD: "v1/users/changePassword",
    UPDATE_NOTIFICATION_SETTINGS: "v1/users/notificationSettings",
}

const crmEndPoint = {
    JOB_SITES: 'v1/sites',
    JOBS: 'v1/user-tasks',
    PRODUCTS_INIT_DATA: 'v1/common/getInitData',
    COMMON: 'v1/common',
    USERS: 'v1/users',
    ROLES: 'v1/roles',
    TICKETS: 'v1/tickets',
    CUSTOMERS: 'v1/customers',
    SERVICES: 'v1/services',
    COMPANIES: 'v1/companies',
    POSITIONS: 'v1/positions',
    SHIFTS: 'v1/shifts',
    GROUPS: 'v1/groups',
    TASKS: 'v1/tasks',
    REPORT_TEMPLATES: 'v1/report-templates',
    SETTINGS: 'v1/settings/getSettingsAdmin',
    SETTINGS_UPDATE_BULK: 'v1/settings/updateBulk',
    USER_TASKS: 'v1/user-tasks',
    USER_DAILY_JOBS: 'v1/user-daily-jobs',
    REPORT_FAULTS: 'v1/report-faults',
    FAULT_ISSUES: 'v1/fault-issues',
    MESSAGES: 'v1/messages',
    /** Multipart upload (must match API UploadController version prefix). */
    UPLOAD_FILE: 'v1/uploadFile',
    
}

const endPoint = {
    ...authEndPoint,
    ...profileEndPoint,
    ...crmEndPoint

}
export default endPoint
