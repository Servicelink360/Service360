export const PUBLIC_AMENITIES_CLEANING_SERVICE = 'Public Amenities Cleaning';

export const REPORT_FAULT_TOILET_AREA_OPTIONS = [
  { id: 'Male', name: 'Male' },
  { id: 'Female', name: 'Female' },
  { id: 'Unisex', name: 'Unisex' },
  { id: 'Disability toilet', name: 'Disability toilet' },
  { id: 'Other', name: 'Other' },
];

export function isPublicAmenitiesCleaningService(serviceName?: string | null): boolean {
  return String(serviceName ?? '').trim().toLowerCase() === PUBLIC_AMENITIES_CLEANING_SERVICE.toLowerCase();
}
