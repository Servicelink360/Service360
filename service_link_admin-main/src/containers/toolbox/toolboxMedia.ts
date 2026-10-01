const theme = (file: string) => `/images/training/themes/${file}`;
const gateway = (file: string) => `/images/training/gateway/${file}`;

/** Fallback images by toolbox talk code when the API has no imageUrl. */
export const TOOLBOX_IMAGES: Record<string, string> = {
  SLIPS: theme('slips-trips.png'),
  FIRE: theme('fire-extinguisher.png'),
  FATIGUE: theme('fatigue.png'),
  ALCOHOL: theme('fitness-for-work.png'),
  ILLNESS: theme('first-aid.png'),
  INFECTION: theme('sharps.png'),
  PLANT: theme('mower.png'),
  SWMS: theme('signage.png'),
  WHSLAW: gateway('whs-responsibilities.png'),
  RISK: gateway('risk-management.png'),
  RTW: theme('injury.png'),
  DRIVING: theme('traffic.png'),
  OFFSITE: theme('working-alone.png'),
  BULLY: gateway('bullying.png'),
  VEHICLE: theme('vehicle-load-safety.png'),
  CHEMICAL: theme('chemicals-sds.png'),
};

export function toolboxImageFor(talk: { code?: string; imageUrl?: string | null; title?: string }) {
  if (talk.imageUrl) return talk.imageUrl;
  if (talk.code && TOOLBOX_IMAGES[talk.code]) return TOOLBOX_IMAGES[talk.code];
  const title = String(talk.title || '').toLowerCase();
  if (title.includes('slip')) return TOOLBOX_IMAGES.SLIPS;
  if (title.includes('fire')) return TOOLBOX_IMAGES.FIRE;
  if (title.includes('fatigue')) return TOOLBOX_IMAGES.FATIGUE;
  if (title.includes('alcohol') || title.includes('drug')) return TOOLBOX_IMAGES.ALCOHOL;
  if (title.includes('flu') || title.includes('cold')) return TOOLBOX_IMAGES.ILLNESS;
  if (title.includes('infect')) return TOOLBOX_IMAGES.INFECTION;
  if (title.includes('plant') || title.includes('equipment')) return TOOLBOX_IMAGES.PLANT;
  if (title.includes('method') || title.includes('swms')) return TOOLBOX_IMAGES.SWMS;
  if (title.includes('whs') || title.includes('dut')) return TOOLBOX_IMAGES.WHSLAW;
  if (title.includes('risk')) return TOOLBOX_IMAGES.RISK;
  if (title.includes('return')) return TOOLBOX_IMAGES.RTW;
  if (title.includes('driv')) return TOOLBOX_IMAGES.DRIVING;
  if (title.includes('external') || title.includes('alone')) return TOOLBOX_IMAGES.OFFSITE;
  if (title.includes('bully')) return TOOLBOX_IMAGES.BULLY;
  if (title.includes('vehicle')) return TOOLBOX_IMAGES.VEHICLE;
  if (title.includes('chemical')) return TOOLBOX_IMAGES.CHEMICAL;
  return theme('housekeeping.png');
}
