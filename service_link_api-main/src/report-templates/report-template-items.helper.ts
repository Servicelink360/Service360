import { ReportTemplateItemDto } from './dto/create-report-template.dto';
import { ReportTemplateItem } from './entities/report-template-item.entity';
import { fixTextEncoding } from '../helpers/text-encoding';

export function sanitizeTemplateItemText(item: ReportTemplateItem): ReportTemplateItem {
  if (!item) return item;
  const config = item.config ? { ...item.config } : undefined;
  if (config?.label != null) {
    config.label = fixTextEncoding(config.label);
  }
  return {
    ...item,
    name: fixTextEncoding(item.name),
    config,
  };
}

export function sanitizeTemplateItemsText(items?: ReportTemplateItem[]): ReportTemplateItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeTemplateItemText);
}

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
      name: fixTextEncoding(item.name),
      value: item.value ?? '',
      required: typeof item.required === 'boolean' ? item.required : false,
      config: buildItemConfigFromDto({
        ...item,
        name: fixTextEncoding(item.name),
        label: item.label != null ? fixTextEncoding(item.label) : item.label,
      }),
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

export function prepareTemplateItemsForResponse(items?: ReportTemplateItem[]): ReportTemplateItem[] {
  return sanitizeTemplateItemsText(sortTemplateItems(items));
}

export function normalizeCategory(value?: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed || 'GENERAL';
}
