import { ReportTemplateItemDto } from './dto/create-report-template.dto';
import { ReportTemplateItem } from './entities/report-template-item.entity';

export function buildItemConfigFromDto(item: ReportTemplateItemDto): Record<string, unknown> {
  return {
    ...(item.config ?? {}),
    ...(item.label !== undefined ? { label: item.label } : {}),
    ...(Array.isArray(item.options) ? { options: item.options } : {}),
    ...(item.defaultValue !== undefined ? { defaultValue: item.defaultValue } : {}),
    ...(item.placeholder !== undefined ? { placeholder: item.placeholder } : {}),
    ...(item.validation !== undefined ? { validation: item.validation } : {}),
  };
}

export function normalizeItemDtos(items: ReportTemplateItemDto[]): ReportTemplateItemDto[] {
  return items
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, idx) => ({ ...item, order: idx + 1 }));
}

export function createItemEntities(
  items: ReportTemplateItemDto[],
  reportTemplateId: number,
  factory: { create: (partial: Partial<ReportTemplateItem>) => ReportTemplateItem },
): ReportTemplateItem[] {
  return normalizeItemDtos(items).map((item) =>
    factory.create({
      type: item.type,
      order: item.order,
      name: item.name,
      value: item.value ?? '',
      required: typeof item.required === 'boolean' ? item.required : false,
      config: buildItemConfigFromDto(item),
      reportTemplateId,
      createdAt: new Date(),
    }),
  );
}

export function sortTemplateItems<T extends { order?: number }>(items?: T[]): T[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function normalizeCategory(value?: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed || 'GENERAL';
}
