/** Stable report_faults.id from a list row, detail record, or legacy payload. */
export function reportFaultIdOf(
  record: {
    reportFaultId?: number | string | null;
    report_fault_id?: number | string | null;
    id?: number | string | null;
  } | null
  | undefined,
): number {
  if (!record) return 0;
  const fromField = record.reportFaultId ?? record.report_fault_id;
  if (fromField != null && +fromField > 0) return +fromField;
  const id = record.id;
  if (id != null && +id > 0) return +id;
  return 0;
}
