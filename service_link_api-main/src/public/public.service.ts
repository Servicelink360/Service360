import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { dJobStatus, reportFaultStatus, ticketStatus } from '../constants/status';

export type OpsStats = {
  sitesCount: number;
  liveSitesCount: number;
  newReportsCount: number;
  /** All non-deleted faults created this calendar week (= new this week) */
  openFaultsCount: number;
  /** PENDING + INPROGRESS created this calendar month (= in progress) */
  pendingFaultsCount: number;
  /** All non-deleted faults from previous months (= fixed) */
  fixedFaultsCount: number;
  openTicketsCount: number;
  completedReportsLast30Days: number;
  faultsLast30Days: number;
  updatedAt: string;
};

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getOpsStats() {
    try {
      const [
        sitesCount,
        liveSitesCount,
        completedReportsLast30Days,
        faultBreakdown,
        openTicketsCount,
        faultsLast30Days,
      ] = await Promise.all([
        this.countSites(),
        this.countLiveSites(),
        this.countCompletedReportsLastDays(30),
        this.countFaultsByStatus(),
        this.countOpenTickets(),
        this.countFaultsLastDays(30),
      ]);

      const data: OpsStats = {
        sitesCount,
        liveSitesCount,
        /** Marketing “new reports” = completed custom reports in last 30 days */
        newReportsCount: completedReportsLast30Days,
        openFaultsCount: faultBreakdown.open,
        pendingFaultsCount: faultBreakdown.pending,
        fixedFaultsCount: faultBreakdown.fixed,
        openTicketsCount,
        completedReportsLast30Days,
        faultsLast30Days,
        updatedAt: new Date().toISOString(),
      };

      return { ...errorCode.SUCCESS, data };
    } catch (err) {
      this.logger.error('getOpsStats failed', err instanceof Error ? err.stack : String(err));
      return errorCode.EXCEPTION;
    }
  }

  private async countSites(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT s.id)::int AS count
       FROM sites s
       INNER JOIN site_items si ON si.site_id = s.id`,
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  /** Sites with at least one staff member currently checked in (no check-out today). */
  private async countLiveSites(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT j.site_id)::int AS count
       FROM user_daily_job_items i
       INNER JOIN user_daily_jobs j ON j.id = i.user_daily_job_id
       WHERE i.type = 1
         AND i.check_out IS NULL
         AND (j.date AT TIME ZONE 'Australia/Sydney')::date
             = (NOW() AT TIME ZONE 'Australia/Sydney')::date`,
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  private async countCompletedReportsLastDays(days: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM user_tasks
       WHERE type = 'CUSTOM'
         AND status = $1
         AND staff_id > 0
         AND staff_id <> customer_id
         AND created_at >= NOW() - ($2::text || ' days')::interval`,
      [dJobStatus.COMPLETED, String(days)],
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  /**
   * new/open = all non-deleted faults created this calendar week (Mon–Sun, Australia/Sydney)
   *   (Service360 creates faults as PENDING, not NEW — so we key off created_at)
   * in progress/pending = PENDING + INPROGRESS created this month
   * fixed = all non-deleted faults from previous months
   */
  private async countFaultsByStatus(): Promise<{
    open: number;
    pending: number;
    fixed: number;
  }> {
    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE 'Australia/Sydney')
                 >= date_trunc('week', NOW() AT TIME ZONE 'Australia/Sydney')
         )::int AS open_count,
         COUNT(*) FILTER (
           WHERE status IN ($1, $2)
             AND (created_at AT TIME ZONE 'Australia/Sydney')
                 >= date_trunc('month', NOW() AT TIME ZONE 'Australia/Sydney')
         )::int AS pending_count,
         COUNT(*) FILTER (
           WHERE (created_at AT TIME ZONE 'Australia/Sydney')
                 < date_trunc('month', NOW() AT TIME ZONE 'Australia/Sydney')
         )::int AS fixed_count
       FROM report_faults
       WHERE status != $3`,
      [
        reportFaultStatus.PENDING,
        reportFaultStatus.INPROGRESS,
        reportFaultStatus.DELETED,
      ],
    );
    return {
      open: Number(rows?.[0]?.open_count ?? 0),
      pending: Number(rows?.[0]?.pending_count ?? 0),
      fixed: Number(rows?.[0]?.fixed_count ?? 0),
    };
  }

  private async countOpenTickets(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM tickets
       WHERE status IN ($1, $2, $3)`,
      [ticketStatus.NEW, ticketStatus.PENDING, ticketStatus.INPROGRESS],
    );
    return Number(rows?.[0]?.count ?? 0);
  }

  private async countFaultsLastDays(days: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM report_faults
       WHERE status != $1
         AND created_at >= NOW() - ($2::text || ' days')::interval`,
      [reportFaultStatus.DELETED, String(days)],
    );
    return Number(rows?.[0]?.count ?? 0);
  }
}
