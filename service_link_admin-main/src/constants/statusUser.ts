export enum StatusUser {
  D = "Delete",
  A = "Active",
  N = "New",
  I = "In Active",
}

export enum UserStatusCode {
  D = "D",
  A = "A",
  N = "N",
  I = "I",
}



export const dJobStatus = {
  NEW:0,
  COMPLETED: 1,
  PENDING: 2,
  INPROGRESS: 3,
  DELETED: 4,
}

export const ticketStatus = {
  NEW:0,
  COMPLETED: 1,
  PENDING: 2,
  INPROGRESS: 3,
}

export const reportFaultStatus = {
  NEW: 0,
  COMPLETED: 1,
  PENDING: 2,
  INPROGRESS: 3,
  DELETED: 4,
}

/** Who must act next on an in-progress report fault (not the same as userType). */
export const reportFaultSender = {
  CUSTOMER: 1,
  STAFF: 2,
  ADMIN: 3,
}

export enum userType {
  ADMIN=3,
  STAFF=2,
  CUSTOMER=1,
}

export const boolStatus = [{id:1,name:"Yes"},{id:2,name:"No"}]

export const reportTemplateTypes=[
  { id: 'TEXT', name: 'Text' },
  { id: 'TEXTAREA', name: 'Text Area' },
  { id: 'RICH_TEXT', name: 'Rich Text' },
  { id: 'NUMBER', name: 'Number' },
  { id: 'PERCENTAGE', name: 'Percentage' },
  { id: 'CURRENCY', name: 'Currency' },
  { id: 'DATE', name: 'Date' },
  { id: 'TIME', name: 'Time' },
  { id: 'YES_NO', name: 'Yes or No' },
  { id: 'SELECT', name: 'Select' },
  { id: 'CHECKLIST', name: 'Checklist' },
  { id: 'TABLE', name: 'Table' },
  { id: 'SIGNATURE', name: 'Signature' },
  { id: 'GPS', name: 'GPS Location' },
  { id: 'IMAGES', name: 'Images' },
  { id: 'VIDEOS', name: 'Video' },
  { id: '[REPORT_DATE]', name: '[Report date (YYYY-MM-DD)]' },
  { id: '[REPORT_TIME]', name: '[Report time (HH:mm:ss)]' },
  { id: '[SITE_NAME]', name: '[Site name]' },
  { id: '[SITE_ADDRESS]', name: '[Site address]' },
  { id: '[CUSTOMER_NAME]', name: '[Customer name]' },
  { id: '[REPORT_BY]', name: '[Report By]' },
]

export const reportTemplateCategories = [
  { id: 'CLEANING', name: 'Cleaning Services' },
  { id: 'MAINTENANCE', name: 'Maintenance' },
  { id: 'SECURITY', name: 'Security' },
  { id: 'LANDSCAPING', name: 'Landscaping' },
  { id: 'WASTE_MANAGEMENT', name: 'Waste Management' },
  { id: 'PUBLIC_AMENITIES', name: 'Public Amenities' },
  { id: 'INSPECTIONS', name: 'Inspections' },
  { id: 'INCIDENT', name: 'Incident Reports' },
  { id: 'GENERAL', name: 'General' },
]

export const TaskStatus = [{ id: 1, name: "Active" }, { id: 2, name: "Inactive" }]