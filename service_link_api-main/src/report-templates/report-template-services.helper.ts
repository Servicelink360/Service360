import { In, Repository } from 'typeorm';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportTemplateService } from './entities/report-template-service.entity';

export type TemplateWithServiceIds = ReportTemplate & { serviceIds?: number[] };

export function normalizeServiceIds(raw?: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)];
}

export async function loadServiceIdsByTemplateIds(
  repo: Repository<ReportTemplateService>,
  templateIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!templateIds.length) return map;
  try {
    const rows = await repo.find({
      where: { reportTemplateId: In(templateIds) },
      select: ['reportTemplateId', 'serviceId'],
    });
    for (const row of rows) {
      const tid = +row.reportTemplateId;
      const did = +row.serviceId;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(did);
    }
    for (const [tid, ids] of map) {
      map.set(tid, [...new Set(ids)].sort((a, b) => a - b));
    }
  } catch {
    // Migration 026 may not be applied yet — treat as no Service restrictions.
    return map;
  }
  return map;
}

export async function attachServiceIdsToTemplates(
  repo: Repository<ReportTemplateService>,
  templates: ReportTemplate[],
): Promise<TemplateWithServiceIds[]> {
  if (!templates?.length) return [];
  const ids = templates.map((t) => +t.id).filter((id) => Number.isFinite(id) && id > 0);
  const byTemplate = await loadServiceIdsByTemplateIds(repo, ids);
  for (const t of templates) {
    (t as TemplateWithServiceIds).serviceIds = byTemplate.get(+t.id) ?? [];
  }
  return templates as TemplateWithServiceIds[];
}

export async function syncTemplateServices(
  repo: Repository<ReportTemplateService>,
  templateId: number,
  serviceIds: number[],
): Promise<void> {
  await repo.delete({ reportTemplateId: templateId });
  const unique = normalizeServiceIds(serviceIds);
  if (!unique.length) return;
  const rows = unique.map((serviceId) =>
    repo.create({
      reportTemplateId: templateId,
      serviceId,
      createdAt: new Date(),
    }),
  );
  await repo.save(rows);
}
