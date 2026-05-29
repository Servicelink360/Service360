import { QueryFailedError } from 'typeorm';

function isVerboseErrors(): boolean {
  const flag = String(process.env.API_VERBOSE_ERRORS ?? '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  if (flag === '0' || flag === 'false' || flag === 'no') return false;
  return process.env.MODE === 'DEV' || process.env.NODE_ENV !== 'production';
}

/**
 * Safe, JSON-serializable payload for API error responses (Postgres / TypeORM / generic).
 */
export function serializeErrorForClient(err: unknown, context?: string): Record<string, unknown> {
  const verbose = isVerboseErrors();
  const out: Record<string, unknown> = {};

  if (context) {
    out.context = context;
  }

  if (err instanceof Error) {
    out.errorType = err.constructor.name;
    out.message = err.message;
    if (verbose && err.stack) {
      out.stack = err.stack;
    }
  } else {
    out.message = String(err);
  }

  if (err instanceof QueryFailedError) {
    out.sqlState = err.driverError && typeof err.driverError === 'object' && 'code' in err.driverError
      ? String((err.driverError as { code?: string }).code)
      : undefined;
    if (verbose) {
      out.sqlQuery = err.query;
      out.sqlParameters = err.parameters;
    }
    const d = err.driverError as Record<string, unknown> | undefined;
    if (d && typeof d === 'object') {
      out.pg = {
        code: d.code,
        severity: d.severity,
        detail: d.detail,
        hint: d.hint,
        schema: d.schema,
        table: d.table,
        column: d.column,
        constraint: d.constraint,
        routine: d.routine,
        position: d.position,
        internalPosition: d.internalPosition,
        internalQuery: d.internalQuery,
        where: d.where,
      };
    }
  }

  return out;
}

export function buildExceptionResult(
  err: unknown,
  context?: string,
): { message: string; details: Record<string, unknown> } {
  const details = serializeErrorForClient(err, context);
  const baseMsg = err instanceof Error ? err.message : String(err);
  const pgDetail =
    details.pg && typeof details.pg === 'object' && details.pg !== null && 'detail' in details.pg
      ? String((details.pg as { detail?: unknown }).detail ?? '')
      : '';
  const pgColumn =
    details.pg && typeof details.pg === 'object' && details.pg !== null && 'column' in details.pg
      ? String((details.pg as { column?: unknown }).column ?? '')
      : '';
  const pgTable =
    details.pg && typeof details.pg === 'object' && details.pg !== null && 'table' in details.pg
      ? String((details.pg as { table?: unknown }).table ?? '')
      : '';
  const parts = [baseMsg];
  if (pgTable) parts.push(`table=${pgTable}`);
  if (pgColumn) parts.push(`column=${pgColumn}`);
  if (pgDetail) parts.push(`detail=${pgDetail}`);
  return { message: parts.filter(Boolean).join(' | '), details };
}
