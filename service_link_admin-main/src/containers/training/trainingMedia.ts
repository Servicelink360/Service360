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
  },
};

export function topicImagesFor(
  moduleCode: string | null | undefined,
  sortOrder: number,
  imageUrl?: string | null,
): string[] {
  const fromTopic = String(imageUrl || '').trim();
  if (fromTopic) return [fromTopic];
  const code = String(moduleCode || '').trim().toUpperCase();
  if (!code || !sortOrder) return [];
  return TRAINING_TOPIC_IMAGES[code]?.[sortOrder] || [];
}
