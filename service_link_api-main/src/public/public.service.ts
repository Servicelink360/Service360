import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { dJobStatus, reportFaultStatus, ticketStatus } from '../constants/status';

export type OpsStats = {
  sitesCount: number;
  liveSitesCount: number;
  newReportsCount: number;
  openFaultsCount: number;
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
        openFaultsCount,
        openTicketsCount,
        faultsLast30Days,
      ] = await Promise.all([
        this.countSites(),
        this.countLiveSites(),
        this.countCompletedReportsLastDays(30),
        this.countOpenFaults(),
        this.countOpenTickets(),
        this.countFaultsLastDays(30),
      ]);

      const data: OpsStats = {
        sitesCount,
        liveSitesCount,
        /** Marketing “new reports” = completed custom reports in last 30 days */
        newReportsCount: completedReportsLast30Days,
        openFaultsCount,
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

  private async countOpenFaults(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM report_faults
       WHERE status IN ($1, $2, $3)`,
      [reportFaultStatus.NEW, reportFaultStatus.PENDING, reportFaultStatus.INPROGRESS],
    );
    return Number(rows?.[0]?.count ?? 0);
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
