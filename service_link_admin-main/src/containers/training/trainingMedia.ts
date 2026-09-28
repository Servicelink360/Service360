/**
 * Fallback cartoon illustrations when a topic has no imageUrl saved yet.
 * Keyed by module code ? topic sortOrder (1-based).
 */
export const TRAINING_TOPIC_IMAGES: Record<string, Record<number, string[]>> = {
  GATEWAY: {
    1: ['/images/training/gateway/whs-responsibilities.png'],
    2: ['/images/training/gateway/risk-management.png'],
    3: ['/images/training/gateway/issue-resolution.png'],
    4: ['/images/training/gateway/your-responsibility.png'],
    5: ['/images/training/gateway/workplace-hazards.png'],
    6: ['/images/training/gateway/manual-handling-awareness.png'],
    7: ['/images/training/gateway/safe-lifting.png'],
    8: ['/images/training/gateway/ergonomics.png'],
    9: ['/images/training/gateway/workplace-stress.png'],
    10: ['/images/training/gateway/stress-tips.png'],
    11: ['/images/training/gateway/discrimination.png'],
    12: ['/images/training/gateway/discrimination-law.png'],
    13: ['/images/training/gateway/sexual-harassment.png'],
    14: ['/images/training/gateway/sexual-harassment-law.png'],
    15: ['/images/training/gateway/workplace-harassment.png'],
    16: ['/images/training/gateway/respond-harassment.png'],
    17: ['/images/training/gateway/bullying.png'],
    18: ['/images/training/gateway/not-bullying.png'],
    19: ['/images/training/gateway/module-complete.png'],
  },
};

const theme = (file: string) => `/images/training/themes/${file}`;
const gateway = (file: string) => `/images/training/gateway/${file}`;

