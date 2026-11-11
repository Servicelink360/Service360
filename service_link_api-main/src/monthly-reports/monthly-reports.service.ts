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
               AND NOT EXISTS (
                 SELECT 1 FROM public.report_templates rt
                 WHERE rt.id = ut.report_template_id
                   AND UPPER(TRIM(COALESCE(rt.category, ''))) IN ('INCIDENT', 'SAFETY_AUDIT')
               )
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
               AND NOT EXISTS (
                 SELECT 1 FROM public.report_templates rt
                 WHERE rt.id = ut.report_template_id
                   AND UPPER(TRIM(COALESCE(rt.category, ''))) IN ('INCIDENT', 'SAFETY_AUDIT')
               )
               AND COALESCE(ut.check_in, ut.created_at) >= $1
             GROUP BY c.company_id, to_char(COALESCE(ut.check_in, ut.created_at), 'YYYY-MM')
           ),
           kept_edits AS (
             SELECT company_id, month, client_visible
             FROM public.monthly_report_edits
             WHERE deleted_at IS NULL AND purged_at IS NULL
           ),
           contracted AS (
             -- When a month is selected, include every company we provide services to (site_items).
             SELECT DISTINCT COALESCE(si.company_id, c.company_id) AS company_id,
                    $2::text AS month
             FROM public.site_items si
             INNER JOIN public.users cu ON cu.id = si.customer_id AND cu.status <> 4
             LEFT JOIN public.customers c ON c.user_id = si.customer_id
             WHERE $2::text IS NOT NULL
               AND COALESCE(si.company_id, c.company_id) IS NOT NULL
           ),
           keys AS (
             SELECT company_id, month FROM job_months
             UNION
             SELECT company_id, month FROM kept_edits
             UNION
             SELECT company_id, month FROM contracted WHERE month IS NOT NULL
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
    const [work, priorWork, faults, priorFaults, tickets, priorTickets, invoices, priorInvoices, personnel, toolbox, edit, contractedServices, consumables] =
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
        this.loadContractedServices(ids, scope.companyId, parsed.month),
        this.loadConsumables(ids, scope.companyId, scope.name, window.start, window.end),
      ]);

    const sites = this.sitesFrom(work, faults, tickets, contractedServices);
    const services = this.servicesFrom(work, contractedServices);
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
            note: 'Submitted reports on New Reports for this month',
          },
          {
            label: 'Faults logged',
            value: faults.length,
            prior: priorFaults,
            note: `${faults.filter((f) => f.priority === 'Urgent').length} urgent · ${
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
        contractedServices,
        consumables,
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
    contracted: { sites: { name: string }[] }[] = [],
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
    contracted.forEach((svc) => {
      (svc.sites || []).forEach((site) => {
        const name = site.name || 'Unnamed site';
        if (!map.has(name)) map.set(name, { site: name, jobs: 0, faults: 0, tickets: 0 });
      });
    });
    return [...map.values()].sort((a, b) => b.jobs + b.faults + b.tickets - (a.jobs + a.faults + a.tickets) || a.site.localeCompare(b.site));
  }

  private servicesFrom(
    work: { service: string }[],
    contracted: { name: string }[] = [],
  ) {
    const map = new Map<string, number>();
    contracted.forEach((row) => {
      const name = row.name || 'Other';
      if (!map.has(name)) map.set(name, 0);
    });
    work.forEach((row) => {
      const name = row.service || 'Other';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }

  /** Visits expected in one month from a detailed schedule cell (Sites frequency grid). */
  private visitsFromCadence(value: unknown): number {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'weekly' || v === 'once') return 4;
    if (v === 'fortnight' || v === 'fortnightly') return 2;
    if (v === 'monthly') return 1;
    if (v === 'daily') return 30;
    return 0;
  }

  /** Visits expected this month from simple Sites frequency (times / period). */
  private visitsFromSimpleFrequency(
    timesRaw: unknown,
    countRaw: unknown,
    periodRaw: unknown,
    month: number,
    daysInMonth: number,
  ): number {
    const period = String(periodRaw || '').trim().toLowerCase();
    if (!period || period === 'na') return 0;
    const times = Math.max(1, Math.floor(Number(timesRaw) || 1));
    const count = Math.max(1, Math.floor(Number(countRaw) || 1));
    if (period === 'day') return Math.max(0, Math.round((times / count) * daysInMonth));
    if (period === 'week') return Math.max(0, Math.round((times / count) * (daysInMonth / 7)));
    if (period === 'month') {
      if (count <= 1) return Math.max(1, times);
      // 1× per N months — due when month index matches the stride (Jan=1).
      const due = ((month - 1) % count) === 0;
      return due ? Math.max(1, times) : 0;
    }
    if (period === 'year') return month === 1 ? Math.max(1, times) : 0;
    return 0;
  }

  /** All services (and sites) assigned to this customer on job sites — not only services with jobs this month. */
  private async loadContractedServices(ids: number[], companyId: number | null, month = 1) {
    type ContractedSite = {
      id: number;
      name: string;
      /** Parent amenity roll-up address listing child parks (1.Park A, 2.Park B, …). */
      addressName?: string;
      frequencyTimes?: number | null;
      frequencyCount?: number | null;
      frequencyPeriod?: string | null;
      monthCadence?: string | null;
      scheduleVisits: number;
    };
    if (!ids.length && !companyId) {
      return [] as { id: number; name: string; sites: ContractedSite[] }[];
    }
    const monthCol = `month_${String(Math.min(12, Math.max(1, month))).padStart(2, '0')}`;
    const daysInMonth = new Date(2000, month, 0).getDate();
    const rows: Array<{
      service_id: number;
      service_name: string;
      site_id: number;
      site_name: string;
      address_name: string;
      site_item_id: number;
      frequency_times: number | null;
      frequency_count: number | null;
      frequency_period: string | null;
      detail_visits: number | null;
      detail_cadence: string | null;
    }> = await this.dataSource.query(
      `SELECT
          sv.id AS service_id,
          COALESCE(NULLIF(TRIM(sv.name), ''), 'Other') AS service_name,
          st.id AS site_id,
          COALESCE(NULLIF(TRIM(st.name), ''), 'Unnamed site') AS site_name,
          COALESCE(NULLIF(TRIM(st.address_name), ''), '') AS address_name,
          si.id AS site_item_id,
          si.frequency_times,
          si.frequency_count,
          si.frequency_period,
          (
            -- One visit expectation per site/service for the month (not sum of every activity line).
            SELECT COALESCE(MAX(
              CASE LOWER(COALESCE(sias.${monthCol}, ''))
                WHEN 'weekly' THEN 4
                WHEN 'once' THEN 4
                WHEN 'fortnight' THEN 2
                WHEN 'fortnightly' THEN 2
                WHEN 'monthly' THEN 1
                WHEN 'daily' THEN 30
                ELSE 0
              END
            ), 0)
            FROM public.site_item_activity_schedules sias
            WHERE sias.site_item_id = si.id
          )::int AS detail_visits,
          (
            SELECT LOWER(COALESCE(sias.${monthCol}, ''))
            FROM public.site_item_activity_schedules sias
            WHERE sias.site_item_id = si.id
              AND COALESCE(sias.${monthCol}, '') <> ''
            ORDER BY sias.id
            LIMIT 1
          ) AS detail_cadence
       FROM public.site_items si
       INNER JOIN public.services sv ON sv.id = si.service_id
       INNER JOIN public.sites st ON st.id = si.site_id
       INNER JOIN public.users cu ON cu.id = si.customer_id AND cu.status <> 4
       WHERE (
         (CARDINALITY($1::int[]) > 0 AND si.customer_id = ANY($1::int[]))
         OR ($2::int IS NOT NULL AND (
           si.company_id = $2
           OR EXISTS (
             SELECT 1 FROM public.customers c
             WHERE c.user_id = si.customer_id AND c.company_id = $2
           )
         ))
       )
       ORDER BY 2 ASC, 4 ASC`,
      [ids, companyId],
    );
    const map = new Map<number, { id: number; name: string; sites: ContractedSite[] }>();
    for (const row of rows) {
      const serviceId = +row.service_id;
      if (!Number.isFinite(serviceId) || serviceId <= 0) continue;
      const entry = map.get(serviceId) || {
        id: serviceId,
        name: row.service_name || 'Other',
        sites: [],
      };
      const siteId = +row.site_id;
      const siteName = row.site_name || 'Unnamed site';
      if (!Number.isFinite(siteId) || siteId <= 0) continue;
      const detailVisits = Math.max(0, Math.floor(Number(row.detail_visits) || 0));
      const simpleVisits = this.visitsFromSimpleFrequency(
        row.frequency_times,
        row.frequency_count,
        row.frequency_period,
        month,
        daysInMonth,
      );
      const scheduleVisits = detailVisits > 0 ? detailVisits : simpleVisits;
      const addressName = String(row.address_name || '').trim();
      const existing = entry.sites.find((site) => site.id === siteId);
      if (existing) {
        existing.scheduleVisits = Math.max(existing.scheduleVisits, scheduleVisits);
        if (!existing.monthCadence && row.detail_cadence) existing.monthCadence = row.detail_cadence;
        if (!existing.addressName && addressName) existing.addressName = addressName;
      } else {
        entry.sites.push({
          id: siteId,
          name: siteName,
          addressName: addressName || undefined,
          frequencyTimes: row.frequency_times,
          frequencyCount: row.frequency_count,
          frequencyPeriod: row.frequency_period,
          monthCadence: row.detail_cadence,
          scheduleVisits,
        });
      }
      map.set(serviceId, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    // Completed = submitted New Reports (/new-reports) for the month — same CUSTOM
    // rows as that page (exclude Incident / Safety Audit sidebar pages).
    const rows = await this.dataSource.query(
      `SELECT ut.id,
              ut.type,
              ut.task_name,
              ut.service_id,
              ut.service_name,
              ut.site_id,
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
         AND UPPER(TRIM(COALESCE(ut.type, ''))) = 'CUSTOM'
         AND NOT EXISTS (
           SELECT 1 FROM public.report_templates rt
           WHERE rt.id = ut.report_template_id
             AND UPPER(TRIM(COALESCE(rt.category, ''))) IN ('INCIDENT', 'SAFETY_AUDIT')
         )
         AND COALESCE(ut.check_in, ut.created_at) >= $2
         AND COALESCE(ut.check_in, ut.created_at) <= $3
       ORDER BY COALESCE(ut.check_in, ut.created_at) DESC, ut.id DESC
       LIMIT 500`,
      [ids, start, end],
    );
    return rows.map((row: any) => ({
      id: +row.id,
      date: row.done_at,
      siteId: row.site_id != null && +row.site_id > 0 ? +row.site_id : null,
      site: row.site_name || '',
      address: row.site_address || '',
      serviceId: row.service_id != null && +row.service_id > 0 ? +row.service_id : null,
      service: row.service_name || row.task_name || 'Job',
      title: row.task_name || row.service_name || 'Completed job',
      detail: stripHtml(row.detail),
      kind: 'Site report',
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
         AND UPPER(TRIM(COALESCE(ut.type, ''))) = 'CUSTOM'
         AND NOT EXISTS (
           SELECT 1 FROM public.report_templates rt
           WHERE rt.id = ut.report_template_id
             AND UPPER(TRIM(COALESCE(rt.category, ''))) IN ('INCIDENT', 'SAFETY_AUDIT')
         )
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
    return rows.map((row: any) => {
      const created = row.created_at ? new Date(row.created_at) : null;
      return {
        id: +row.id,
        // ISO date reported — client formats as DD/MM/YYYY for the feedback table.
        date: created && !Number.isNaN(created.getTime()) ? created.toISOString() : row.created_at,
        site: row.site_name || '',
        service: row.service_name || '',
        title: row.subject || row.issue || 'Fault',
        detail: stripHtml(row.issue),
        priority: +row.priority === 1 ? 'Urgent' : 'Normal',
        status: faultStatus(+row.status),
      };
    });
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

  /** Consumable deliveries emailed to this client in the period (not supplier orders / drafts). */
  private async loadConsumables(
    ids: number[],
    companyId: number | null,
    companyName: string,
    start: string,
    end: string,
  ) {
    if (!ids.length && !companyId) return [];
    const rows: Array<{
      id: number;
      site_name: string | null;
      subject: string | null;
      emailed_to: string | null;
      items_json: string | null;
      emailed_at: Date | string | null;
      created_at: Date | string | null;
    }> = await this.dataSource.query(
      `SELECT d.id,
              d.site_name,
              d.subject,
              d.emailed_to,
              d.items_json,
              d.emailed_at,
              d.created_at
       FROM public.consumable_deliveries d
       WHERE d.deleted_at IS NULL
         AND d.supplier_id IS NULL
         AND (d.emailed_at IS NOT NULL OR d.email_status = 'sent')
         AND COALESCE(d.emailed_at, d.created_at) >= $3
         AND COALESCE(d.emailed_at, d.created_at) <= $4
         AND (
           ($1::int IS NOT NULL AND d.company_id = $1)
           OR (CARDINALITY($2::int[]) > 0 AND d.customer_id = ANY($2::int[]))
           OR (
             d.company_id IS NULL
             AND TRIM(COALESCE($5, '')) <> ''
             AND LOWER(TRIM(d.company_name)) = LOWER(TRIM($5))
           )
         )
       ORDER BY COALESCE(d.emailed_at, d.created_at) DESC, d.id DESC
       LIMIT 200`,
      [companyId, ids, start, end, companyName || ''],
    );
    if (!rows.length) return [];

    const deliveryIds = rows.map((row) => +row.id).filter((id) => id > 0);
    const itemRows: Array<{
      delivery_id: number;
      name: string;
      unit: string | null;
      quantity: string | number | null;
      sort_order: number | null;
    }> = deliveryIds.length
      ? await this.dataSource.query(
          `SELECT delivery_id, name, unit, quantity, sort_order
           FROM public.consumable_delivery_items
           WHERE delivery_id = ANY($1::int[])
           ORDER BY delivery_id ASC, sort_order ASC, id ASC`,
          [deliveryIds],
        )
      : [];
    const itemsByDelivery = new Map<number, string[]>();
    for (const item of itemRows) {
      const deliveryId = +item.delivery_id;
      const qty = Number(item.quantity);
      const qtyLabel = Number.isFinite(qty) ? String(qty) : String(item.quantity || '').trim();
      const unit = String(item.unit || '').trim();
      const name = String(item.name || '').trim() || 'Item';
      const line = [qtyLabel, unit, name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const list = itemsByDelivery.get(deliveryId) || [];
      list.push(line);
      itemsByDelivery.set(deliveryId, list);
    }

    return rows.map((row) => {
      const id = +row.id;
      let items = itemsByDelivery.get(id) || [];
      if (!items.length && row.items_json) {
        try {
          const parsed = JSON.parse(String(row.items_json));
          if (Array.isArray(parsed)) {
            items = parsed.map((entry: any) => {
              const qty = Number(entry?.quantity);
              const qtyLabel = Number.isFinite(qty) ? String(qty) : String(entry?.quantity || '').trim();
              const unit = String(entry?.unit || '').trim();
              const name = String(entry?.name || '').trim() || 'Item';
              return [qtyLabel, unit, name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
            }).filter(Boolean);
          }
        } catch {
          // keep empty items
        }
      }
      return {
        id,
        date: row.emailed_at || row.created_at,
        site: row.site_name || '',
        subject: row.subject || 'Consumables delivery',
        emailedTo: row.emailed_to || '',
        items,
        itemsLabel: items.join('; '),
      };
    });
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
    const serviceLine = String(draft.serviceLine || '').replace(/\s+/g, ' ').trim();
    const subtitle = serviceLine
      ? (/report$/i.test(serviceLine) ? serviceLine : `${serviceLine} Report`)
      : '';
    try {
      const url = await convertReportLayoutPdf({
        title: 'MONTHLY REPORT',
        subtitle,
        dateLabel: String(dateLabel || '').replace(/^\s*monthly\s+report\s*/i, '').trim(),
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

function pdfSection(title: string, body: string, id = '') {
  const anchor = id ? ` id="${id}"` : '';
  return `<section class="mp-sec"${anchor}><h2>${pdfText(title)}</h2>${body}</section>`;
}

function pdfMark(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '<span class="mp-muted">—</span>';
  return pdfText(text);
}

const CHART_COLORS = ['#0f5c3f', '#84cc16', '#3b82f6', '#6366f1', '#f59e0b', '#dc2626'];

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

function pdfGroupIcon(group: string) {
  const text = String(group || '').toLowerCase();
  const svg = (path: string) =>
    `<span class="mp-perf-cat-ico"><svg viewBox="0 0 24 24" width="18" height="18" fill="#0d6b2f"><path d="${path}"/></svg></span>`;
  // Match on-screen reference icons exactly.
  if (/early|learn|child|school|kind|elc|preschool|daycare/.test(text)) {
    return svg('M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z');
  }
  if (/community/.test(text) || (/centre|center/.test(text) && !/town|library|aquatic/.test(text))) {
    return svg('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z');
  }
  if (/town|library|hall/.test(text)) {
    return svg('M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z');
  }
  if (/aquatic|bath|pool|swim/.test(text)) {
    return svg('M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2zm0 18c-2.76 0-5-2.02-5-5.2 0-1.85 1.36-4.22 5-7.76 3.64 3.54 5 5.91 5 7.76 0 3.18-2.24 5.2-5 5.2z');
  }
  if (/park|amenit|cottage|oval|garden|green/.test(text)) {
    return svg('M17 12h2L12 2 5.05 12H7l-3.9 6h6.92v4h3.96v-4H21z');
  }
  if (/depot/.test(text)) {
    return svg('M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z');
  }
  return svg('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z');
}

/** Grouped bars: Schedule vs Completed — performance card matching reference UI. */
function inspectionChartSvg(
  rows: { group: string; schedule: number; completed: number }[],
  title: string,
) {
  const data = rows.filter((row) => row.group || row.schedule || row.completed);
  if (!data.length) return '';
  const series = [
    { key: 'schedule' as const, color: '#064e1b', name: 'Schedule for this month' },
    { key: 'completed' as const, color: '#9ff36c', name: 'Completed' },
  ];
  const maxRaw = Math.max(1, ...data.flatMap((row) => [row.schedule, row.completed]));
  const max = Math.max(4, Math.ceil(maxRaw * 1.28));
  const n = data.length;
  const width = n <= 2 ? 560 : n <= 4 ? 660 : 760;
  const height = 360;
  const padL = 62;
  const padB = 18;
  const padT = 58;
  const padR = 16;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const usable = n <= 2 ? plotW * 0.55 : plotW;
  const offsetX = n <= 2 ? padL + (plotW - usable) / 2 : padL;
  const groupW = usable / n;
  const barW = Math.max(22, Math.min(48, (groupW - 18) / 2));
  const gap = 8;
  const parts: string[] = [];
  for (let step = 0; step <= 4; step += 1) {
    const y = padT + plotH - (plotH * step) / 4;
    const label = String(Math.round((max * step) / 4));
    parts.push(
      `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="#d7e5db" stroke-width="1" stroke-dasharray="5 5"/>`,
    );
    parts.push(
      `<text x="${padL - 8}" y="${(y + 5).toFixed(1)}" text-anchor="end" font-size="15" font-weight="700" fill="#24352c">${label}</text>`,
    );
  }
  parts.push(
    `<text x="16" y="${(padT + plotH / 2).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="#24352c" letter-spacing="0.3" transform="rotate(-90 16 ${(padT + plotH / 2).toFixed(1)})">Schedule reports</text>`,
  );
  data.forEach((row, index) => {
    const gx = offsetX + index * groupW + (groupW - barW * 2 - gap) / 2;
    series.forEach((item, seriesIndex) => {
      const value = row[item.key];
      const h = Math.max((value / max) * plotH, value ? 3 : 0);
      const x = gx + seriesIndex * (barW + gap);
      const y = padT + plotH - h;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${item.color}"/>`,
      );
      if (value > 0) {
        // Keep numbers inside short bars so they are not cut by the % pill above.
        const labelY = h >= 22 ? y + 17 : y + Math.max(h / 2, 9);
        const labelFill = item.key === 'schedule' ? '#fff' : '#064e1b';
        const fontSize = h >= 22 ? 18 : 15;
        parts.push(
          `<text x="${(x + barW / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="800" fill="${labelFill}">${value}</text>`,
        );
      }
    });
    const pct = row.schedule > 0
      ? Math.min(100, Math.round((Math.min(row.completed, row.schedule) / row.schedule) * 100))
      : row.completed > 0 ? 100 : 0;
    // Bracket spans only this pair: left of schedule → right of completed.
    const left = gx;
    const right = gx + barW * 2 + gap;
    const midX = (left + right) / 2;
    const tallH = Math.max(
      (row.schedule / max) * plotH,
      (row.completed / max) * plotH,
      row.schedule || row.completed ? 3 : 0,
    );
    const topY = padT + plotH - tallH;
    const lift = tallH < 28 ? 22 : 14;
    parts.push(
      `<line x1="${left.toFixed(1)}" y1="${(topY - 4).toFixed(1)}" x2="${left.toFixed(1)}" y2="${(topY - 14).toFixed(1)}" stroke="#b6f08a" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="${left.toFixed(1)}" y1="${(topY - 14).toFixed(1)}" x2="${right.toFixed(1)}" y2="${(topY - 14).toFixed(1)}" stroke="#b6f08a" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="${right.toFixed(1)}" y1="${(topY - 14).toFixed(1)}" x2="${right.toFixed(1)}" y2="${(topY - 4).toFixed(1)}" stroke="#b6f08a" stroke-width="2" stroke-linecap="round"/>`,
    );
    const pill = `${pct}%`;
    const pillW = Math.max(58, pill.length * 11 + 24);
    parts.push(
      `<rect x="${(midX - pillW / 2).toFixed(1)}" y="${(topY - 28 - lift).toFixed(1)}" width="${pillW}" height="28" rx="14" fill="#c8f7a6"/>`,
      `<text x="${midX.toFixed(1)}" y="${(topY - 14 - lift).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="800" fill="#064e1b">${pill}</text>`,
    );
  });
  const scheduleTotal = data.reduce((sum, row) => sum + row.schedule, 0);
  const completedTotal = data.reduce((sum, row) => sum + row.completed, 0);
  const cappedCompleted = data.reduce(
    (sum, row) => sum + (row.schedule > 0 ? Math.min(row.completed, row.schedule) : 0),
    0,
  );
  const overallPct = scheduleTotal > 0
    ? Math.round((cappedCompleted / scheduleTotal) * 100)
    : completedTotal > 0 ? 100 : 0;
  const pctLabel = `${overallPct}%`;
  // Same band geometry as bars (offsetX + usable), so chips stay under each pair.
  const catInset = ((offsetX / width) * 100).toFixed(2);
  const catSpan = ((usable / width) * 100).toFixed(2);
  const cats = data
    .map(
      (row) =>
        `<div class="mp-perf-cat">${pdfGroupIcon(row.group)}<span class="mp-perf-cat-label">${pdfText(row.group)}</span></div>`,
    )
    .join('');
  const stat = (
    label: string,
    value: string,
    icon: string,
    accent = false,
  ) =>
    `<div class="mp-perf-stat${accent ? ' accent' : ''}">${icon}<div><em>${label}</em><strong>${value}</strong></div></div>`;
  const ico = (path: string, size = 21) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="#147a3a" aria-hidden="true"><path d="${path}"/></svg>`;
  // Same icons as on-screen reference rail.
  const icoCheck = ico('M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', 21);
  const icoCal = ico('M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z');
  const icoDone = ico('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z');
  const icoAim = ico('M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z');
  return `<div class="mp-perf-card">
    <div class="mp-perf-head"><strong>${pdfText(title)}</strong><span>Schedule vs completed by site group</span></div>
    <div class="mp-perf-layout">
      <div class="mp-perf-main">
        <div class="mp-perf-body">
          <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${pdfText(title)}">${parts.join('')}</svg>
          <div class="mp-perf-cats" style="margin-left:${catInset}%;width:${catSpan}%">${cats}</div>
        </div>
        <div class="mp-perf-foot">
          <div class="mp-legend">
            <span class="mp-key"><i style="background:#064e1b"></i>Schedule for this month</span>
            <span class="mp-key"><i style="background:#9ff36c"></i>Completed</span>
          </div>
        </div>
      </div>
      <div class="mp-perf-stats">
        ${stat('Overall Completion', pctLabel, icoCheck, true)}
        ${stat('Total Scheduled', String(scheduleTotal), icoCal)}
        ${stat('Total Completed', String(completedTotal), icoDone)}
        ${stat('Completion Rate', pctLabel, icoAim)}
      </div>
    </div>
  </div>`;
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
    const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
    return `<div class="mp-slice"><i style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></i><span>${pdfText(row.name)}</span><b>${row.value} · ${pct}%</b></div>`;
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
  const consumables = asRows(draft.consumables);

  const streamHtml = streams.map((stream) => {
    const summary = asRows(stream.summary);
    const visits = asRows(stream.visits);
    const showQuality = stream.showQuality === true || stream.showQuality === 'true';
    const periodHint = String(summary[0]?.month || draft.periodLabel || '').trim();
    const chartTitleBase = String(stream.detailHeading || stream.heading || 'Site inspections').trim();
    const chartTitle = periodHint
      ? `${chartTitleBase} – Overall Result (${periodHint})`
      : `${chartTitleBase} – Overall Result`;
    const chartRows = summary.map((row) => ({
      group: String(row.group || 'Sites'),
      schedule: pdfNum(row.schedule),
      completed: pdfNum(row.completed),
    }));
    const summaryTable = pdfTable(
      ['Month', 'Site', 'Description', 'Schedule for this month', 'Completed', 'Comments'],
      summary.map((row) => [
        String(row.month || ''),
        String(row.group || ''),
        String(row.description || ''),
        String(row.schedule || ''),
        String(row.completed || ''),
        String(row.comments || ''),
      ]),
      [3, 4],
    );
    const isPdfAmenityParent = (row: Record<string, unknown>) => {
      if (row.isGroupHeader) return true;
      const site = String(row.site || '');
      if (!/\bpublic\s+amenities\b/i.test(site)) return false;
      const hasDates = String(row.dates || row.date || '').trim().length > 0;
      return !hasDates;
    };
    const childSiteCell = (site: string): PdfCell => ({
      html: `<span class="mp-visit-child-site"><span class="mp-visit-site-ico">⌂</span><strong>${pdfText(site)}</strong></span>`,
    });
    const blankVisitCell: PdfCell = { html: '&nbsp;' };
    const visitTextCell = (value: unknown): PdfCell | string => {
      const text = String(value ?? '').trim();
      return text || blankVisitCell;
    };
    // Parent name sits above each child table (Bayside / Mascot on top of their parks).
    type PdfVisitBlock = { parent: string | null; rows: Record<string, unknown>[] };
    const pdfBlocks: PdfVisitBlock[] = [];
    let pdfCurrent: PdfVisitBlock | null = null;
    visits.forEach((row) => {
      if (isPdfAmenityParent(row)) {
        pdfCurrent = { parent: String(row.site || '').replace(/\s+/g, ' ').trim(), rows: [] };
        pdfBlocks.push(pdfCurrent);
        return;
      }
      if (pdfCurrent && row.isGroupChild) {
        pdfCurrent.rows.push(row);
        return;
      }
      pdfCurrent = null;
      const last = pdfBlocks[pdfBlocks.length - 1];
      if (last && !last.parent) last.rows.push(row);
      else pdfBlocks.push({ parent: null, rows: [row] });
    });
    const pdfRank = (block: PdfVisitBlock) => {
      if (!block.parent) return 50;
      if (/bayside/i.test(block.parent)) return 0;
      if (/mascot/i.test(block.parent)) return 1;
      return 10;
    };
    pdfBlocks.sort((a, b) => pdfRank(a) - pdfRank(b));
    const tableForRows = (blockRows: Record<string, unknown>[]) => {
      if (!blockRows.length) {
        return showQuality
          ? pdfTable(['Sites', 'Date of Inspection', 'Cleaning Quality(%)', 'Comments'], [])
          : pdfTable(['Sites', 'Date of Service', 'Comments'], []);
      }
      if (showQuality) {
        return pdfTable(
          ['Sites', 'Date of Inspection', 'Cleaning Quality(%)', 'Comments'],
          blockRows.map((row) => {
            const isChild = Boolean(row.isGroupChild);
            const quality = String(row.quality || '').trim();
            const qualityCell = /satisfactory|good|excellent|pass/i.test(quality)
              ? { html: `<span class="mp-quality-pill">${pdfText(quality)}</span>` }
              : visitTextCell(quality);
            return [
              isChild ? childSiteCell(String(row.site || '')) : String(row.site || ''),
              visitTextCell(row.dates || row.date),
              qualityCell,
              visitTextCell(row.comments),
            ];
          }),
          [2],
        );
      }
      return pdfTable(
        ['Sites', 'Date of Service', 'Comments'],
        blockRows.map((row) => {
          const isChild = Boolean(row.isGroupChild);
          return [
            isChild ? childSiteCell(String(row.site || '')) : String(row.site || ''),
            visitTextCell(row.dates || row.date),
            visitTextCell(row.comments),
          ];
        }),
      );
    };
    const visitBlock = visits.length
      ? pdfBlocks.map((block) => {
        // Skip empty parent amenity shells (no dated child rows) — common on Adhoc drafts.
        const datedRows = block.rows.filter((row) => String(row.dates || row.date || '').trim());
        if (block.parent && !datedRows.length) return '';
        const head = block.parent
          ? `<div class="mp-visit-parent-head"><span class="mp-visit-parent-ico">▣</span><strong class="mp-visit-group">${pdfText(block.parent)}</strong></div>`
          : '';
        const body = tableForRows(block.parent ? datedRows : block.rows);
        return block.parent
          ? `<div class="mp-visit-block">${head}<div class="mp-visit-card">${body}</div></div>`
          : body;
      }).filter(Boolean).join('')
      : '';
    const detailHead = String(stream.detailHeading || '').trim();
    const detailNote = String(stream.detailNote || '').trim();
    const chartHtml = inspectionChartSvg(chartRows, chartTitle);
    return `<div class="mp-stream"><h3>${pdfText(String(stream.heading || 'Service'))}</h3>${
      String(stream.note || '').trim() ? `<p class="mp-note">${pdfText(String(stream.note))}</p>` : ''
    }${summaryTable}${chartHtml}${
      detailHead || visitBlock
        ? `${detailHead ? `<h3>${pdfText(detailHead)}</h3>` : ''}${
            detailNote ? `<p class="mp-note">${pdfText(detailNote)}</p>` : ''
          }${visitBlock}`
        : ''
    }</div>`;
  }).join('');

  const jobsCompleted = pdfText(pdfNil(draft.jobs));
  const locationsServiced = pdfText(pdfNil(draft.locations));
  const periodService = String(draft.serviceLine || '').replace(/\s+/g, ' ').trim();
  const periodReportName = periodService
    ? (/report$/i.test(periodService) ? periodService : `${periodService} Report`)
    : '';
  const periodBar = `${pdfText(periodReportName)}${periodReportName && (draft.periodRange || draft.periodLabel) ? ' – ' : ''}${pdfText(String(draft.periodRange || draft.periodLabel || ''))}`;

  return `<style>
    .tcontent--monthly { border: none; background: transparent; }
    .mp, .mp p, .mp td, .mp th, .mp h2, .mp h3, .mp span, .mp strong, .mp b, .mp em, .mp .pill { font-size: 13px; line-height: 1.45; }
    .mp { color: #1f2937; }
    .mp-cover { break-after: page; page-break-after: always; }
    .mp-identity { display: flex; gap: 0; margin: 0 0 12px; border: 1px solid #d7e3dc; border-radius: 10px; overflow: hidden; background: #fff; }
    .mp-identity > div { flex: 1; display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-right: 1px solid #dce5dd; }
    .mp-identity > div:last-child { border-right: none; }
    .mp-id-ico { width: 16px; height: 16px; flex: 0 0 16px; margin-top: 2px; color: #246a38; }
    .mp-identity em { display: block; font-style: normal; font-weight: 800; color: #18241b; font-size: 11px; margin-bottom: 3px; }
    .mp-identity strong { display: block; font-weight: 700; white-space: pre-wrap; color: #0f241c; font-size: 12px; line-height: 1.35; }
    .mp-toc { margin: 0; padding: 8px 10px; border: 1px solid #d1fae5; border-radius: 10px; background: #f0fdf4; break-inside: avoid; page-break-inside: avoid; }
    .mp-toc h2 { margin: 0 0 8px; padding: 7px 10px; background: #166534; color: #fff; border-radius: 8px; font-weight: 700; }
    .mp-toc-row { display: flex; align-items: baseline; gap: 6px; margin: 0 0 3px; font-weight: 700; color: #0f241c; }
    .mp-toc-row.sub { padding-left: 14px; font-weight: 400; color: #4d6359; }
    .mp-toc-row a { color: inherit; text-decoration: none; }
    .mp-toc-row a:hover { color: #166534; text-decoration: underline; }
    .mp-toc-row i { flex: 1; min-width: 16px; border-bottom: 1px dotted #9ca3af; }
    .mp-toc-row b { flex: 0 0 auto; font-weight: 700; color: #166534; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .mp-glance { margin: 0 0 8px; border: 1px solid #d1fae5; border-radius: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .mp-glance > h2 { margin: 0; border-radius: 0; background: linear-gradient(90deg, #165624 0%, #388e3c 100%); }
    .mp-glance-lead { margin: 0; padding: 6px 12px 0; color: #f0f8ec; font-size: 12px; }
    .mp-glance-grid { display: flex; gap: 8px; padding: 8px; background: #fff; }
    .mp-stats { width: 150px; flex: 0 0 150px; display: flex; flex-direction: column; gap: 6px; }
    .mp-stat { display: flex; align-items: center; gap: 8px; background: #eaf4ec; border-radius: 8px; padding: 7px 8px; }
    .mp-stat-ico { width: 16px; height: 16px; flex: 0 0 16px; color: #2c7a3f; }
    .mp-stat strong { display: block; color: #18241b; font-size: 16px; line-height: 1.1; }
    .mp-stat span { display: block; color: #2e3a31; font-weight: 600; font-size: 11px; }
    .mp-period-bar { margin: 0 8px 10px; padding: 8px 12px; border-radius: 8px; background: #eaf4ec; border: 1px solid #cfe6d4; color: #18241b; font-weight: 800; }
    .mp-glance h2, .mp-sec h2 { margin: 0 0 8px; padding: 7px 10px; background: #166534; color: #fff; border-radius: 8px; font-weight: 700; }
    .mp-lead { margin: 0 0 10px; color: #4d6359; }
    .mp-charts { display: flex; gap: 8px; flex: 1; min-width: 0; }
    .mp-card { flex: 1; min-width: 0; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 10px 8px; background: #fff; }
    .mp-card h3 { margin: 0; font-weight: 700; color: #0f241c; }
    .mp-card p { margin: 2px 0 6px; color: #6b7280; }
    .mp-card svg { width: 100%; height: auto; display: block; }
    .mp-legend, .mp-slices { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-top: 4px; }
    .mp-key, .mp-slice { display: inline-flex; align-items: center; gap: 4px; color: #374151; }
    .mp-key i, .mp-slice i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
    .mp-donut { display: flex; align-items: center; gap: 8px; }
    .mp-donut svg { width: 120px; flex: 0 0 120px; }
    .mp-slices { flex-direction: column; gap: 3px; }
    .mp-slice b { margin-left: auto; }
    .mp-sec { margin-top: 14px; page-break-before: always; break-before: page; }
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
    .mp-visit-block { margin: 0 0 12px; border: 1px solid #d7e5db; border-radius: 10px; overflow: hidden; }
    .mp-visit-parent-head {
      display: flex; align-items: center; gap: 10px; margin: 0;
      padding: 10px 12px; background: linear-gradient(90deg, #0f5c3f 0%, #1f7a45 100%);
    }
    .mp-visit-parent-ico { color: #fff; font-size: 14px; line-height: 1; }
    .mp-visit-group { color: #fff; font-weight: 800; white-space: nowrap; font-size: 13px; }
    .mp-visit-card { background: #fff; }
    .mp-visit-card .mp-table { margin: 0; }
    .mp-visit-card .mp-table th { background: #eaf7ee; color: #0f5c3f; }
    .mp-visit-child-site { display: inline-flex; align-items: center; gap: 6px; color: #0f5c3f; }
    .mp-visit-child-site strong { font-weight: 800; }
    .mp-visit-site-ico {
      display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center;
      border-radius: 4px; background: #e7f6eb; color: #166534; font-size: 10px;
    }
    .mp-quality-pill {
      display: inline-block; padding: 3px 10px; border-radius: 999px;
      background: #e7f6eb; color: #0f5c3f; font-weight: 800; font-size: 11px;
    }
    .mp-stream { margin-bottom: 8px; }
    .mp-perf-card, .mp-perf-banner, .mp-perf-body, .mp-perf-foot, .mp-perf-cat, .mp-perf-stat, .mp-perf-stat strong {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .mp-perf-card { margin: 10px 0 12px; border: 1px solid #d5e3d9; border-radius: 14px; overflow: hidden; background: #fff; break-inside: avoid; page-break-inside: avoid; }
    .mp-perf-head { padding: 12px 14px 8px; background: #fff; border-bottom: 1px solid #edf3ee; }
    .mp-perf-head strong { display: block; font-size: 13px; font-weight: 800; color: #12241b; line-height: 1.35; }
    .mp-perf-head span { display: block; margin-top: 3px; font-size: 11px; color: #5a6d62; }
    .mp-perf-layout { display: table; width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 10px; padding: 4px 4px 8px; }
    .mp-perf-main, .mp-perf-stats { display: table-cell; vertical-align: top; }
    .mp-perf-main { width: 80%; border: 1px solid #e4eee7; border-radius: 12px; overflow: hidden; }
    .mp-perf-stats { width: 20%; }
    .mp-perf-body { padding: 6px 10px 8px; background: #fff; }
    .mp-perf-body > svg { width: 100%; height: auto; display: block; }
    .mp-perf-cats { display: table; table-layout: fixed; border-collapse: separate; border-spacing: 0; margin-top: 8px; box-sizing: border-box; }
    .mp-perf-cat { display: table-cell; vertical-align: top; padding: 10px 4px 8px; border-radius: 10px; background: #f4faf5; border: 1px solid #ddeee1; text-align: center; color: #12241b; font-size: 10px; font-weight: 700; line-height: 1.2; }
    .mp-perf-cat-ico { display: inline-flex; width: 28px; height: 28px; border-radius: 999px; align-items: center; justify-content: center; background: #fff; border: 1px solid #cfe8c4; margin: 0 auto 6px; }
    .mp-perf-cat-ico svg { display: block; margin: 0; width: 16px; height: 16px; }
    .mp-perf-cat-label { display: block; }
    .mp-perf-foot { margin: 0; padding: 8px 10px; border-top: 1px solid #e4eee7; background: #f7faf8; }
    .mp-perf-foot .mp-legend { margin: 0; gap: 12px 16px; }
    .mp-perf-stat { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 11px 10px; border: 1px solid #d9e7dc; border-radius: 12px; background: #f8fbf9; color: #0f241c; }
    .mp-perf-stat:last-child { margin-bottom: 0; }
    .mp-perf-stat.accent { background: #eef9d8; border-color: #c4e89a; }
    .mp-perf-stat svg { flex: 0 0 auto; display: block; width: 20px; height: 20px; }
    .mp-perf-stat em { display: block; font-style: normal; font-size: 10px; font-weight: 600; color: #4d6359; line-height: 1.15; }
    .mp-perf-stat strong { display: block; margin-top: 2px; font-size: 16px; font-weight: 800; color: #064e1b; line-height: 1; }
    .mp-perf-stat.accent strong { font-size: 17px; }
  </style>
  <div class="mp">
    <div class="mp-cover">
      <div class="mp-identity">
        <div>
          <svg class="mp-id-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <div><em>Client</em><strong>${pdfText(pdfNil(draft.clientName))}</strong></div>
        </div>
        <div>
          <svg class="mp-id-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
          <div><em>Address</em><strong>${pdfText(pdfNil(draft.address))}</strong></div>
        </div>
        <div>
          <svg class="mp-id-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.4 21 3 13.6 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.58a1 1 0 0 1-.25 1.02l-2.2 2.19z"/></svg>
          <div><em>Contact</em><strong>${pdfText(pdfNil(draft.contact)).replace(/\s*·\s*/g, '\n')}</strong></div>
        </div>
        <div>
          <svg class="mp-id-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L19.5 9H15zM12 11c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 8H8v-1.2c0-1.33 2.67-2 4-2s4 .67 4 2V19z"/></svg>
          <div><em>Prepared by</em><strong>${pdfText(pdfNil(draft.preparedBy))}</strong></div>
        </div>
      </div>
      <div class="mp-toc">
        <h2>Table of contents</h2>
        <div class="mp-toc-row"><a href="#mp-glance">This month at a glance</a><i></i><b>Page 2</b></div>
        <div class="mp-toc-row"><a href="#mp-overview">1. Overview</a><i></i><b>Page 3</b></div>
        <div class="mp-toc-row sub"><a href="#mp-overview-delivery">1.1 Service delivery</a><i></i><b>Page 3</b></div>
        <div class="mp-toc-row sub"><a href="#mp-overview-disruption">1.2 Service disruption</a><i></i><b>Page 3</b></div>
        <div class="mp-toc-row sub"><a href="#mp-overview-minutes">1.3 Previous minutes</a><i></i><b>Page 3</b></div>
        <div class="mp-toc-row"><a href="#mp-contract">2. Contract review</a><i></i><b>Page 4</b></div>
        <div class="mp-toc-row sub"><a href="#mp-contract-compliance">2.1 Contract compliance and KPI</a><i></i><b>Page 4</b></div>
        <div class="mp-toc-row sub"><a href="#mp-contract-whs">2.2 Work health and safety</a><i></i><b>Page 4</b></div>
        <div class="mp-toc-row sub"><a href="#mp-contract-env">2.3 Environmental issues</a><i></i><b>Page 4</b></div>
        <div class="mp-toc-row"><a href="#mp-inspections">3. Inspections</a><i></i><b>Page 5</b></div>
        <div class="mp-toc-row sub"><a href="#mp-inspections-sites">3.1 Site inspections</a><i></i><b>Page 5</b></div>
        <div class="mp-toc-row sub"><a href="#mp-faults">3.2 Faults Reports</a><i></i><b>Page 5</b></div>
        <div class="mp-toc-row"><a href="#mp-staffing">4. Staffing</a><i></i><b>Page 6</b></div>
        <div class="mp-toc-row sub"><a href="#mp-staffing-toolbox">4.1 Toolbox talk</a><i></i><b>Page 6</b></div>
        <div class="mp-toc-row sub"><a href="#mp-staffing-changes">4.2 Staff changes</a><i></i><b>Page 6</b></div>
        <div class="mp-toc-row sub"><a href="#mp-staffing-feedback">4.3 Staff feedback</a><i></i><b>Page 6</b></div>
        <div class="mp-toc-row sub"><a href="#mp-staffing-recognition">4.4 Staffing recognition award</a><i></i><b>Page 6</b></div>
        <div class="mp-toc-row"><a href="#mp-financials">5. Financials</a><i></i><b>Page 7</b></div>
        <div class="mp-toc-row sub"><a href="#mp-financials-invoices">5.1 Overdue invoices</a><i></i><b>Page 7</b></div>
        <div class="mp-toc-row sub"><a href="#mp-financials-variations">5.2 Contract variations</a><i></i><b>Page 7</b></div>
        <div class="mp-toc-row sub"><a href="#mp-financials-adhoc">5.3 Adhoc work request</a><i></i><b>Page 7</b></div>
        <div class="mp-toc-row sub"><a href="#mp-financials-quotes">5.4 Quotes</a><i></i><b>Page 7</b></div>
      </div>
    </div>
    <div class="mp-glance" id="mp-glance">
      <h2>This month at a glance <span style="float:right;font-weight:500;font-size:12px;opacity:.9">Weekly volume and work by service.</span></h2>
      <div class="mp-glance-grid">
        <div class="mp-stats">
          <div class="mp-stat"><svg class="mp-stat-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg><div><strong>${serviceTotal || jobsCompleted}</strong><span>Service jobs</span></div></div>
          <div class="mp-stat"><svg class="mp-stat-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><div><strong>${jobsCompleted}</strong><span>Jobs completed</span></div></div>
          <div class="mp-stat"><svg class="mp-stat-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg><div><strong>${locationsServiced}</strong><span>Locations serviced</span></div></div>
          <div class="mp-stat"><svg class="mp-stat-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.7 19.3l-1.4 1.4a1 1 0 0 1-1.4 0L11.5 12.3l-2.1 2.1 1.4 1.4a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4 0L2.7 13.3a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0l1.4 1.4 2.1-2.1L2.4 4.2a1 1 0 0 1 0-1.4L3.8 1.4a1 1 0 0 1 1.4 0l6.6 6.6L18.4 1.4a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L14.6 10l2.1 2.1 1.4-1.4a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L18.5 16l2.8 2.8a1 1 0 0 1 1.4.5z"/></svg><div><strong>${faultTotal}</strong><span>Faults resolved</span></div></div>
          <div class="mp-stat"><svg class="mp-stat-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.41l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.83zM5.5 7A1.5 1.5 0 1 1 7 5.5 1.5 1.5 0 0 1 5.5 7z"/></svg><div><strong>${ticketTotal}</strong><span>Open tickets</span></div></div>
        </div>
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
      ${periodBar ? `<div class="mp-period-bar">${periodBar}</div>` : ''}
    </div>
    ${pdfSection('1. Overview', [
      `<div id="mp-overview-delivery">${pdfProse('1.1 Service delivery', draft.serviceDelivery)}</div>`,
      `<div id="mp-overview-disruption">${pdfProse('1.2 Service disruption', draft.disruptions)}</div>`,
      `<div id="mp-overview-minutes">${pdfProse('1.3 Previous minutes', draft.previousMinutes)}</div>`,
    ].join(''), 'mp-overview')}
    ${pdfSection('2. Contract review', [
      '<h3 id="mp-contract-compliance">2.1 Contract compliance and KPI</h3>',
      pdfTable(
        ['Area', 'Yes', 'No', 'Comments'],
        compliance.map((row) => [
          String(row.area || ''),
          { html: pdfMark(row.yes) },
          { html: pdfMark(row.no) },
          String(row.comments || ''),
        ]),
      ),
      `<h3 id="mp-contract-whs">2.2 Work health and safety</h3><p class="mp-note">${pdfText(pdfNil(draft.whsScope))}</p>`,
      pdfTable(
        ['Measure', String(draft.whsMonth1 || 'Month 1'), String(draft.whsMonth2 || 'Month 2'), String(draft.whsMonth3 || 'Month 3'), 'Y.T.D.'],
        whs.map((row) => [String(row.label || ''), String(row.m1 || '0'), String(row.m2 || '0'), String(row.m3 || '0'), String(row.ytd || '0')]),
        [1, 2, 3, 4],
      ),
      '<h3 id="mp-contract-env">2.3 Environmental issues</h3>',
      pdfTable(
        ['Area', 'Comments'],
        environmental.map((row) => [String(row.area || ''), String(row.comments || '')]),
      ),
    ].join(''), 'mp-contract')}
    ${pdfSection('3. Inspections', `<div id="mp-inspections-sites">${streamHtml || '<p class="mp-nil">Nil</p>'}</div><h3 id="mp-faults">3.2 ${pdfText((() => {
      const heading = String(draft.feedbackHeading || '').trim();
      if (!heading) return 'Faults Reports';
      if (/\bfeedback$/i.test(heading)) return heading.replace(/\s*feedback\s*$/i, ' Faults Reports').replace(/\s+/g, ' ').trim();
      return heading;
    })())}</h3>${pdfTable(
      ['Site', 'Fault', 'Comment', 'Date reported'],
      feedback.map((row) => {
        const reported = String(row.rectified || row.date || '').trim();
        const dateText = reported && !/^nil$/i.test(reported) ? reported : '';
        return [
          String(row.site || ''),
          String(row.feedback || ''),
          String(row.comment || ''),
          { html: pdfText(dateText) },
        ];
      }),
    )}`, 'mp-inspections')}
    ${pdfSection('4. Staffing', [
      `<div id="mp-staffing-toolbox">${talks.length
        ? pdfTable(['Toolbox talk', 'Date', 'Detail'], talks.map((talk) => [String(talk.title || ''), String(talk.date || ''), String(talk.detail || '')]))
        : pdfProse('4.1 Toolbox talk', 'Nil')}</div>`,
      `<div id="mp-staffing-changes">${pdfProse('4.2 Staff changes', draft.staffChanges)}</div>`,
      `<div id="mp-staffing-feedback">${pdfProse('4.3 Staff feedback', draft.staffFeedback)}</div>`,
      `<div id="mp-staffing-recognition">${pdfProse('4.4 Staffing recognition award', draft.recognition)}</div>`,
    ].join(''), 'mp-staffing')}
    ${pdfSection('5. Financials', [
      `<div id="mp-financials-invoices">${pdfProse('5.1 Overdue invoices', draft.invoiceIntro)}${invoices.length ? pdfTable(['Invoice', 'Detail'], invoices.map((row) => [String(row.number || ''), String(row.detail || '')])) : ''}</div>`,
      `<div id="mp-financials-variations">${variations.length
        ? pdfTable(
          ['Site', 'Date', 'Reason', 'Requested by', 'Amount'],
          variations.map((row) => [String(row.site || ''), String(row.date || ''), String(row.reason || ''), String(row.requestedBy || ''), String(row.amount || '')]),
        )
        : pdfProse('5.2 Contract variations', draft.variationComments)}${variations.length ? pdfProse('Variation comments', draft.variationComments) : ''}</div>`,
      `<div id="mp-financials-adhoc">${adhoc.length
        ? pdfTable(
          ['Site', 'Description', 'Requested by', 'Date', 'Amount'],
          adhoc.map((row) => [String(row.site || ''), String(row.description || ''), String(row.requestedBy || ''), String(row.date || ''), String(row.amount || '')]),
        )
        : pdfProse('5.3 Adhoc work request', draft.adhocComments)}${adhoc.length ? pdfProse('Adhoc comments', draft.adhocComments) : ''}</div>`,
      `<div id="mp-financials-quotes">${pdfProse('5.4 Quotes', draft.quotes)}</div>`,
      `<div id="mp-financials-consumables">${consumables.length
        ? pdfTable(
          ['Date', 'Site', 'Subject', 'Items'],
          consumables.map((row) => [
            String(row.date || ''),
            String(row.site || ''),
            String(row.subject || ''),
            String(row.items || row.itemsLabel || ''),
          ]),
        )
        : pdfProse('5.5 Consumables delivered', draft.consumablesComments)}${consumables.length ? pdfProse('Consumables comments', draft.consumablesComments) : ''}</div>`,
    ].join(''), 'mp-financials')}
  </div>`;
}
