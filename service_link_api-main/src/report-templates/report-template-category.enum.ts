export type ReportTemplateCategoryOption = {
  id: string
  name: string
}

export const DEFAULT_REPORT_TEMPLATE_CATEGORIES: ReportTemplateCategoryOption[] = [
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
