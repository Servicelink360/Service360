/** Sentinel site id for free-text “Other sites” on report fault create. */
export const OTHER_SITE_ID = -1;

export const OTHER_SITE_OPTION = {
  id: OTHER_SITE_ID,
  name: 'Other sites',
};

export const isOtherSiteId = (siteId: unknown): boolean =>
  siteId != null && Number(siteId) === OTHER_SITE_ID;
