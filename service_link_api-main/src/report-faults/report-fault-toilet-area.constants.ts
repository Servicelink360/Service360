export const PUBLIC_AMENITIES_CLEANING_SERVICE = 'Public Amenities Cleaning';

export function isPublicAmenitiesCleaningService(serviceName?: string | null): boolean {
  return (
    String(serviceName ?? '').trim().toLowerCase() ===
    PUBLIC_AMENITIES_CLEANING_SERVICE.toLowerCase()
  );
}
