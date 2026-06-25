import { Inject, Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { createHash, randomBytes } from 'crypto';

import { Repository } from 'typeorm';

import { errorCode } from '../constants/errorCode';

import { appBaseUrl, emailLinkHtml, emailSupportFooterHtml } from '../helpers/emailContent';

import { SendMail, isMailConfigured } from '../helpers/sendEmail';

import { PersonnelFaultAccessToken } from './entities/personnel-fault-access-token.entity';

import { ReportFault } from './entities/report-fault.entity';

import { CustomerPersonnel } from '../customer-personnel/entities/customer-personnel.entity';

import { AdminPersonnel } from '../admin-personnel/entities/admin-personnel.entity';

import { User } from '../users/entities/user.entity';

import { userType } from '../constants/user';

import { computeDelegationOutcome } from './delegation-outcome.util';



const TOKEN_TTL_DAYS = 30;



@Injectable()

export class PersonnelFaultAccessService {

  constructor(

    @InjectRepository(PersonnelFaultAccessToken)

    private readonly tokenRepository: Repository<PersonnelFaultAccessToken>,

    @InjectRepository(ReportFault)

    private readonly faultRepository: Repository<ReportFault>,

    @InjectRepository(CustomerPersonnel)

    private readonly personnelRepository: Repository<CustomerPersonnel>,

    @InjectRepository(AdminPersonnel)

    private readonly adminPersonnelRepository: Repository<AdminPersonnel>,

    @InjectRepository(User)

    private readonly userRepository: Repository<User>,

    @Inject('winston') private readonly logger: Logger,

  ) {}



  private hashToken(token: string): string {

    return createHash('sha256').update(token).digest('hex');

  }



  private escapeHtml(text: string): string {

    return String(text || '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;');

  }



  buildMagicLinkUrl(rawToken: string): string {

    return `${appBaseUrl()}/personnel-fault?token=${encodeURIComponent(rawToken)}`;

  }



  async revokeAllTokensForFault(faultId: number): Promise<void> {

    await this.tokenRepository.delete({ reportFaultId: faultId });

  }



  private tokenMatchesCurrentDelegation(

    row: PersonnelFaultAccessToken,

    fault: ReportFault,

  ): boolean {

    const delegatedType = String(fault.delegatedToType ?? '');

    if (delegatedType === 'personnel') {

      return (

        row.personnelId != null &&

        +row.personnelId === +fault.delegatedToPersonnelId!

      );

    }

    if (delegatedType === 'admin_personnel') {

      return (

        row.adminPersonnelId != null &&

        +row.adminPersonnelId === +fault.delegatedToStaffId!

      );

    }

    return false;

  }



  async issueTokenForPersonnel(faultId: number, personnelId: number): Promise<string> {

    await this.tokenRepository.delete({ reportFaultId: faultId, personnelId });

    const rawToken = randomBytes(32).toString('hex');

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    await this.tokenRepository.save({

      reportFaultId: faultId,

      personnelId,

      adminPersonnelId: null,

      tokenHash: this.hashToken(rawToken),

      expiresAt,

    });

    return rawToken;

  }



  async issueTokenForStaff(faultId: number, staffId: number): Promise<string> {

    await this.tokenRepository.delete({ reportFaultId: faultId, adminPersonnelId: staffId });

    const rawToken = randomBytes(32).toString('hex');

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    await this.tokenRepository.save({

      reportFaultId: faultId,

      personnelId: null,

      adminPersonnelId: staffId,

      tokenHash: this.hashToken(rawToken),

      expiresAt,

    });

    return rawToken;

  }



  async sendDelegationEmail(opts: {

    name: string;

    email: string;

    fault: ReportFault;

    magicLink: string;

    delegatedUntil: Date;

    delegationNote?: string;

    assignerName?: string;

  }): Promise<void> {

    if (!isMailConfigured()) {

      this.logger.warn('Personnel delegation email skipped: mail not configured');

      return;

    }

    const until = opts.delegatedUntil.toLocaleString('en-AU', {

      timeZone: 'Australia/Sydney',

      dateStyle: 'short',

      timeStyle: 'short',

    });

    const urgent = +opts.fault.priority === 1;

    const priorityLabel = urgent ? 'urgent fault' : 'fault report';

    const html = [

      `<p>Hello ${this.escapeHtml(opts.name)},</p>`,

      `<p>You have been assigned an <strong>${priorityLabel}</strong> on Service360.</p>`,

      `<p><strong>Site:</strong> ${this.escapeHtml(opts.fault.siteName || '—')}</p>`,

      `<p><strong>Issue:</strong> ${this.escapeHtml(opts.fault.issue || opts.fault.subject || '—')}</p>`,

      opts.fault.toiletArea

        ? `<p><strong>Toilet:</strong> ${this.escapeHtml(opts.fault.toiletArea)}</p>`

        : '',

      `<p><strong>Act by:</strong> ${this.escapeHtml(until)}</p>`,

      opts.delegationNote

        ? `<p><strong>Note:</strong> ${this.escapeHtml(opts.delegationNote)}</p>`

        : '',

      opts.assignerName

        ? `<p><strong>Assigned by:</strong> ${this.escapeHtml(opts.assignerName)}</p>`

        : '',

      `<p>Open this secure link to view the fault details (no login required):</p>`,

      `<p>${emailLinkHtml(opts.magicLink, urgent ? 'View urgent fault' : 'View fault report')}</p>`,

      `<p>This link expires in ${TOKEN_TTL_DAYS} days.</p>`,

      emailSupportFooterHtml(),

    ]

      .filter(Boolean)

      .join('\n');

    const ok = await SendMail(

      opts.email,

      urgent

        ? 'Service360 — Urgent fault assigned to you'

        : 'Service360 — Fault report assigned to you',

      html,

    );

    if (!ok) {

      this.logger.warn(`Personnel delegation email failed for ${opts.email}`);

    }

  }



  async sendDelegationReminderEmail(opts: {

    name: string;

    email: string;

    fault: ReportFault;

    magicLink: string;

    delegatedUntil: Date;

    delegationNote?: string;

    assignerName?: string;

  }): Promise<void> {

    if (!isMailConfigured()) {

      this.logger.warn('Personnel delegation reminder skipped: mail not configured');

      return;

    }

    const until = opts.delegatedUntil.toLocaleString('en-AU', {

      timeZone: 'Australia/Sydney',

      dateStyle: 'short',

      timeStyle: 'short',

    });

    const urgent = +opts.fault.priority === 1;

    const priorityLabel = urgent ? 'urgent fault' : 'fault report';

    const html = [

      `<p>Hello ${this.escapeHtml(opts.name)},</p>`,

      `<p>This is a <strong>reminder</strong> to complete your assigned <strong>${priorityLabel}</strong> on Service360.</p>`,

      `<p><strong>Site:</strong> ${this.escapeHtml(opts.fault.siteName || '—')}</p>`,

      `<p><strong>Issue:</strong> ${this.escapeHtml(opts.fault.issue || opts.fault.subject || '—')}</p>`,

      opts.fault.toiletArea

        ? `<p><strong>Toilet:</strong> ${this.escapeHtml(opts.fault.toiletArea)}</p>`

        : '',

      `<p><strong>Act by:</strong> ${this.escapeHtml(until)}</p>`,

      opts.delegationNote

        ? `<p><strong>Note:</strong> ${this.escapeHtml(opts.delegationNote)}</p>`

        : '',

      `<p>Please open the secure link below to view the fault and confirm when done:</p>`,

      `<p>${emailLinkHtml(opts.magicLink, urgent ? 'View urgent fault' : 'View fault report')}</p>`,

      emailSupportFooterHtml(),

    ]

      .filter(Boolean)

      .join('\n');

    const ok = await SendMail(

      opts.email,

      urgent

        ? 'Service360 — Reminder: urgent fault awaiting action'

        : 'Service360 — Reminder: fault report awaiting action',

      html,

    );

    if (!ok) {

      this.logger.warn(`Personnel delegation reminder failed for ${opts.email}`);

    }

  }



  private async resolveTokenRow(rawToken: string) {

    const token = String(rawToken ?? '').trim();

    if (!token) {

      return { error: { ...errorCode.VALIDATION_ERROR, message: 'Token is required' } };

    }

    const hash = this.hashToken(token);

    const row = await this.tokenRepository.findOne({ where: { tokenHash: hash } });

    if (!row || new Date(row.expiresAt).getTime() < Date.now()) {

      return { error: { ...errorCode.NOT_FOUND, message: 'Link expired or invalid' } };

    }

    const fault = await this.faultRepository.findOne({ where: { id: row.reportFaultId } });

    if (!fault) {

      return { error: { ...errorCode.NOT_FOUND, message: 'Fault not found' } };

    }

    if (!this.tokenMatchesCurrentDelegation(row, fault)) {

      return { error: { ...errorCode.NOT_FOUND, message: 'Link expired or invalid' } };

    }

    return { row, fault };

  }



  async viewByToken(rawToken: string) {

    try {

      const resolved = await this.resolveTokenRow(rawToken);

      if (resolved.error) return resolved.error;

      const { row, fault } = resolved;

      row.lastAccessedAt = new Date();

      await this.tokenRepository.save(row);

      if (!fault.delegationViewedAt) {

        fault.delegationViewedAt = new Date();

        fault.updatedAt = new Date();

        await this.faultRepository.save(fault);

      }

      let personnelName = '';

      if (row.personnelId) {

        const personnel = await this.personnelRepository.findOne({

          where: { id: row.personnelId },

        });

        personnelName = personnel?.name ?? '';

      } else if (row.adminPersonnelId) {

        if (fault.delegatedToType === 'staff') {

          const staffUser = await this.userRepository.findOne({

            where: { id: row.adminPersonnelId, type: userType.STAFF },

          });

          personnelName = staffUser?.fullName ?? '';

        } else {

          const adminPersonnel = await this.adminPersonnelRepository.findOne({

            where: { id: row.adminPersonnelId },

          });

          personnelName = adminPersonnel?.name ?? '';

        }

      }

      let attachFiles: string[] = [];

      try {

        const parsed = JSON.parse(String(fault.attachFiles || '[]'));

        attachFiles = Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];

      } catch {

        attachFiles = [];

      }

      const outcome = computeDelegationOutcome(fault);

      return {

        ...errorCode.SUCCESS,

        data: {

          faultId: fault.id,

          siteName: fault.siteName,

          serviceName: fault.serviceName,

          issue: fault.issue || fault.subject,

          toiletArea: fault.toiletArea ?? null,

          message: fault.message,

          priority: fault.priority,

          delegatedUntil: fault.delegatedUntil,

          delegationNote: fault.delegationNote,

          delegatedActedAt: fault.delegatedActedAt,

          delegationViewedAt: fault.delegationViewedAt,

          delegationOutcome: outcome,

          canMarkActed: !fault.delegatedActedAt,

          companyName: fault.companyName,

          personnelName,

          attachFiles,

          createdAt: fault.createdAt,

        },

      };

    } catch (error) {

      this.logger.error(error);

      return errorCode.EXCEPTION;

    }

  }



  async markActedByToken(rawToken: string) {

    try {

      const resolved = await this.resolveTokenRow(rawToken);

      if (resolved.error) return resolved.error;

      const { fault } = resolved;

      if (fault.delegatedActedAt) {

        return {

          ...errorCode.SUCCESS,

          data: {

            delegatedActedAt: fault.delegatedActedAt,

            delegationOutcome: computeDelegationOutcome(fault),

          },

        };

      }

      fault.delegatedActedAt = new Date();

      if (!fault.delegationViewedAt) {

        fault.delegationViewedAt = fault.delegatedActedAt;

      }

      fault.updatedAt = new Date();

      await this.faultRepository.save(fault);

      return {

        ...errorCode.SUCCESS,

        data: {

          delegatedActedAt: fault.delegatedActedAt,

          delegationOutcome: computeDelegationOutcome(fault),

        },

      };

    } catch (error) {

      this.logger.error(error);

      return errorCode.EXCEPTION;

    }

  }

}


