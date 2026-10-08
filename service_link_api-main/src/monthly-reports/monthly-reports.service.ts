import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { convertReportLayoutPdf } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type MonthWindow = {
  label: string;
  priorLabel: string;
  start: string;
  end: string;
  priorStart: string;
  priorEnd: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function windowFor(year: number, month: number): MonthWindow {
  const lastDay = new Date(year, month, 0).getDate();
  const priorMonth = month === 1 ? 12 : month - 1;
  const priorYear = month === 1 ? year - 1 : year;
  const priorLast = new Date(priorYear, priorMonth, 0).getDate();
  return {
    label: `${MONTHS[month - 1]} ${year}`,
    priorLabel: `${MONTHS[priorMonth - 1]} ${priorYear}`,
    start: `${year}-${pad(month)}-01 00:00:00`,
    end: `${year}-${pad(month)}-${pad(lastDay)} 23:59:59`,
    priorStart: `${priorYear}-${pad(priorMonth)}-01 00:00:00`,
    priorEnd: `${priorYear}-${pad(priorMonth)}-${pad(priorLast)} 23:59:59`,
  };
}

function parseMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = +match[1];
  const month = +match[2];
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function stripHtml(value: unknown) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function faultStatus(status: number) {
  if (status === 1) return 'Completed';
  if (status === 3) return 'In progress';
  if (status === 2) return 'Pending';
  return 'New';
}

function ticketStatusLabel(status: number) {
  return faultStatus(status);
}

@Injectable()
export class MonthlyReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async listCustomers(user: IUserInfo, monthRaw: string, deletedRaw?: string) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const raw = String(monthRaw || '').trim();
    let monthKey: string | null = null;
    if (raw) {
      const parsed = parseMonth(raw);
      if (!parsed) return { ...errorCode.VALIDATION_ERROR, message: 'Choose a month' };
      monthKey = `${parsed.year}-${pad(parsed.month)}`;
    }
    const deletedOnly = deletedRaw === '1' || deletedRaw === 'true';
    const now = new Date();
    const lookback = `${now.getFullYear() - 3}-${pad(now.getMonth() + 1)}-01 00:00:00`;
    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
       FROM public.monthly_report_edits
       WHERE deleted_at IS NOT NULL
         AND purged_at IS NULL
         AND ($1::text IS NULL OR month = $1)`,
      [monthKey],
    );
    const rows = await this.dataSource.query(
      deletedOnly
        ? `WITH job_months AS (
             SELECT c.company_id,
                    to_char(COALESCE(ut.check_in, ut.created_at), 'YYYY-MM') AS month,
                    COUNT(ut.id)::int AS jobs
             FROM public.user_tasks ut
             INNER JOIN public.customers c ON c.user_id = ut.customer_id
             WHERE ut.status = 1
               AND ut.type = 'CUSTOM'
               AND c.company_id IS NOT NULL
               AND COALESCE(ut.check_in, ut.created_at) >= $1
             GROUP BY c.company_id, to_char(COALESCE(ut.check_in, ut.created_at), 'YYYY-MM')
           )
           SELECT cc.id AS "companyId",
                  cc.name,
                  e.month,
                  COALESCE(j.jobs, 0)::int AS jobs,
                  COALESCE(e.client_visible, false) AS "clientVisible"
           FROM public.monthly_report_edits e
           INNER JOIN public.customer_companies cc ON cc.id = e.company_id
           LEFT JOIN job_months j ON j.company_id = e.company_id AND j.month = e.month
           WHERE e.deleted_at IS NOT NULL
             AND e.purged_at IS NULL
             AND ($2::text IS NULL OR e.month = $2)
           ORDER BY e.deleted_at DESC, cc.name ASC`
        : `WITH job_months AS (
             SELECT c.company_id,
                    to_char(COALESCE(ut.check_in, ut.created_at), 'YYYY-MM') AS month,
                    COUNT(ut.id)::int AS jobs
             FROM public.user_tasks ut
             INNER JOIN public.customers c ON c.user_id = ut.customer_id
             WHERE ut.status = 1
               AND ut.type = 'CUSTOM'
               AND c.company_id IS NOT NULL
               AND COALESCE(ut.check_in, ut.created_at) >= $1
             GROUP BY c.company_id, to_char(COALESCE(ut.check_in, ut.created_at), 'YYYY-MM')
           ),
           kept_edits AS (
             SELECT company_id, month, client_visible
             FROM public.monthly_report_edits
             WHERE deleted_at IS NULL AND purged_at IS NULL
           ),
           keys AS (
             SELECT company_id, month FROM job_months
             UNION
             SELECT company_id, month FROM kept_edits
           )
           SELECT cc.id AS "companyId",
                  cc.name,
                  k.month,
                  COALESCE(j.jobs, 0)::int AS jobs,
                  COALESCE(e.client_visible, false) AS "clientVisible"
           FROM keys k
           INNER JOIN public.customer_companies cc ON cc.id = k.company_id
           LEFT JOIN job_months j ON j.company_id = k.company_id AND j.month = k.month
           LEFT JOIN kept_edits e ON e.company_id = k.company_id AND e.month = k.month
           WHERE ($2::text IS NULL OR k.month = $2)
             AND NOT EXISTS (
               SELECT 1 FROM public.monthly_report_edits d
               WHERE d.company_id = k.company_id
                 AND d.month = k.month
                 AND (d.deleted_at IS NOT NULL OR d.purged_at IS NOT NULL)
             )
           ORDER BY k.month DESC, cc.name ASC`,
      [lookback, monthKey],
    );
    return {
      ...errorCode.SUCCESS,
      deletedCount: +countRows[0]?.n || 0,
      data: rows.map((row: { companyId: number; name: string; month: string; jobs: number; clientVisible: boolean }) => {
        const parsed = parseMonth(String(row.month || ''));
        return {
          companyId: +row.companyId,
          name: row.name,
          month: String(row.month),
          jobs: +row.jobs || 0,
          period: parsed ? `${MONTHS[parsed.month - 1]} ${parsed.year}` : String(row.month),
          clientVisible: row.clientVisible === true,
        };
      }),
    };
  }

  async listPublished(user: IUserInfo) {
    if (+user?.type !== userType.CUSTOMER) {
      return { ...errorCode.EXCEPTION, message: 'Customer only' };
    }
    const scope = await this.resolveCustomer(user, '');
    if ('error' in scope) return scope.error;
    if (!scope.companyId) return { ...errorCode.SUCCESS, data: [] };
    const rows = await this.dataSource.query(
      `SELECT month FROM public.monthly_report_edits
       WHERE company_id = $1 AND client_visible = true AND deleted_at IS NULL
       ORDER BY month DESC`,
      [scope.companyId],
    );
    return {
      ...errorCode.SUCCESS,
      data: rows.map((row: { month: string }) => {
        const parsed = parseMonth(String(row.month || ''));
        return {
          companyId: scope.companyId,
          month: String(row.month),
          period: parsed ? `${MONTHS[parsed.month - 1]} ${parsed.year}` : String(row.month),
        };
      }),
    };
  }

  async getReport(user: IUserInfo, companyIdRaw: string, monthRaw: string) {
    try {
      return await this.buildReport(user, companyIdRaw, monthRaw);
    } catch (error) {
      return { ...errorCode.EXCEPTION, message: 'Could not build the monthly report' };
    }
  }

  private async buildReport(user: IUserInfo, companyIdRaw: string, monthRaw: string) {
    if (+user?.type === userType.STAFF) {
      return { ...errorCode.EXCEPTION, message: 'Customers and admins only' };
    }
    const parsed = parseMonth(monthRaw);
    if (!parsed) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a month' };
    }
    const window = windowFor(parsed.year, parsed.month);
    const monthKey = `${parsed.year}-${pad(parsed.month)}`;

    const scope = await this.resolveCustomer(user, companyIdRaw);
    if ('error' in scope) return scope.error;

    if (+user.type === userType.CUSTOMER) {
      const allowed = await this.clientCanView(scope.companyId, monthKey);
      if (!allowed) {
        return { ...errorCode.EXCEPTION, message: 'This monthly report is not available' };
      }
    }

    const ids = scope.userIds;
    const [work, priorWork, faults, priorFaults, tickets, priorTickets, invoices, priorInvoices, personnel, toolbox, edit] =
      await Promise.all([
        this.loadWork(ids, window.start, window.end),
        this.countWork(ids, window.priorStart, window.priorEnd),
        this.loadFaults(ids, window.start, window.end),
        this.countFaults(ids, window.priorStart, window.priorEnd),
        this.loadTickets(ids, window.start, window.end),
        this.countTickets(ids, window.priorStart, window.priorEnd),
        this.loadInvoices(ids, window.start, window.end),
        this.countInvoices(ids, window.priorStart, window.priorEnd),
        scope.companyId
          ? this.dataSource.query(
              `SELECT name, role FROM public.customer_personnel
               WHERE company_id = $1 AND is_active = true
               ORDER BY name ASC`,
              [scope.companyId],
            )
          : Promise.resolve([]),
        this.loadToolbox(window.start, window.end),
        this.loadEdit(scope.companyId, monthKey),
      ]);

    const sites = this.sitesFrom(work, faults, tickets);
    const services = this.servicesFrom(work);
    const summary = this.summary(scope.name, window.label, work, faults, tickets, invoices, sites, services);

    return {
      ...errorCode.SUCCESS,
      data: {
        customer: {
          companyId: scope.companyId,
          name: scope.name,
          email: scope.email,
          phone: scope.phone,
          address: scope.address,
          contactName: scope.contactName,
        },
        period: {
          label: window.label,
          from: window.start.slice(0, 10),
          to: window.end.slice(0, 10),
          priorLabel: window.priorLabel,
          month: monthKey,
        },
        edit,
        summary,
        kpis: [
          {
            label: 'Jobs completed',
            value: work.length,
            prior: priorWork,
            note: 'Completed site reports and scheduled jobs',
          },
          {
            label: 'Faults logged',
            value: faults.length,
            prior: priorFaults,
            note: `${faults.filter((f) => f.priority === 'Urgent').length} urgent � ${
              faults.filter((f) => f.status === 'Completed').length
            } completed`,
          },
          {
            label: 'Tickets raised',
            value: tickets.length,
            prior: priorTickets,
            note: `${tickets.filter((t) => t.status === 'Completed').length} completed`,
          },
          {
            label: 'Invoices published',
            value: invoices.length,
            prior: priorInvoices,
            note: 'Files shared with this customer',
          },
        ],
        sites,
        services,
        work,
        faults,
        tickets,
        invoices,
        personnel: (personnel || []).map((row: { name: string; role: string }) => ({
          name: row.name,
          role: row.role || 'Personnel',
        })),
        toolbox,
      },
    };
  }

  private summary(
    name: string,
    label: string,
    work: { site: string }[],
    faults: unknown[],
    tickets: unknown[],
    invoices: unknown[],
    sites: { site: string; jobs: number }[],
    services: { name: string; value: number }[],
  ) {
    if (!work.length && !faults.length && !tickets.length && !invoices.length) {
      return [`No completed jobs, faults, tickets, or invoices were recorded for ${name} in ${label}.`];
    }
    const lines = [
      `${name}: ${work.length} completed jobs, ${faults.length} faults, ${tickets.length} tickets, and ${invoices.length} invoices in ${label}.`,
    ];
    const topSite = sites.find((s) => s.jobs > 0);
    if (topSite) {
      lines.push(`Most completed jobs were at ${topSite.site} (${topSite.jobs}).`);
    }
    if (services[0]) {
      lines.push(`${services[0].name} was the main service (${services[0].value} jobs).`);
    }
    return lines;
  }

  private sitesFrom(
    work: { site: string }[],
    faults: { site: string }[],
    tickets: { site: string }[],
  ) {
    const map = new Map<string, { site: string; jobs: number; faults: number; tickets: number }>();
    const bump = (site: string, key: 'jobs' | 'faults' | 'tickets') => {
      const name = site || 'Unnamed site';
      const row = map.get(name) || { site: name, jobs: 0, faults: 0, tickets: 0 };
      row[key] += 1;
      map.set(name, row);
    };
    work.forEach((row) => bump(row.site, 'jobs'));
    faults.forEach((row) => bump(row.site, 'faults'));
    tickets.forEach((row) => bump(row.site, 'tickets'));
    return [...map.values()].sort((a, b) => b.jobs + b.faults + b.tickets - (a.jobs + a.faults + a.tickets));
  }

  private servicesFrom(work: { service: string }[]) {
    const map = new Map<string, number>();
    work.forEach((row) => {
      const name = row.service || 'Other';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private async resolveCustomer(user: IUserInfo, companyIdRaw: string) {
    if (+user.type === userType.CUSTOMER) {
      const rows = await this.dataSource.query(
        `SELECT c.user_id, c.company_id, c.company_name, c.company_email, c.company_phone,
                c.location, c.city, c.state, c.post_code, u.full_name, u.email, u.phone,
                cc.name AS company_record_name
         FROM public.customers c
         INNER JOIN public.users u ON u.id = c.user_id
         LEFT JOIN public.customer_companies cc ON cc.id = c.company_id
         WHERE c.user_id = $1
         LIMIT 1`,
        [+user.userId],
      );
      const me = rows[0];
      if (!me) return { error: { ...errorCode.NOT_FOUND, message: 'Customer not found' } };
      const companyId = me.company_id ? +me.company_id : null;
      const userIds = await this.userIdsFor(companyId, me.company_name, +me.user_id);
      return {
        companyId,
        userIds,
        name: me.company_record_name || me.company_name || me.full_name,
        email: me.company_email || me.email || '',
        phone: me.company_phone || me.phone || '',
        address: [me.location, me.city, me.state, me.post_code].filter(Boolean).join(', '),
        contactName: me.full_name || '',
      };
    }

    const companyId = +companyIdRaw;
    if (!companyId) {
      return { error: { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer' } };
    }
    const companies = await this.dataSource.query(
      `SELECT id, name FROM public.customer_companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    if (!companies[0]) {
      return { error: { ...errorCode.NOT_FOUND, message: 'Customer not found' } };
    }
    const contacts = await this.dataSource.query(
      `SELECT c.company_email, c.company_phone, c.location, c.city, c.state, c.post_code,
              u.full_name, u.email, u.phone
       FROM public.customers c
       INNER JOIN public.users u ON u.id = c.user_id
       WHERE c.company_id = $1
       ORDER BY c.user_id ASC
       LIMIT 1`,
      [companyId],
    );
    const contact = contacts[0] || {};
    const userIds = await this.userIdsFor(companyId, companies[0].name, 0);
    return {
      companyId,
      userIds,
      name: companies[0].name,
      email: contact.company_email || contact.email || '',
      phone: contact.company_phone || contact.phone || '',
      address: [contact.location, contact.city, contact.state, contact.post_code].filter(Boolean).join(', '),
      contactName: contact.full_name || '',
    };
  }

  private async userIdsFor(companyId: number | null, companyName: string, ownUserId: number) {
    if (companyId) {
      const rows = await this.dataSource.query(
        `SELECT user_id FROM public.customers
         WHERE company_id = $1
            OR (
              company_id IS NULL
              AND TRIM(COALESCE(company_name, '')) <> ''
              AND LOWER(TRIM(company_name)) = LOWER(TRIM($2))
            )`,
        [companyId, companyName || ''],
      );
      return rows.map((row: { user_id: number }) => +row.user_id).filter((id: number) => id > 0);
    }
    const rows = await this.dataSource.query(
      `SELECT user_id FROM public.customers
       WHERE user_id = $1
          OR (
            TRIM(COALESCE($2, '')) <> ''
            AND LOWER(TRIM(company_name)) = LOWER(TRIM($2))
          )`,
      [ownUserId, companyName || ''],
    );
    const ids = rows.map((row: { user_id: number }) => +row.user_id).filter((id: number) => id > 0);
    return ids.length ? ids : ownUserId > 0 ? [ownUserId] : [];
  }

  private async loadWork(ids: number[], start: string, end: string) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `SELECT ut.id,
              ut.type,
              ut.task_name,
              ut.service_name,
              ut.site_name,
              ut.site_address,
              ut.pdf_file,
              staff.full_name AS staff_name,
              LEFT(regexp_replace(COALESCE(ut.description, ''), '<[^>]+>', ' ', 'g'), 220) AS detail,
              COALESCE(ut.check_in, ut.created_at) AS done_at
       FROM public.user_tasks ut
       LEFT JOIN public.users staff ON staff.id = ut.staff_id
       WHERE ut.customer_id = ANY($1::int[])
         AND ut.status = 1
         AND COALESCE(ut.check_in, ut.created_at) >= $2
         AND COALESCE(ut.check_in, ut.created_at) <= $3
       ORDER BY COALESCE(ut.check_in, ut.created_at) DESC, ut.id DESC
       LIMIT 500`,
      [ids, start, end],
    );
    return rows.map((row: any) => ({
      id: +row.id,
      date: row.done_at,
      site: row.site_name || '',
      address: row.site_address || '',
      service: row.service_name || row.task_name || 'Job',
      title: row.task_name || row.service_name || 'Completed job',
      detail: stripHtml(row.detail),
      kind: String(row.type || '').toUpperCase() === 'CUSTOM' ? 'Site report' : 'Scheduled job',
      pdfFile: row.pdf_file || '',
      staffName: row.staff_name || '',
    }));
  }

  private async countWork(ids: number[], start: string, end: string) {
    if (!ids.length) return 0;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
       FROM public.user_tasks ut
       WHERE ut.customer_id = ANY($1::int[])
         AND ut.status = 1
         AND COALESCE(ut.check_in, ut.created_at) >= $2
         AND COALESCE(ut.check_in, ut.created_at) <= $3`,
      [ids, start, end],
    );
    return +rows[0]?.n || 0;
  }

  private async loadFaults(ids: number[], start: string, end: string) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `SELECT id, subject, issue, site_name, service_name, priority, status, created_at
       FROM public.report_faults
       WHERE customer_id = ANY($1::int[])
         AND status <> 4
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at DESC, id DESC
       LIMIT 500`,
      [ids, start, end],
    );
    return rows.map((row: any) => ({
      id: +row.id,
      date: row.created_at,
      site: row.site_name || '',
      service: row.service_name || '',
      title: row.subject || row.issue || 'Fault',
      detail: stripHtml(row.issue),
      priority: +row.priority === 1 ? 'Urgent' : 'Normal',
      status: faultStatus(+row.status),
    }));
  }

  private async countFaults(ids: number[], start: string, end: string) {
    if (!ids.length) return 0;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM public.report_faults
       WHERE customer_id = ANY($1::int[]) AND status <> 4
         AND created_at >= $2 AND created_at <= $3`,
      [ids, start, end],
    );
    return +rows[0]?.n || 0;
  }

  private async loadTickets(ids: number[], start: string, end: string) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `SELECT id, subject, message, site_name, service_name, status, created_at
       FROM public.tickets
       WHERE customer_id = ANY($1::int[])
         AND status <> 4
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at DESC, id DESC
       LIMIT 500`,
      [ids, start, end],
    );
    return rows.map((row: any) => ({
      id: +row.id,
      date: row.created_at,
      site: row.site_name || '',
      service: row.service_name || '',
      title: row.subject || 'Ticket',
      detail: stripHtml(row.message),
      status: ticketStatusLabel(+row.status),
    }));
  }

  private async countTickets(ids: number[], start: string, end: string) {
    if (!ids.length) return 0;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM public.tickets
       WHERE customer_id = ANY($1::int[]) AND status <> 4
         AND created_at >= $2 AND created_at <= $3`,
      [ids, start, end],
    );
    return +rows[0]?.n || 0;
  }

  private async loadInvoices(ids: number[], start: string, end: string) {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `SELECT id, title, notes, created_at
       FROM public.invoices
       WHERE customer_id = ANY($1::int[])
         AND admin_deleted_at IS NULL
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at DESC, id DESC
       LIMIT 200`,
      [ids, start, end],
    );
    return rows.map((row: any) => ({
      id: +row.id,
      date: row.created_at,
      title: row.title || 'Invoice',
      detail: stripHtml(row.notes),
    }));
  }

  async saveReport(user: IUserInfo, body: { companyId?: number; month?: string; body?: unknown }) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const companyId = +body?.companyId;
    const month = String(body?.month || '').trim();
    if (!companyId || !parseMonth(month)) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer and month' };
    }
    const payload = body?.body;
    if (!payload || typeof payload !== 'object') {
      return { ...errorCode.VALIDATION_ERROR, message: 'Nothing to save' };
    }
    const raw = JSON.stringify(payload);
    if (raw.length > 1_500_000) {
      return { ...errorCode.VALIDATION_ERROR, message: 'This report is too large to save' };
    }
    await this.dataSource.query(
      `INSERT INTO public.monthly_report_edits (company_id, month, body, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (company_id, month)
       DO UPDATE SET body = EXCLUDED.body, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [companyId, month, raw, +user.userId || null],
    );
    return { ...errorCode.SUCCESS, message: 'Monthly report saved' };
  }

  async setClientVisible(
    user: IUserInfo,
    body: { companyId?: number; month?: string; clientVisible?: boolean },
  ) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const companyId = +body?.companyId;
    const month = String(body?.month || '').trim();
    if (!companyId || !parseMonth(month)) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer and month' };
    }
    const visible = body?.clientVisible === true;
    await this.dataSource.query(
      `INSERT INTO public.monthly_report_edits (company_id, month, body, client_visible, deleted_at, updated_by, updated_at)
       VALUES ($1, $2, '{}'::jsonb, $3, NULL, $4, NOW())
       ON CONFLICT (company_id, month)
       DO UPDATE SET client_visible = EXCLUDED.client_visible,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
      [companyId, month, visible, +user.userId || null],
    );
    return {
      ...errorCode.SUCCESS,
      message: visible ? 'Client can view this monthly report' : 'Client cannot view this monthly report',
      data: { clientVisible: visible },
    };
  }

  async deleteReport(user: IUserInfo, companyIdRaw: string, monthRaw: string, permanentRaw?: string) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const companyId = +companyIdRaw;
    const month = String(monthRaw || '').trim();
    if (!companyId || !parseMonth(month)) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer and month' };
    }
    const permanent = permanentRaw === '1' || permanentRaw === 'true';
    if (permanent) {
      await this.dataSource.query(
        `INSERT INTO public.monthly_report_edits (company_id, month, body, client_visible, deleted_at, purged_at, updated_by, updated_at)
         VALUES ($1, $2, '{}'::jsonb, false, NOW(), NOW(), $3, NOW())
         ON CONFLICT (company_id, month)
         DO UPDATE SET client_visible = false,
                       deleted_at = COALESCE(monthly_report_edits.deleted_at, NOW()),
                       purged_at = NOW(),
                       updated_by = EXCLUDED.updated_by,
                       updated_at = NOW()`,
        [companyId, month, +user.userId || null],
      );
      return { ...errorCode.SUCCESS, message: 'Monthly report permanently deleted' };
    }
    await this.dataSource.query(
      `INSERT INTO public.monthly_report_edits (company_id, month, body, client_visible, deleted_at, updated_by, updated_at)
       VALUES ($1, $2, '{}'::jsonb, false, NOW(), $3, NOW())
       ON CONFLICT (company_id, month)
       DO UPDATE SET client_visible = false,
                     deleted_at = NOW(),
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
      [companyId, month, +user.userId || null],
    );
    return { ...errorCode.SUCCESS, message: 'Monthly report moved to Deleted' };
  }

  async restoreReport(user: IUserInfo, body: { companyId?: number; month?: string }) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const companyId = +body?.companyId;
    const month = String(body?.month || '').trim();
    if (!companyId || !parseMonth(month)) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer and month' };
    }
    const rows = await this.dataSource.query(
      `UPDATE public.monthly_report_edits
       SET deleted_at = NULL, updated_by = $3, updated_at = NOW()
       WHERE company_id = $1 AND month = $2 AND deleted_at IS NOT NULL AND purged_at IS NULL
       RETURNING company_id`,
      [companyId, month, +user.userId || null],
    );
    if (!rows.length) {
      return { ...errorCode.VALIDATION_ERROR, message: 'This report cannot be restored' };
    }
    return { ...errorCode.SUCCESS, message: 'Monthly report restored' };
  }

  async copyReport(
    user: IUserInfo,
    body: { companyId?: number; month?: string; targetMonth?: string; body?: unknown },
  ) {
    if (+user?.type !== userType.ADMIN) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const companyId = +body?.companyId;
    const month = String(body?.month || '').trim();
    const targetMonth = String(body?.targetMonth || '').trim();
    if (!companyId || !parseMonth(month) || !parseMonth(targetMonth)) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a customer and both months' };
    }
    if (month === targetMonth) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a different month to copy to' };
    }
    const payload = body?.body;
    if (!payload || typeof payload !== 'object') {
      return { ...errorCode.VALIDATION_ERROR, message: 'Nothing to copy' };
    }
    const raw = JSON.stringify(payload);
    if (raw.length > 1_500_000) {
      return { ...errorCode.VALIDATION_ERROR, message: 'This report is too large to copy' };
    }
    await this.dataSource.query(
      `INSERT INTO public.monthly_report_edits (company_id, month, body, client_visible, deleted_at, purged_at, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, false, NULL, NULL, $4, NOW())
       ON CONFLICT (company_id, month)
       DO UPDATE SET body = EXCLUDED.body,
                     client_visible = false,
                     deleted_at = NULL,
                     purged_at = NULL,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
      [companyId, targetMonth, raw, +user.userId || null],
    );
    return { ...errorCode.SUCCESS, message: 'Monthly report copied. Client view stays off until you turn it on.' };
  }

  private async clientCanView(companyId: number | null, month: string) {
    if (!companyId) return false;
    try {
      const rows = await this.dataSource.query(
        `SELECT client_visible FROM public.monthly_report_edits
         WHERE company_id = $1 AND month = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [companyId, month],
      );
      return rows[0]?.client_visible === true;
    } catch {
      return false;
    }
  }

  private async loadEdit(companyId: number | null, month: string) {
    if (!companyId) return null;
    try {
      const rows = await this.dataSource.query(
        `SELECT body FROM public.monthly_report_edits WHERE company_id = $1 AND month = $2 LIMIT 1`,
        [companyId, month],
      );
      return rows[0]?.body || null;
    } catch {
      return null;
    }
  }

  private async loadToolbox(start: string, end: string) {
    try {
      const rows = await this.dataSource.query(
        `SELECT s.delivered_at, s.site_name, s.led_by_name, s.notes, t.title
         FROM public.toolbox_sessions s
         INNER JOIN public.toolbox_talks t ON t.id = s.talk_id
         WHERE s.deleted_at IS NULL
           AND s.delivered_at >= $1
           AND s.delivered_at <= $2
         ORDER BY s.delivered_at ASC, s.id ASC`,
        [start, end],
      );
      return rows.map((row: any) => ({
        date: row.delivered_at,
        title: row.title || 'Toolbox talk',
        site: row.site_name || '',
        ledBy: row.led_by_name || '',
        notes: stripHtml(row.notes),
      }));
    } catch {
      return [];
    }
  }

  async createPdf(user: IUserInfo, body: { companyId?: number; month?: string; body?: Record<string, unknown> }) {
    const type = +user?.type;
    if (type !== userType.ADMIN && type !== userType.CUSTOMER) {
      return { ...errorCode.EXCEPTION, message: 'Monthly reports are for admin and customer accounts' };
    }
    const month = String(body?.month || '').trim();
    if (!parseMonth(month)) return { ...errorCode.EXCEPTION, message: 'Choose a month' };
    if (type === userType.CUSTOMER) {
      const scope = await this.resolveCustomer(user, '');
      if ('error' in scope) return scope.error;
      const allowed = await this.clientCanView(scope.companyId, month);
      if (!allowed) {
        return { ...errorCode.EXCEPTION, message: 'This monthly report is not available' };
      }
    }
    const draft = body?.body;
    if (!draft || typeof draft !== 'object') {
      return { ...errorCode.EXCEPTION, message: 'The monthly report is empty' };
    }
    const dateLabel = String(draft.periodLabel || month);
    const clientName = String(draft.clientName || 'Customer');
    try {
      const url = await convertReportLayoutPdf({
        title: 'Monthly Report',
        dateLabel,
        contentHtml: monthlyDraftToReportHtml(draft),
        submittedBy: 'ServiceLink',
        rowNumber: `${clientName} ${month}`,
      });
      return { ...errorCode.SUCCESS, data: { url } };
    } catch (error) {
      return { ...errorCode.EXCEPTION, message: (error as Error)?.message || 'Could not create the PDF' };
    }
  }

  private async countInvoices(ids: number[], start: string, end: string) {
    if (!ids.length) return 0;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM public.invoices
       WHERE customer_id = ANY($1::int[]) AND admin_deleted_at IS NULL
         AND created_at >= $2 AND created_at <= $3`,
      [ids, start, end],
    );
    return +rows[0]?.n || 0;
  }
}

function pdfText(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((row) => (row && typeof row === 'object' ? row as Record<string, unknown> : {})) : [];
}

function pdfNum(value: unknown) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function pdfNil(value: unknown) {
  const text = String(value ?? '').trim();
  return text || 'Nil';
}

type PdfCell = string | { html: string };

function pdfTable(headers: string[], rows: PdfCell[][], numeric: number[] = []) {
  const head = headers.map((header) => `<th>${pdfText(header)}</th>`).join('');
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell, index) => {
      const html = typeof cell === 'object' ? cell.html : pdfText(pdfNil(cell));
      return `<td${numeric.includes(index) ? ' class="num"' : ''}>${html}</td>`;
    }).join('')}</tr>`).join('')
    : `<tr><td class="nil" colspan="${headers.length}">Nil</td></tr>`;
  return `<table class="mp-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function pdfProse(title: string, value: unknown) {
  return `<div class="mp-prose"><h3>${pdfText(title)}</h3><p>${pdfText(pdfNil(value))}</p></div>`;
}

function pdfSection(title: string, body: string) {
  return `<section class="mp-sec"><h2>${pdfText(title)}</h2>${body}</section>`;
}

function pdfMark(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '<span class="mp-muted">—</span>';
  const yes = /^y/i.test(text);
  return `<span class="pill ${yes ? 'pill-yes' : 'pill-no'}">${pdfText(text)}</span>`;
}

const CHART_COLORS = ['#0f5c3f', '#147a54', '#3b82f6', '#6366f1', '#f59e0b', '#dc2626'];

function weeklyChartSvg(rows: { week: string; jobs: number; faults: number; tickets: number }[]) {
  if (!rows.length) return '<p class="mp-nil">No weekly volume recorded.</p>';
  const series = [
    { key: 'jobs' as const, color: '#147a54', name: 'Jobs' },
    { key: 'faults' as const, color: '#dc2626', name: 'Faults' },
    { key: 'tickets' as const, color: '#3b82f6', name: 'Tickets' },
  ];
  const maxRaw = Math.max(1, ...rows.flatMap((row) => series.map((item) => row[item.key])));
  const max = maxRaw <= 4 ? 4 : Math.ceil(maxRaw / 4) * 4;
  const width = 360;
  const height = 210;
  const padL = 36;
  const padB = 36;
  const padT = 8;
  const padR = 6;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const groupW = plotW / rows.length;
  const barW = Math.max(4, Math.min(12, (groupW - 10) / 3));
  const parts: string[] = [];
  for (let step = 0; step <= 4; step += 1) {
    const y = padT + plotH - (plotH * step) / 4;
    const label = String(Math.round((max * step) / 4));
    parts.push(`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="#e5efe9" stroke-width="1"/>`);
    parts.push(`<text x="${padL - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="13" fill="#6b7280">${label}</text>`);
  }
  rows.forEach((row, index) => {
    const gx = padL + index * groupW + (groupW - barW * 3 - 4) / 2;
    series.forEach((item, seriesIndex) => {
      const value = row[item.key];
      const h = (value / max) * plotH;
      const x = gx + seriesIndex * (barW + 2);
      const y = padT + plotH - h;
      parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, value ? 2 : 0).toFixed(1)}" rx="2" fill="${item.color}"/>`);
    });
    const label = row.week.length > 10 ? `${row.week.slice(0, 9)}…` : row.week;
    parts.push(`<text x="${(padL + index * groupW + groupW / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="13" fill="#4d6359">${pdfText(label)}</text>`);
  });
  const legend = series.map((item) => `<span class="mp-key"><i style="background:${item.color}"></i>${item.name}</span>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly volume">${parts.join('')}</svg><div class="mp-legend">${legend}</div>`;
}