/** Most specific subject first. Shared cartoons are reused when the topic is the same. */
const TOPIC_CARTOONS: { test: RegExp; src: string }[] = [
  { test: /cpr|bls/i, src: theme('cpr.png') },
  { test: /code brown/i, src: theme('code-brown.png') },
  { test: /extinguisher/i, src: theme('fire-extinguisher.png') },
  { test: /asbestos/i, src: theme('asbestos.png') },
  { test: /confined/i, src: theme('confined-space.png') },
  { test: /permit work|entry permit/i, src: theme('confined-space.png') },
  { test: /residual current|\brcd\b/i, src: theme('rcd.png') },
  { test: /mower/i, src: theme('mower.png') },
  { test: /power tool/i, src: theme('power-tools.png') },
  { test: /licen[cs]e/i, src: theme('licence.png') },
  { test: /elevating work|\bewp\b/i, src: theme('ewp.png') },
  { test: /fall arrest|travel restraint|work positioning|harness/i, src: theme('harness.png') },
  { test: /scaffold/i, src: theme('scaffold.png') },
  { test: /perimeter guard|working at height|falls from|fall risk/i, src: theme('working-at-heights.png') },
  { test: /ladder/i, src: theme('ladder.png') },
  { test: /electrical line|power line/i, src: theme('power-lines.png') },
  { test: /load handling|attachments|work platform/i, src: theme('forklift-load.png') },
  { test: /forklift|ramps|loading dock|operation fundamental|parking|out of service/i, src: theme('forklift.png') },
  { test: /ventilation/i, src: theme('ventilation.png') },
  { test: /pedestrian|traffic/i, src: theme('traffic.png') },
  { test: /mobile plant/i, src: theme('mobile-plant.png') },
  { test: /loading & unloading|loading and unloading/i, src: theme('traffic.png') },
  { test: /spill/i, src: theme('spill.png') },
  { test: /dangerous good|placard|segregation|transfer of dg/i, src: theme('dangerous-goods.png') },
  { test: /signage/i, src: theme('signage.png') },
  { test: /sun|\buv\b|skin protection/i, src: theme('sun-protection.png') },
  { test: /respiratory|\bppe\b|personal protective/i, src: theme('ppe.png') },
  { test: /acoustic|headset|voice fatigue/i, src: theme('acoustic.png') },
  { test: /call centre/i, src: theme('call-centre.png') },
  { test: /sexual harassment and the law/i, src: gateway('sexual-harassment-law.png') },
  { test: /sexual harassment/i, src: gateway('sexual-harassment.png') },
  { test: /discrimination and the law/i, src: gateway('discrimination-law.png') },
  { test: /discrimination|diverse workforce|racial or ethnic/i, src: gateway('discrimination.png') },
  { test: /how to respond/i, src: gateway('respond-harassment.png') },
  { test: /not bullying|reasonable management/i, src: gateway('not-bullying.png') },
  { test: /bullying/i, src: gateway('bullying.png') },
  { test: /victimisation|harassment/i, src: gateway('workplace-harassment.png') },
  { test: /tips for dealing|identifying & managing stress|identifying and managing stress/i, src: gateway('stress-tips.png') },
  { test: /stress/i, src: gateway('workplace-stress.png') },
  { test: /safe lifting/i, src: gateway('safe-lifting.png') },
  { test: /manual task|manual handling/i, src: gateway('manual-handling-awareness.png') },
  { test: /ergonomic|workstation|work station|chair|keyboard|mouse|computer screen|under desk|storage on top|occupational overuse|\bmsd\b|hot desk/i, src: gateway('ergonomics.png') },
  { test: /rest break|task variety/i, src: theme('rest-breaks.png') },
  { test: /slip|trip/i, src: theme('slips-trips.png') },
  { test: /^\s*falls\b/i, src: theme('working-at-heights.png') },
  { test: /electrical/i, src: theme('electrical-safety.png') },
  { test: /chemical|hazardous substance|msds|\bsds\b/i, src: theme('chemicals-sds.png') },
  { test: /house\s*keeping/i, src: theme('housekeeping.png') },
  { test: /first aid/i, src: theme('first-aid.png') },
  { test: /injur/i, src: theme('injury.png') },
  { test: /fatigue/i, src: theme('fatigue.png') },
  { test: /burn|scald/i, src: theme('burns.png') },
  { test: /sharp|biological/i, src: theme('sharps.png') },
  { test: /nursing|health worker/i, src: theme('nursing.png') },
  { test: /outdoor/i, src: theme('sun-protection.png') },
  { test: /aggression|violence|security|threat/i, src: theme('aggression.png') },
  { test: /working alone|access and security/i, src: theme('working-alone.png') },
  { test: /issue resolution|raising issues|unsafe work|responding to safety/i, src: gateway('issue-resolution.png') },
  { test: /your responsibility|your duty|employer/i, src: gateway('your-responsibility.png') },
  { test: /risk/i, src: gateway('risk-management.png') },
  { test: /hazard/i, src: gateway('workplace-hazards.png') },
  { test: /whs|consultation|responsibilit|on-hire|host organisation/i, src: gateway('whs-responsibilities.png') },
  { test: /storage/i, src: theme('storage.png') },
  { test: /operating equipment|\bequipment\b/i, src: theme('power-tools.png') },
  { test: /emergency/i, src: theme('emergency.png') },
  { test: /incident|occurrence|reporting/i, src: theme('incident-report.png') },
  { test: /training & supervision|information, instruction|instruction, training/i, src: theme('welcome.png') },
  { test: /completion|summary/i, src: gateway('module-complete.png') },
  { test: /welcome|introduction|learning outcome|overview|starting your new role|ict worker/i, src: theme('welcome.png') },
];

export function cartoonForTopicTitle(title?: string | null): string | null {
  const text = String(title || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const hit = TOPIC_CARTOONS.find((row) => row.test.test(text));
  return hit?.src || theme('welcome.png');
}

export function topicImagesFor(
  moduleCode: string | null | undefined,
  sortOrder: number,
  imageUrl?: string | null,
  title?: string | null,
): string[] {
  const fromTopic = String(imageUrl || '').trim();
  if (fromTopic) return [fromTopic];
  const code = String(moduleCode || '').trim().toUpperCase();
  const mapped = code && sortOrder ? TRAINING_TOPIC_IMAGES[code]?.[sortOrder] : undefined;
  if (mapped?.length) return mapped;
  const themed = cartoonForTopicTitle(title);
  return themed ? [themed] : [];
}
