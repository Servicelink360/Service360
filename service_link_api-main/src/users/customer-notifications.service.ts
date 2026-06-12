import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { userStatus, userType } from '../constants/user';
import {
  appBaseUrl,
  emailLinkHtml,
  emailSupportFooterHtml,
} from '../helpers/emailContent';
import { SendMail, isMailConfigured } from '../helpers/sendEmail';

export type CustomerNotifyKind = 'faultReports' | 'newReports' | 'messages';

export interface CustomerNotificationPrefs {
  emailNotifyNormalFaultReports: boolean;
  emailNotifyUrgentFaultReports: boolean;
  emailNotifyNewReports: boolean;
  emailNotifyMessages: boolean;
}

interface CustomerRecipient {
  userId: number;
  email: string;
  fullName: string;
  emailNotifyNormalFaultReports: boolean;
  emailNotifyUrgentFaultReports: boolean;
  emailNotifyNewReports: boolean;
  emailNotifyMessages: boolean;
}

@Injectable()
export class CustomerNotificationsService {
  private readonly logger = new Logger(CustomerNotificationsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  defaultPrefs(): CustomerNotificationPrefs {
    return {
      emailNotifyNormalFaultReports: false,
      emailNotifyUrgentFaultReports: false,
      emailNotifyNewReports: false,
      emailNotifyMessages: false,
    };
  }

  /** Sign-in URL that returns the user to an in-app path after login. */
  buildEmailDeepLink(appPath: string): string {
    const path = appPath.startsWith('/') ? appPath : `/${appPath}`;
    const redirect = encodeURIComponent(path);
    return `${appBaseUrl()}/signin?redirect=${redirect}`;
  }

  private escapeHtml(text: string): string {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private customerFirstName(fullName: string): string {
    const trimmed = String(fullName || '').trim();
    if (!trimmed) return 'there';
    return trimmed.split(/\s+/)[0];
  }

  private customerGreeting(fullName: string): string {
    return `Hello ${this.escapeHtml(this.customerFirstName(fullName))},`;
  }

  private faultPriorityLabel(priority: number): string {
    return +priority === 1 ? 'Urgent' : 'Normal';
  }

  private async companyPeerRecipients(
    anchorCustomerId: number,
  ): Promise<CustomerRecipient[]> {
    const rows = await this.dataSource.query(
      `
      SELECT u.id AS "userId",
             TRIM(u.email) AS email,
             TRIM(u.full_name) AS "fullName",
             COALESCE(c.email_notify_normal_fault_reports, FALSE) AS "emailNotifyNormalFaultReports",
             COALESCE(c.email_notify_urgent_fault_reports, FALSE) AS "emailNotifyUrgentFaultReports",
             COALESCE(c.email_notify_new_reports, FALSE) AS "emailNotifyNewReports",
             COALESCE(c.email_notify_messages, FALSE) AS "emailNotifyMessages"
      FROM users u
      INNER JOIN customers c ON c.user_id = u.id
      INNER JOIN customers owner ON owner.user_id = $1
      WHERE u.type = $2
        AND u.status = $3
        AND TRIM(COALESCE(u.email, '')) <> ''
        AND (
          u.id = $1
          OR (
            owner.company_id IS NOT NULL
            AND c.company_id = owner.company_id
          )
          OR (
            owner.company_id IS NULL
            AND TRIM(COALESCE(owner.company_name, '')) <> ''
            AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(owner.company_name))
          )
        )
      `,
      [anchorCustomerId, userType.CUSTOMER, userStatus.ACTIVE],
    );
    return rows as CustomerRecipient[];
  }

  private wantsNotification(
    recipient: CustomerRecipient,
    kind: CustomerNotifyKind,
    urgentOnlyFault?: boolean,
  ): boolean {
    if (kind === 'faultReports') {
      if (urgentOnlyFault) return recipient.emailNotifyUrgentFaultReports;
      return recipient.emailNotifyNormalFaultReports;
    }
    if (kind === 'newReports') return recipient.emailNotifyNewReports;
    if (kind === 'messages') return recipient.emailNotifyMessages;
    return false;
  }

  private async sendToRecipients(
    recipients: CustomerRecipient[],
    kind: CustomerNotifyKind,
    opts: {
      subject: string;
      html: string | ((recipient: CustomerRecipient) => string);
      excludeUserIds?: number[];
      urgentFault?: boolean;
    },
  ): Promise<void> {
    if (!isMailConfigured()) return;
    const exclude = new Set((opts.excludeUserIds || []).map((id) => +id));
    const sent = new Set<string>();
    for (const r of recipients) {
      if (exclude.has(+r.userId)) continue;
      if (!this.wantsNotification(r, kind, opts.urgentFault)) continue;
      const email = String(r.email || '').trim().toLowerCase();
      if (!email || sent.has(email)) continue;
      sent.add(email);
      const html =
        typeof opts.html === 'function' ? opts.html(r) : opts.html;
      const ok = await SendMail(email, opts.subject, html);
      if (!ok) {
        this.logger.warn(`Customer email failed for user ${r.userId}`);
      }
    }
  }

  async notifyFaultReportCreated(opts: {
    faultId: number;
    customerId: number;
    issue: string;
    siteName: string;
    serviceName: string;
    priority: number;
    createdByUserId?: number;
  }): Promise<void> {
    try {
      const link = this.buildEmailDeepLink(`/report-faults?faultId=${opts.faultId}`);
      const urgent = +opts.priority === 1;
      const priorityLabel = this.faultPriorityLabel(opts.priority);
      const subject = `Service360 — ${urgent ? 'Urgent' : 'Normal'} fault: ${opts.issue || opts.siteName || 'New fault'}`;
      const recipients = await this.companyPeerRecipients(opts.customerId);
      await this.sendToRecipients(recipients, 'faultReports', {
        subject,
        html: (r) => `
        <p>${this.customerGreeting(r.fullName)}</p>
        <p>A new fault report has been submitted for your organisation.</p>
        <p><strong>Priority:</strong> ${priorityLabel}</p>
        <p><strong>Issue:</strong> ${this.escapeHtml(opts.issue || '—')}</p>
        <p><strong>Site:</strong> ${this.escapeHtml(opts.siteName || '—')}</p>
        <p><strong>Service:</strong> ${this.escapeHtml(opts.serviceName || '—')}</p>
        <p>${emailLinkHtml(link, 'View fault report in Service360')}</p>
        ${emailSupportFooterHtml()}`,
        excludeUserIds: opts.createdByUserId ? [opts.createdByUserId] : [],
        urgentFault: urgent,
      });
    } catch (e) {
      this.logger.warn(`notifyFaultReportCreated: ${(e as Error).message}`);
    }
  }

  async notifyNewReportAvailable(opts: {
    userTaskId: number;
    customerId: number;
    taskName: string;
    siteName: string;
    serviceName: string;
    createdByUserId?: number;
  }): Promise<void> {
    try {
      const link = this.buildEmailDeepLink(`/new-reports?reportId=${opts.userTaskId}`);
      const recipients = await this.companyPeerRecipients(opts.customerId);
      await this.sendToRecipients(recipients, 'newReports', {
        subject: `Service360 — New report: ${opts.taskName || opts.siteName || 'Report'}`,
        html: (r) => `
        <p>${this.customerGreeting(r.fullName)}</p>
        <p>A new report is available for your organisation.</p>
        <p><strong>Report:</strong> ${this.escapeHtml(opts.taskName || '—')}</p>
        <p><strong>Site:</strong> ${this.escapeHtml(opts.siteName || '—')}</p>
        <p><strong>Service:</strong> ${this.escapeHtml(opts.serviceName || '—')}</p>
        <p>${emailLinkHtml(link, 'View report in Service360')}</p>
        ${emailSupportFooterHtml()}`,
        excludeUserIds: opts.createdByUserId ? [opts.createdByUserId] : [],
      });
    } catch (e) {
      this.logger.warn(`notifyNewReportAvailable: ${(e as Error).message}`);
    }
  }

  async notifyNewMessage(opts: {
    recipientCustomerIds: number[];
    preview: string;
    linkPath: string;
    createdByUserId?: number;
  }): Promise<void> {
    try {
      const link = this.buildEmailDeepLink(opts.linkPath);
      const preview = String(opts.preview || '').slice(0, 500);
      const previewHtml = preview
        ? `<p><em>${this.escapeHtml(preview)}</em></p>`
        : '';
      const exclude = new Set(
        (opts.createdByUserId ? [opts.createdByUserId] : []).map((id) => +id),
      );
      const seenEmails = new Set<string>();
      for (const customerId of opts.recipientCustomerIds) {
        if (!customerId) continue;
        const recipients = await this.companyPeerRecipients(customerId);
        for (const r of recipients) {
          if (exclude.has(+r.userId)) continue;
          if (!this.wantsNotification(r, 'messages')) continue;
          const email = String(r.email || '').trim().toLowerCase();
          if (!email || seenEmails.has(email)) continue;
          seenEmails.add(email);
          const html = `
        <p>${this.customerGreeting(r.fullName)}</p>
        <p>You have a new message in Service360.</p>
        ${previewHtml}
        <p>${emailLinkHtml(link, 'Open Messages in Service360')}</p>
        ${emailSupportFooterHtml()}`;
          await SendMail(email, 'Service360 — New message', html);
        }
      }
    } catch (e) {
      this.logger.warn(`notifyNewMessage: ${(e as Error).message}`);
    }
  }
}