function serviceChartSvg(rows: { name: string; value: number }[]) {
  const slices = rows.filter((row) => row.value > 0);
  if (!slices.length) return '<p class="mp-nil">No service totals recorded.</p>';
  const total = slices.reduce((sum, row) => sum + row.value, 0);
  const cx = 78;
  const cy = 78;
  const outer = 62;
  const inner = 38;
  let angle = -Math.PI / 2;
  const paths: string[] = [];
  if (slices.length === 1) {
    paths.push(`<circle cx="${cx}" cy="${cy}" r="${outer}" fill="${CHART_COLORS[0]}"/>`);
    paths.push(`<circle cx="${cx}" cy="${cy}" r="${inner}" fill="#ffffff"/>`);
  } else {
    slices.forEach((row, index) => {
      const sweep = (row.value / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep - 0.02;
      angle += sweep;
      const large = end - start > Math.PI ? 1 : 0;
      const point = (radius: number, theta: number) => [
        cx + radius * Math.cos(theta),
        cy + radius * Math.sin(theta),
      ];
      const [x0, y0] = point(outer, start);
      const [x1, y1] = point(outer, end);
      const [x2, y2] = point(inner, end);
      const [x3, y3] = point(inner, start);
      paths.push(`<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${outer} ${outer} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${inner} ${inner} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z" fill="${CHART_COLORS[index % CHART_COLORS.length]}"/>`);
    });
  }
  paths.push(`<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f5c3f">${total}</text>`);
  paths.push(`<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="13" fill="#6b7280">jobs</text>`);
  const legend = slices.map((row, index) => {
    const pct = Math.round((row.value / total) * 100);
    return `<div class="mp-slice"><i style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></i><span>${pdfText(row.name)}</span><b>${row.value}</b><em>${pct}%</em></div>`;
  }).join('');
  return `<div class="mp-donut"><svg viewBox="0 0 156 156" role="img" aria-label="Work by service">${paths.join('')}</svg><div class="mp-slices">${legend}</div></div>`;
}

function monthlyDraftToReportHtml(draft: Record<string, unknown>) {
  const weekly = asRows(draft.weekly).map((row) => ({
    week: String(row.week || ''),
    jobs: pdfNum(row.jobs),
    faults: pdfNum(row.faults),
    tickets: pdfNum(row.tickets),
  })).filter((row) => row.week || row.jobs || row.faults || row.tickets);
  const services = asRows(draft.services).map((row) => ({
    name: String(row.name || 'Service'),
    value: pdfNum(row.value),
  })).filter((row) => row.name);
  const faultTotal = weekly.reduce((sum, row) => sum + row.faults, 0);
  const ticketTotal = weekly.reduce((sum, row) => sum + row.tickets, 0);
  const serviceTotal = services.reduce((sum, row) => sum + row.value, 0);

  const compliance = asRows(draft.compliance);
  const whs = asRows(draft.whs);
  const environmental = asRows(draft.environmental);
  const streams = asRows(draft.streams);
  const feedback = asRows(draft.feedback);
  const talks = asRows(draft.toolbox);
  const invoices = asRows(draft.invoices);
  const variations = asRows(draft.variations);
  const adhoc = asRows(draft.adhoc);

  const streamHtml = streams.map((stream) => {
    const summary = asRows(stream.summary);
    return `<div class="mp-stream"><h3>${pdfText(String(stream.heading || 'Service'))}</h3>${
      String(stream.note || '').trim() ? `<p class="mp-note">${pdfText(String(stream.note))}</p>` : ''
    }${pdfTable(
      ['Site group', 'Work', 'Schedule', 'Completed', 'Comments'],
      summary.map((row) => [
        String(row.group || ''),
        String(row.description || ''),
        String(row.schedule || ''),
        String(row.completed || ''),
        String(row.comments || ''),
      ]),
      [2, 3],
    )}</div>`;
  }).join('');

  return `<style>
    .tcontent--monthly { border: none; background: transparent; }
    .mp, .mp p, .mp td, .mp th, .mp h2, .mp h3, .mp span, .mp strong, .mp b, .mp em, .mp .pill { font-size: 13px; line-height: 1.45; }
    .mp { color: #1f2937; }
    .mp-kpis { display: flex; gap: 8px; margin-bottom: 14px; }
    .mp-kpi { flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 12px; }
    .mp-kpi-v { font-weight: 700; color: #166534; line-height: 1.2; }
    .mp-kpi-l { margin-top: 2px; font-weight: 700; color: #4d6359; }
    .mp-identity { display: flex; gap: 16px; margin-bottom: 14px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; }
    .mp-identity div { flex: 1; }
    .mp-identity span { display: block; font-weight: 700; color: #6b7280; }
    .mp-identity strong { display: block; margin-top: 2px; font-weight: 600; white-space: pre-wrap; }
    .mp-glance { margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
    .mp-glance h2, .mp-sec h2 { margin: 0 0 8px; padding: 7px 10px; background: #166534; color: #fff; border-radius: 8px; font-weight: 700; }
    .mp-lead { margin: 0 0 10px; color: #4d6359; }
    .mp-charts { display: flex; gap: 10px; }
    .mp-card { flex: 1; min-width: 0; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 10px 8px; background: #fff; }
    .mp-card h3 { margin: 0; font-weight: 700; color: #0f241c; }
    .mp-card p { margin: 2px 0 6px; color: #6b7280; }
    .mp-card svg { width: 100%; height: auto; display: block; }
    .mp-legend, .mp-slices { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-top: 4px; }
    .mp-key, .mp-slice { display: inline-flex; align-items: center; gap: 4px; color: #374151; }
    .mp-key i, .mp-slice i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
    .mp-donut { display: flex; align-items: center; gap: 8px; }
    .mp-donut svg { width: 132px; flex: 0 0 132px; }
    .mp-slices { flex-direction: column; gap: 3px; }
    .mp-slice b { margin-left: auto; }
    .mp-slice em { color: #6b7280; font-style: normal; min-width: 28px; text-align: right; }
    .mp-sec { margin-top: 14px; }
    .mp-prose { margin: 0 0 8px; break-inside: avoid; page-break-inside: avoid; }
    .mp-prose h3, .mp-stream h3, .mp-sec h3 { margin: 8px 0 4px; font-weight: 700; color: #166534; }
    .mp-prose p, .mp-note { margin: 0 0 8px; white-space: pre-wrap; }
    .mp-table { width: 100%; border-collapse: collapse; margin: 0 0 10px; }
    .mp-table th { background: #f0fdf4; color: #166534; font-weight: 700; text-align: left; padding: 6px 7px; border: 1px solid #d1fae5; }
    .mp-table td { padding: 6px 7px; border: 1px solid #e5e7eb; vertical-align: top; white-space: pre-wrap; }
    .mp-table tr { break-inside: avoid; page-break-inside: avoid; }
    .mp-table td.num, .mp-table th:nth-child(n) { }
    .mp-table td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
    .mp-table td.nil, .mp-nil, .mp-muted { color: #6b7280; }
    .mp-stream { margin-bottom: 8px; }
  </style>
  <div class="mp">
    <div class="mp-kpis">
      <div class="mp-kpi"><div class="mp-kpi-v">${pdfText(pdfNil(draft.jobs))}</div><div class="mp-kpi-l">Jobs completed</div></div>
      <div class="mp-kpi"><div class="mp-kpi-v">${pdfText(pdfNil(draft.locations))}</div><div class="mp-kpi-l">Locations</div></div>
      <div class="mp-kpi"><div class="mp-kpi-v">${faultTotal}</div><div class="mp-kpi-l">Faults</div></div>
      <div class="mp-kpi"><div class="mp-kpi-v">${ticketTotal}</div><div class="mp-kpi-l">Tickets</div></div>
      <div class="mp-kpi"><div class="mp-kpi-v">${serviceTotal || services.length}</div><div class="mp-kpi-l">Service jobs</div></div>
    </div>
    <div class="mp-identity">
      <div><span>Client</span><strong>${pdfText(pdfNil(draft.clientName))}</strong></div>
      <div><span>Address</span><strong>${pdfText(pdfNil(draft.address))}</strong></div>
      <div><span>Contact</span><strong>${pdfText(pdfNil(draft.contact))}</strong></div>
      <div><span>Prepared by</span><strong>${pdfText(pdfNil(draft.preparedBy))}</strong></div>
    </div>
    <div class="mp-glance">
      <h2>This month at a glance</h2>
      <p class="mp-lead">${pdfText(pdfNil(draft.glanceNote))} ${pdfText(String(draft.serviceLine || ''))} · ${pdfText(String(draft.periodRange || draft.periodLabel || ''))}</p>
      <div class="mp-charts">
        <article class="mp-card">
          <h3>Weekly volume</h3>
          <p>Completed jobs, faults, and tickets</p>
          ${weeklyChartSvg(weekly)}
        </article>
        <article class="mp-card">
          <h3>Work by service</h3>
          <p>${pdfText(String(draft.periodLabel || ''))}</p>
          ${serviceChartSvg(services)}
        </article>
      </div>
    </div>
    ${pdfSection('1. Overview', [
      pdfProse('1.1 Service delivery', draft.serviceDelivery),
      pdfProse('1.2 Service disruption', draft.disruptions),
      pdfProse('1.3 General issues', draft.generalIssues),
      pdfProse('1.4 Previous minutes', draft.previousMinutes),
    ].join(''))}
    ${pdfSection('2. Contract review', [
      '<h3>2.1 Contract compliance and KPI</h3>',
      pdfTable(
        ['Area', 'Yes', 'No', 'Comments'],
        compliance.map((row) => [
          String(row.area || ''),
          { html: pdfMark(row.yes) },
          { html: pdfMark(row.no) },
          String(row.comments || ''),
        ]),
      ),
      `<h3>2.2 Work health and safety</h3><p class="mp-note">${pdfText(pdfNil(draft.whsScope))}</p>`,
      pdfTable(
        ['Measure', String(draft.whsMonth1 || 'Month 1'), String(draft.whsMonth2 || 'Month 2'), String(draft.whsMonth3 || 'Month 3'), 'Y.T.D.'],
        whs.map((row) => [String(row.label || ''), String(row.m1 || '0'), String(row.m2 || '0'), String(row.m3 || '0'), String(row.ytd || '0')]),
        [1, 2, 3, 4],
      ),
      '<h3>2.3 Environmental issues</h3>',
      pdfTable(
        ['Area', 'Comments'],
        environmental.map((row) => [String(row.area || ''), String(row.comments || '')]),
      ),
    ].join(''))}
    ${pdfSection('3. Inspections', `${streamHtml || '<p class="mp-nil">Nil</p>'}<h3>3.2 ${pdfText(String(draft.feedbackHeading || 'Customer feedback'))}</h3>${pdfTable(
      ['Site', 'Feedback', 'Comment', 'Date rectified'],
      feedback.map((row) => [String(row.site || ''), String(row.feedback || ''), String(row.comment || ''), String(row.rectified || '')]),
    )}`)}
    ${pdfSection('4. Staffing', [
      talks.length
        ? pdfTable(['Toolbox talk', 'Date', 'Detail'], talks.map((talk) => [String(talk.title || ''), String(talk.date || ''), String(talk.detail || '')]))
        : pdfProse('4.1 Toolbox talk', 'Nil'),
      pdfProse('4.2 Staff changes', draft.staffChanges),
      pdfProse('4.3 Staff feedback', draft.staffFeedback),
      pdfProse('4.4 Staffing recognition award', draft.recognition),
    ].join(''))}
    ${pdfSection('5. Financials', [
      pdfProse('5.1 Overdue invoices', draft.invoiceIntro),
      invoices.length ? pdfTable(['Invoice', 'Detail'], invoices.map((row) => [String(row.number || ''), String(row.detail || '')])) : '',
      variations.length
        ? pdfTable(
          ['Site', 'Date', 'Reason', 'Requested by', 'Amount'],
          variations.map((row) => [String(row.site || ''), String(row.date || ''), String(row.reason || ''), String(row.requestedBy || ''), String(row.amount || '')]),
        )
        : pdfProse('5.2 Contract variations', draft.variationComments),
      variations.length ? pdfProse('Variation comments', draft.variationComments) : '',
      adhoc.length
        ? pdfTable(
          ['Site', 'Description', 'Requested by', 'Date', 'Amount'],
          adhoc.map((row) => [String(row.site || ''), String(row.description || ''), String(row.requestedBy || ''), String(row.date || ''), String(row.amount || '')]),
        )
        : pdfProse('5.3 Adhoc work request', draft.adhocComments),
      adhoc.length ? pdfProse('Adhoc comments', draft.adhocComments) : '',
      pdfProse('5.4 Quotes', draft.quotes),
    ].join(''))}
  </div>`;
}
