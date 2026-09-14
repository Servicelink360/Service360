import { In, Repository } from 'typeorm';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportTemplateStaff } from './entities/report-template-staff.entity';
import { ASSIGNED_STAFF_ALL } from './report-template-assignment.constants';

export type TemplateWithStaffIds = ReportTemplate & { assignedStaffIds?: number[] };

export function normalizeStaffIds(raw?: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)];
}

/** Resolve column + junction from API payload. */
export function resolveStaffAssignment(body: {
  assignedStaffId?: number | null;
  assignedStaffIds?: number[];
}): { assignedStaffId: number | null; staffIds: number[] } {
  const rawIds = Array.isArray(body.assignedStaffIds) ? body.assignedStaffIds : null;

  if (rawIds) {
    const hasAll = rawIds.some((id) => +id === ASSIGNED_STAFF_ALL);
    if (hasAll || (rawIds.length === 1 && +rawIds[0] === ASSIGNED_STAFF_ALL)) {
      return { assignedStaffId: ASSIGNED_STAFF_ALL, staffIds: [] };
    }
    const staffIds = normalizeStaffIds(rawIds);
    if (!staffIds.length) {
      return { assignedStaffId: null, staffIds: [] };
    }
    // Keep single id on column for backward-compatible list/filter when only one.
    return {
      assignedStaffId: staffIds.length === 1 ? staffIds[0] : null,
      staffIds,
    };
  }

  if (body.assignedStaffId === undefined) {
    return { assignedStaffId: null, staffIds: [] };
  }
  if (body.assignedStaffId === null) {
    return { assignedStaffId: null, staffIds: [] };
  }
  if (+body.assignedStaffId === ASSIGNED_STAFF_ALL) {
    return { assignedStaffId: ASSIGNED_STAFF_ALL, staffIds: [] };
  }
  if (+body.assignedStaffId > 0) {
    return { assignedStaffId: +body.assignedStaffId, staffIds: [+body.assignedStaffId] };
  }
  return { assignedStaffId: null, staffIds: [] };
}

export async function loadStaffIdsByTemplateIds(
  repo: Repository<ReportTemplateStaff>,
  templateIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!templateIds.length) return map;
  try {
    const rows = await repo.find({
      where: { reportTemplateId: In(templateIds) },
      select: ['reportTemplateId', 'staffId'],
    });
    for (const row of rows) {
      const tid = +row.reportTemplateId;
      const sid = +row.staffId;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(sid);
    }
    for (const [tid, ids] of map) {
      map.set(tid, [...new Set(ids)].sort((a, b) => a - b));
    }
  } catch {
    return map;
  }
  return map;
}

export async function attachStaffIdsToTemplates(
  repo: Repository<ReportTemplateStaff>,
  templates: ReportTemplate[],
): Promise<TemplateWithStaffIds[]> {
  if (!templates?.length) return [];
  const ids = templates.map((t) => +t.id).filter((id) => Number.isFinite(id) && id > 0);
  const byTemplate = await loadStaffIdsByTemplateIds(repo, ids);
  for (const t of templates) {
    const tid = +t.id;
    const fromJunction = byTemplate.get(tid) ?? [];
    const col = t.assignedStaffId;
    let assignedStaffIds: number[] = [];
    if (col === ASSIGNED_STAFF_ALL) {
      assignedStaffIds = [ASSIGNED_STAFF_ALL];
    } else if (fromJunction.length) {
      assignedStaffIds = fromJunction;
    } else if (col != null && +col > 0) {
      assignedStaffIds = [+col];
    }
    (t as TemplateWithStaffIds).assignedStaffIds = assignedStaffIds;
  }
  return templates as TemplateWithStaffIds[];
}

export async function syncTemplateStaffs(
  repo: Repository<ReportTemplateStaff>,
  templateId: number,
  staffIds: number[],
): Promise<void> {
  await repo.delete({ reportTemplateId: templateId });
  const unique = normalizeStaffIds(staffIds);
  if (!unique.length) return;
  const rows = unique.map((staffId) =>
    repo.create({
      reportTemplateId: templateId,
      staffId,
      createdAt: new Date(),
    }),
  );
  await repo.save(rows);
}
