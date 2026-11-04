import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userStatus, userType } from '../constants/user';
import { SendMailDetailed } from '../helpers/sendEmail';
import { IUserInfo } from '../interfaces/IUserInfo';
import { CreateConsumableDeliveryDto } from './dto/create-delivery.dto';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
import { UpdateConsumableEmailSettingsDto } from './dto/update-email-settings.dto';
import { CreateConsumableSupplierDto } from './dto/create-supplier.dto';
import { UpdateConsumableSupplierDto } from './dto/update-supplier.dto';
import { ConsumableDeliveryEvent } from './entities/consumable-delivery-event.entity';
import { ConsumableDeliveryItem } from './entities/consumable-delivery-item.entity';
import { ConsumableDelivery } from './entities/consumable-delivery.entity';
import { ConsumableEmailSettings } from './entities/consumable-email-settings.entity';
import { ConsumableSupplier } from './entities/consumable-supplier.entity';
import { Consumable } from './entities/consumable.entity';

type DeliveryItem = {
  consumableId: number | null;
  name: string;
  stockCode: string | null;
  unit: string;
  quantity: number;
};

@Injectable()
export class ConsumablesService {
  constructor(
    @InjectRepository(Consumable)
    private readonly consumablesRepository: Repository<Consumable>,
    @InjectRepository(ConsumableDelivery)
    private readonly deliveriesRepository: Repository<ConsumableDelivery>,
    @InjectRepository(ConsumableDeliveryItem)
    private readonly deliveryItemsRepository: Repository<ConsumableDeliveryItem>,
    @InjectRepository(ConsumableDeliveryEvent)
    private readonly deliveryEventsRepository: Repository<ConsumableDeliveryEvent>,
    @InjectRepository(ConsumableEmailSettings)
    private readonly emailSettingsRepository: Repository<ConsumableEmailSettings>,
    @InjectRepository(ConsumableSupplier)
    private readonly suppliersRepository: Repository<ConsumableSupplier>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private assertAdmin(user: IUserInfo) {
    return +user.type === userType.ADMIN;
  }

  private assertCustomer(user: IUserInfo) {
    return +user.type === userType.CUSTOMER;
  }

  /**
   * Deliveries sent to this customer's organisation:
   * - company party orders (company_id match, no supplier)
   * - legacy rows keyed by a customer user in the same company
   */
  private async applyCustomerDeliveryScope(
    qb: ReturnType<Repository<ConsumableDelivery>['createQueryBuilder']>,
    user: IUserInfo,
  ) {
    const rows: Array<{ companyId: number | null }> =
      await this.deliveriesRepository.manager.query(
        `SELECT company_id AS "companyId" FROM public.customers WHERE user_id = $1 LIMIT 1`,
        [+user.userId],
      );
    const companyId =
      rows?.[0]?.companyId != null && Number(rows[0].companyId) > 0
        ? +rows[0].companyId
        : null;
    if (companyId) {
      const nameRows: Array<{ name: string | null }> =
        await this.deliveriesRepository.manager.query(
          `SELECT name FROM public.customer_companies WHERE id = $1 LIMIT 1`,
          [companyId],
        );
      const companyName = String(nameRows?.[0]?.name || '').trim();
      qb.andWhere(
        `(
          (d.companyId = :customerCompanyId AND d.supplierId IS NULL)
          OR (
            d.companyId IS NULL
            AND d.supplierId IS NULL
            AND :customerCompanyName <> ''
            AND LOWER(TRIM(d.companyName)) = LOWER(TRIM(:customerCompanyName))
          )
          OR d.customerId IN (
            SELECT c.user_id FROM public.customers c WHERE c.company_id = :customerCompanyId
          )
          OR d.customerId = :customerUserId
        )`,
        {
          customerCompanyId: companyId,
          customerCompanyName: companyName,
          customerUserId: +user.userId,
        },
      );
      return;
    }
    qb.andWhere('d.customerId = :customerUserId', { customerUserId: +user.userId });
  }

  private async customerCanViewDelivery(user: IUserInfo, row: ConsumableDelivery) {
    if (this.assertAdmin(user)) return true;
    if (!this.assertCustomer(user)) return false;
    const rows: Array<{ companyId: number | null }> =
      await this.deliveriesRepository.manager.query(
        `SELECT company_id AS "companyId" FROM public.customers WHERE user_id = $1 LIMIT 1`,
        [+user.userId],
      );
    const companyId =
      rows?.[0]?.companyId != null && Number(rows[0].companyId) > 0
        ? +rows[0].companyId
        : null;
    if (row.customerId != null && +row.customerId === +user.userId) return true;
    if (!companyId) return false;
    if (row.companyId != null && +row.companyId === companyId && !row.supplierId) {
      return true;
    }
    if (!row.companyId && !row.supplierId) {
      const nameRows: Array<{ name: string | null }> =
        await this.deliveriesRepository.manager.query(
          `SELECT name FROM public.customer_companies WHERE id = $1 LIMIT 1`,
          [companyId],
        );
      const companyName = String(nameRows?.[0]?.name || '').trim().toLowerCase();
      if (
        companyName &&
        String(row.companyName || '').trim().toLowerCase() === companyName
      ) {
        return true;
      }
    }
    if (row.customerId != null) {
      const peer: Array<{ ok: number }> = await this.deliveriesRepository.manager.query(
        `SELECT 1 AS ok FROM public.customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [+row.customerId, companyId],
      );
      return !!peer?.length;
    }
    return false;
  }

  private async softDeleteDeliveryForCustomer(user: IUserInfo, deliveryId: number) {
    await this.deliveriesRepository.manager.query(
      `
      INSERT INTO public.consumable_delivery_customer_visibility (delivery_id, user_id, hidden_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (delivery_id, user_id) DO UPDATE
      SET hidden_at = COALESCE(public.consumable_delivery_customer_visibility.hidden_at, NOW()),
          cleared_at = NULL
      `,
      [+deliveryId, +user.userId],
    );
  }

  private async restoreDeliveryForCustomer(user: IUserInfo, deliveryId: number) {
    await this.deliveriesRepository.manager.query(
      `
      UPDATE public.consumable_delivery_customer_visibility
      SET hidden_at = NULL
      WHERE delivery_id = $1 AND user_id = $2 AND hidden_at IS NOT NULL
      `,
      [+deliveryId, +user.userId],
    );
  }

  private async clearDeletedDeliveryForCustomer(user: IUserInfo, deliveryId: number) {
    await this.deliveriesRepository.manager.query(
      `
      UPDATE public.consumable_delivery_customer_visibility
      SET cleared_at = NOW()
      WHERE delivery_id = $1 AND user_id = $2
        AND hidden_at IS NOT NULL AND cleared_at IS NULL
      `,
      [+deliveryId, +user.userId],
    );
  }

  private customerHiddenSql(listDeleted: boolean) {
    if (listDeleted) {
      return `EXISTS (
        SELECT 1 FROM consumable_delivery_customer_visibility v
        WHERE v.delivery_id = d.id
          AND v.user_id = :customerViewerId
          AND v.hidden_at IS NOT NULL
          AND v.cleared_at IS NULL
      )`;
    }
    return `NOT EXISTS (
      SELECT 1 FROM consumable_delivery_customer_visibility v
      WHERE v.delivery_id = d.id
        AND v.user_id = :customerViewerId
        AND v.hidden_at IS NOT NULL
        AND v.cleared_at IS NULL
    )`;
  }

  /** Customers only see orders that were actually emailed (not admin drafts). */
  private customerPublishedDeliverySql() {
    return `(d.emailedAt IS NOT NULL OR d.emailStatus = :customerSentStatus)`;
  }

  private customerDeliveryIsPublished(row: ConsumableDelivery) {
    return Boolean(row.emailedAt) || String(row.emailStatus || '') === 'sent';
  }

  private async customerVisibilityState(
    userId: number,
    deliveryId: number,
  ): Promise<{ hidden: boolean; cleared: boolean }> {
    const rows: Array<{ hidden_at: Date | string | null; cleared_at: Date | string | null }> =
      await this.deliveriesRepository.manager.query(
        `
        SELECT hidden_at, cleared_at
        FROM consumable_delivery_customer_visibility
        WHERE delivery_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [+deliveryId, +userId],
      );
    const row = rows?.[0];
    return {
      hidden: Boolean(row?.hidden_at) && !row?.cleared_at,
      cleared: Boolean(row?.cleared_at),
    };
  }

  private async customerDisplay(userId: number) {
    const rows: Array<{
      customerName: string | null;
      companyName: string | null;
      email: string | null;
    }> = await this.consumablesRepository.manager.query(
      `
      SELECT
        COALESCE(
          NULLIF(TRIM(u.full_name), ''),
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) AS "customerName",
        COALESCE(
          NULLIF(TRIM(org.name), ''),
          NULLIF(TRIM(c.company_name), '')
        ) AS "companyName",
        COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(c.company_email), '')) AS email
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      LEFT JOIN customer_companies org ON org.id = c.company_id
      WHERE u.id = $1
      LIMIT 1
      `,
      [+userId],
    );
    const row = rows?.[0];
    return {
      customerName: row?.customerName?.trim() || '',
      companyName: row?.companyName?.trim() || '',
      email: row?.email?.trim() || '',
    };
  }

  private normalizeItems(raw: unknown): DeliveryItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        const name = String(row.name || '').trim();
        const quantity = Number(row.quantity);
        if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
        const consumableId = Number(row.consumableId);
        const stockCode = String(row.stockCode || '').trim() || null;
        return {
          consumableId: Number.isFinite(consumableId) && consumableId > 0 ? consumableId : null,
          name,
          stockCode,
          unit: String(row.unit || 'each').trim() || 'each',
          quantity,
        };
      })
      .filter(Boolean) as DeliveryItem[];
  }

  /** Fill missing stock codes from the catalog by consumableId. */
  private async enrichItemsStockCodes(items: DeliveryItem[]): Promise<DeliveryItem[]> {
    const ids = Array.from(
      new Set(
        items
          .filter((item) => item.consumableId && !item.stockCode)
          .map((item) => item.consumableId as number),
      ),
    );
    if (!ids.length) return items;
    const catalog = await this.consumablesRepository.find({ where: { id: In(ids) } });
    const byId = new Map(catalog.map((row) => [row.id, row.stockCode || null]));
    return items.map((item) => ({
      ...item,
      stockCode: item.stockCode || (item.consumableId ? byId.get(item.consumableId) || null : null),
    }));
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async ensureEmailSettings(): Promise<ConsumableEmailSettings> {
    let row = await this.emailSettingsRepository.findOne({ where: { id: 1 } });
    if (row) return row;
    row = this.emailSettingsRepository.create({
      id: 1,
      logoUrl: null,
      logoWidth: 140,
      logoHeight: 72,
      brandName: 'SERVICELINK',
      slogan: 'YOUR PARTNER IN FACILITIES',
      contactName: 'Brendan Godfrey',
      contactTitle: 'Facilities Helpdesk',
      address: '309/49-51, Queens Rd Five Dock NSW 2046',
      mobile: '0424 166 776',
      email: 'helpdesk@servicelink.net.au',
      website: 'www.servicelink.net.au',
      footerText:
        'Servicelink provides comprehensive facilities and support services, committed to maintaining safe, compliant, and well-managed environments that support daily operations and community use.',
      headingText: '<p>Consumables delivery</p>',
      introText: '<p>Please find the consumables list below.</p>',
      closingText:
        '<p>If you have any questions, reply to this email or contact us using the details below.</p>',
      signatureHtml: null,
      bodyHtml: null,
      updatedBy: null,
    });
    return this.emailSettingsRepository.save(row);
  }

  private defaultSignatureHtml(settings: ConsumableEmailSettings): string {
    const websiteRaw = String(settings.website || '').trim();
    const websiteHref = websiteRaw
      ? websiteRaw.startsWith('http')
        ? websiteRaw
        : `https://${websiteRaw}`
      : '';
    const websiteLabel = websiteRaw.replace(/^https?:\/\//i, '');
    const emailRaw = String(settings.email || '').trim();
    const parts = [
      settings.brandName
        ? `<p style="margin:0 0 2px;"><strong style="color:#188038;font-size:16px;">${this.escapeHtml(settings.brandName)}</strong></p>`
        : '',
      settings.slogan
        ? `<p style="margin:0 0 10px;color:#6b7280;font-size:11px;">${this.escapeHtml(settings.slogan)}</p>`
        : '',
      settings.contactName
        ? `<p style="margin:0;"><strong>${this.escapeHtml(settings.contactName)}</strong></p>`
        : '',
      settings.contactTitle
        ? `<p style="margin:0 0 6px;"><strong>${this.escapeHtml(settings.contactTitle)}</strong></p>`
        : '',
      settings.address ? `<p style="margin:0 0 4px;">${this.escapeHtml(settings.address)}</p>` : '',
      settings.mobile
        ? `<p style="margin:0;"><strong>M</strong> ${this.escapeHtml(settings.mobile)}</p>`
        : '',
      emailRaw
        ? `<p style="margin:0;"><strong>E</strong> <a href="mailto:${this.escapeHtml(emailRaw)}">${this.escapeHtml(emailRaw)}</a></p>`
        : '',
      websiteHref
        ? `<p style="margin:0;"><strong>W</strong> <a href="${this.escapeHtml(websiteHref)}">${this.escapeHtml(websiteLabel)}</a></p>`
        : '',
      settings.footerText
        ? `<p style="margin:14px 0 0;font-style:italic;color:#4b5563;">${this.escapeHtml(settings.footerText)}</p>`
        : '',
    ];
    return parts.filter(Boolean).join('') || '<p></p>';
  }

  private composeBodyHtmlFromParts(settings: ConsumableEmailSettings): string {
    const intro =
      settings.introText && /<[a-z]/i.test(settings.introText)
        ? settings.introText
        : `<p>${this.escapeHtml(settings.introText || 'Please find the consumables list below.')}</p>`;
    const closing = settings.closingText
      ? /<[a-z]/i.test(settings.closingText)
        ? settings.closingText
        : `<p>${this.escapeHtml(settings.closingText)}</p>`
      : '';
    const signature =
      String(settings.signatureHtml || '').trim() || this.defaultSignatureHtml(settings);
    return `${intro}<p>{{itemsTable}}</p>${closing}<p>{{logo}}</p>${signature}`;
  }

  async getEmailSettings(user: IUserInfo) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const data = await this.ensureEmailSettings();
      if (!String(data.headingText || '').trim()) {
        data.headingText = '<p>Consumables delivery</p>';
      }
      if (!String(data.signatureHtml || '').trim()) {
        data.signatureHtml = this.defaultSignatureHtml(data);
      }
      if (data.introText && !/<[a-z]/i.test(data.introText)) {
        data.introText = `<p>${this.escapeHtml(data.introText)}</p>`;
      }
      if (data.closingText && !/<[a-z]/i.test(data.closingText)) {
        data.closingText = `<p>${this.escapeHtml(data.closingText)}</p>`;
      }
      if (!String(data.bodyHtml || '').trim()) {
        data.bodyHtml = this.composeBodyHtmlFromParts(data);
      }
      return { ...errorCode.SUCCESS, data };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateEmailSettings(user: IUserInfo, body: UpdateConsumableEmailSettingsDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.ensureEmailSettings();
      if (body.logoUrl !== undefined) row.logoUrl = String(body.logoUrl || '').trim() || null;
      if (body.logoWidth !== undefined) {
        const w = Number(body.logoWidth);
        row.logoWidth = Number.isFinite(w) ? Math.min(400, Math.max(40, Math.round(w))) : 140;
      }
      if (body.logoHeight !== undefined) {
        const h = Number(body.logoHeight);
        row.logoHeight = Number.isFinite(h) ? Math.min(400, Math.max(24, Math.round(h))) : 72;
      }
      if (body.brandName !== undefined) {
        row.brandName = String(body.brandName || '').trim() || row.brandName;
      }
      if (body.slogan !== undefined) row.slogan = String(body.slogan || '').trim();
      if (body.contactName !== undefined) {
        row.contactName = String(body.contactName || '').trim() || row.contactName;
      }
      if (body.contactTitle !== undefined) {
        row.contactTitle = String(body.contactTitle || '').trim() || row.contactTitle;
      }
      if (body.address !== undefined) row.address = String(body.address || '').trim() || null;
      if (body.mobile !== undefined) row.mobile = String(body.mobile || '').trim() || null;
      if (body.email !== undefined) row.email = String(body.email || '').trim() || null;
      if (body.website !== undefined) row.website = String(body.website || '').trim() || null;
      if (body.footerText !== undefined) {
        row.footerText = String(body.footerText || '').trim() || null;
      }
      if (body.headingText !== undefined) {
        row.headingText =
          String(body.headingText || '').trim() || '<p>Consumables delivery</p>';
      }
      if (body.introText !== undefined) {
        row.introText = String(body.introText || '').trim() || null;
      }
      if (body.closingText !== undefined) {
        row.closingText = String(body.closingText || '').trim() || null;
      }
      if (body.signatureHtml !== undefined) {
        row.signatureHtml = String(body.signatureHtml || '').trim() || null;
      }
      if (body.bodyHtml !== undefined) {
        row.bodyHtml = String(body.bodyHtml || '').trim() || null;
      }
      row.updatedBy = +user.userId;
      const saved = await this.emailSettingsRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved, message: 'Email template saved' };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private applyEmailTokens(text: string, delivery: ConsumableDelivery, contactName?: string): string {
    const company = delivery.companyName || delivery.customerName || '';
    const greeting =
      String(contactName || '').trim() ||
      delivery.customerName ||
      delivery.companyName ||
      'there';
    return String(text || '')
      .replace(/\{\{\s*contactName\s*\}\}/gi, greeting)
      .replace(/\{\{\s*customerName\s*\}\}/gi, greeting)
      .replace(/\{\{\s*companyName\s*\}\}/gi, company)
      .replace(/\{\{\s*siteName\s*\}\}/gi, delivery.siteName || '');
  }

  private async resolveContactNameFromEmails(
    emailTo: string | null | undefined,
    fallback: string,
  ): Promise<string> {
    const first = String(emailTo || '')
      .split(/[;,]+/)
      .map((e) => e.trim().toLowerCase())
      .find(Boolean);
    if (!first) return fallback;
    const rows: Array<{ fullName: string | null }> =
      await this.consumablesRepository.manager.query(
        `
        SELECT COALESCE(
          NULLIF(TRIM(u.full_name), ''),
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) AS "fullName"
        FROM users u
        WHERE LOWER(TRIM(u.email)) = $1
          AND u.status != $2
        LIMIT 1
        `,
        [first, userStatus.DELETE],
      );
    const name = String(rows?.[0]?.fullName || '').trim();
    return name || fallback;
  }

  private sanitizeEmailHtml(html: string): string {
    return String(html || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  /** Quill size/align/font classes → inline styles (email clients ignore Quill CSS). */
  private quillHtmlForEmail(html: string): string {
    return String(html || '').replace(
      /<([a-z0-9]+)([^>]*?)>/gi,
      (full, tag: string, attrs: string) => {
        const classMatch =
          attrs.match(/\sclass\s*=\s*"([^"]*)"/i) || attrs.match(/\sclass\s*=\s*'([^']*)'/i);
        if (!classMatch) return full;
        const classes = classMatch[1].split(/\s+/).filter(Boolean);
        const styles: string[] = [];
        const remaining: string[] = [];
        classes.forEach((c) => {
          switch (c) {
            case 'ql-size-small':
              styles.push('font-size:12px');
              break;
            case 'ql-size-large':
              styles.push('font-size:18px');
              break;
            case 'ql-size-huge':
              styles.push('font-size:32px');
              break;
            case 'ql-align-center':
              styles.push('text-align:center');
              break;
            case 'ql-align-right':
              styles.push('text-align:right');
              break;
            case 'ql-align-justify':
              styles.push('text-align:justify');
              break;
            case 'ql-align-left':
              styles.push('text-align:left');
              break;
            case 'ql-font-serif':
              styles.push('font-family:Georgia,Times New Roman,serif');
              break;
            case 'ql-font-monospace':
              styles.push('font-family:Courier New,Courier,monospace');
              break;
            default:
              if (!c.startsWith('ql-')) remaining.push(c);
          }
        });
        if (!styles.length) return full;
        let nextAttrs = attrs;
        if (remaining.length) {
          nextAttrs = nextAttrs.replace(classMatch[0], ` class="${remaining.join(' ')}"`);
        } else {
          nextAttrs = nextAttrs.replace(classMatch[0], '');
        }
        const styleMatch = nextAttrs.match(/\sstyle\s*=\s*"([^"]*)"/i);
        const merged = styles.join(';');
        if (styleMatch) {
          const existing = String(styleMatch[1] || '').replace(/;?\s*$/, '');
          nextAttrs = nextAttrs.replace(
            styleMatch[0],
            ` style="${existing ? `${existing};` : ''}${merged}"`,
          );
        } else {
          nextAttrs += ` style="${merged}"`;
        }
        return `<${tag}${nextAttrs}>`;
      },
    );
  }

  private renderRichEmailHtml(
    raw: string,
    delivery: ConsumableDelivery,
    contactName?: string,
  ): string {
    const withTokens = this.applyEmailTokens(raw, delivery, contactName);
    if (!withTokens.trim()) return '';
    if (/<[a-z][\s\S]*>/i.test(withTokens)) {
      return this.sanitizeEmailHtml(this.quillHtmlForEmail(withTokens));
    }
    return `<p>${this.escapeHtml(withTokens).replace(/\n/g, '<br/>')}</p>`;
  }

  private logoImgHtml(settings: ConsumableEmailSettings, margin = '0 0 10px'): string {
    if (!settings.logoUrl) return '';
    const w = Math.min(400, Math.max(40, Number(settings.logoWidth) || 140));
    const h = Math.min(400, Math.max(24, Number(settings.logoHeight) || 72));
    return `<img src="${this.escapeHtml(settings.logoUrl)}" alt="${this.escapeHtml(settings.brandName || 'Logo')}" width="${w}" height="${h}" style="width:${w}px;height:${h}px;object-fit:contain;max-width:100%;display:block;margin:${margin};border:0;" />`;
  }

  private emailSignatureHtml(settings: ConsumableEmailSettings): string {
    const logo = this.logoImgHtml(settings, '0 0 10px');
    const body =
      String(settings.signatureHtml || '').trim() || this.defaultSignatureHtml(settings);
    return `
      <div style="margin-top:28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.45;color:#111827;">
        ${logo}
        ${this.sanitizeEmailHtml(body)}
      </div>
    `;
  }

  private itemsTableHtml(items: DeliveryItem[]): string {
    const rows = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border:1px solid #e5e7eb;">${this.escapeHtml(item.name)}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${this.escapeHtml(item.quantity)}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${this.escapeHtml(item.unit)}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${this.escapeHtml(item.stockCode || '-')}</td>
          </tr>`,
      )
      .join('');
    return `<table style="border-collapse:collapse;width:100%;max-width:640px;margin:12px 0;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #d1fae5;background:#f0fdf4;text-align:left;">Item</th>
              <th style="padding:8px;border:1px solid #d1fae5;background:#f0fdf4;">Qty</th>
              <th style="padding:8px;border:1px solid #d1fae5;background:#f0fdf4;text-align:left;">Unit</th>
              <th style="padding:8px;border:1px solid #d1fae5;background:#f0fdf4;text-align:left;">Stock code</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
  }

  private async deliveryEmailHtml(delivery: ConsumableDelivery, items: DeliveryItem[]) {
    const settings = await this.ensureEmailSettings();
    const greetingName = await this.resolveContactNameFromEmails(
      delivery.emailedTo,
      delivery.customerName || delivery.companyName || 'there',
    );
    const itemsTable = this.itemsTableHtml(items);
    const site = delivery.siteName
      ? `<p><strong>Site:</strong> ${this.escapeHtml(delivery.siteName)}</p>`
      : '';
    const notes = delivery.notes
      ? `<p><strong>Notes:</strong><br/>${this.escapeHtml(delivery.notes).replace(/\n/g, '<br/>')}</p>`
      : '';
    const logo = this.logoImgHtml(settings, '16px 0 10px');

    const bodySource =
      String(settings.bodyHtml || '').trim() || this.composeBodyHtmlFromParts(settings);
    let body = this.applyEmailTokens(bodySource, delivery, greetingName);
    if (/\{\{\s*itemsTable\s*\}\}/i.test(body)) {
      body = body.replace(/\{\{\s*itemsTable\s*\}\}/gi, itemsTable);
    } else {
      body = `${body}${itemsTable}`;
    }
    if (/\{\{\s*logo\s*\}\}/i.test(body)) {
      body = body.replace(/\{\{\s*logo\s*\}\}/gi, logo);
    } else if (logo) {
      body = `${body}${logo}`;
    }
    body = this.sanitizeEmailHtml(this.quillHtmlForEmail(body));

    const headingRaw = String(settings.headingText || '').trim() || '<p>Consumables delivery</p>';
    const heading = this.renderRichEmailHtml(headingRaw, delivery, greetingName);

    return `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;">
        <div style="color:#166534;margin:0 0 12px;font-size:20px;font-weight:700;line-height:1.3;">${heading}</div>
        <p>Hello ${this.escapeHtml(greetingName)},</p>
        ${site}
        ${notes}
        ${body}
      </div>
    `;
  }

  async listCatalog(
    user: IUserInfo,
    query: { keyword?: string; activeOnly?: string; includeDeleted?: string },
  ) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const qb = this.consumablesRepository.createQueryBuilder('c').orderBy('c.name', 'ASC');
      if (String(query.includeDeleted || '') === '1') {
        qb.where('c.deletedAt IS NOT NULL');
      } else {
        qb.where('c.deletedAt IS NULL');
      }
      const keyword = String(query.keyword || '').trim();
      if (keyword) {
        qb.andWhere(
          `(c.name ILIKE :kw OR COALESCE(c.stockCode, '') ILIKE :kw OR COALESCE(c.category, '') ILIKE :kw OR COALESCE(c.description, '') ILIKE :kw)`,
          { kw: `%${keyword}%` },
        );
      }
      if (String(query.activeOnly || '') === '1') {
        qb.andWhere('c.isActive = true');
      }
      const rows = await qb.getMany();
      return { ...errorCode.SUCCESS, data: { count: rows.length, rows } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createCatalog(user: IUserInfo, body: CreateConsumableDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const name = String(body.name || '').trim();
      if (!name) return errorCode.VALIDATION_ERROR;
      const row = this.consumablesRepository.create({
        name,
        category: String(body.category || '').trim() || null,
        stockCode: String(body.stockCode || '').trim() || null,
        unit: String(body.unit || 'each').trim() || 'each',
        description: String(body.description || '').trim() || null,
        isActive: body.isActive !== false,
        createdBy: +user.userId,
        updatedBy: +user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const saved = await this.consumablesRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateCatalog(user: IUserInfo, id: number, body: UpdateConsumableDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.consumablesRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      if (body.name != null) row.name = String(body.name).trim() || row.name;
      if (body.category !== undefined) {
        row.category = String(body.category || '').trim() || null;
      }
      if (body.stockCode !== undefined) {
        row.stockCode = String(body.stockCode || '').trim() || null;
      }
      if (body.unit != null) row.unit = String(body.unit).trim() || row.unit;
      if (body.description !== undefined) {
        row.description = String(body.description || '').trim() || null;
      }
      if (body.isActive !== undefined) row.isActive = !!body.isActive;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      const saved = await this.consumablesRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeCatalog(user: IUserInfo, id: number, opts?: { permanent?: boolean }) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      if (opts?.permanent) {
        const row = await this.consumablesRepository.findOne({ where: { id } });
        if (!row || !row.deletedAt) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Only removed consumables can be permanently deleted',
          };
        }
        // Keep past order lines; just drop the catalog FK when present.
        await this.consumablesRepository.manager.query(
          `UPDATE public.consumable_delivery_items
           SET consumable_id = NULL
           WHERE consumable_id = $1`,
          [+id],
        );
        await this.consumablesRepository.delete({ id });
        return { ...errorCode.SUCCESS, message: 'Consumable permanently deleted' };
      }
      const row = await this.consumablesRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      row.deletedAt = new Date();
      row.isActive = false;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      await this.consumablesRepository.save(row);
      return { ...errorCode.SUCCESS, message: 'Consumable moved to removed' };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restoreCatalog(user: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.consumablesRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      row.deletedAt = null;
      row.isActive = true;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      const saved = await this.consumablesRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved, message: 'Consumable restored' };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async listPartyContacts(
    user: IUserInfo,
    query: { companyId?: string; supplierId?: string; picker?: string },
  ) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      let companyId = Number(query.companyId);
      const supplierId = Number(query.supplierId);
      if ((!Number.isFinite(companyId) || companyId <= 0) && Number.isFinite(supplierId) && supplierId > 0) {
        const supplier = await this.supplierDisplay(supplierId);
        companyId = supplier.companyId || 0;
      }
      if (!Number.isFinite(companyId) || companyId <= 0) {
        return {
          ...errorCode.SUCCESS,
          data: { companyId: null, rows: [] },
          message: 'Link this supply company to a directory company to manage contacts',
        };
      }
      const company = await this.companyDisplay(companyId);
      const companyName = String(company?.name || '').trim();
      const forPicker = String(query.picker || '') === '1';
      const rows: Array<{
        id: number;
        label: string;
        email: string | null;
        phone: string | null;
        position: string | null;
        landLine: string | null;
        companyId: number | null;
        allowDelete: number | null;
      }> = await this.consumablesRepository.manager.query(
        `
        SELECT
          u.id,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.username,
            CAST(u.id AS text)
          ) AS label,
          COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(c.company_email), '')) AS email,
          NULLIF(TRIM(u.phone), '') AS phone,
          NULLIF(TRIM(u.position), '') AS position,
          NULLIF(TRIM(c.land_line), '') AS "landLine",
          c.company_id AS "companyId",
          COALESCE(u.allow_delete, 0) AS "allowDelete"
        FROM customers c
        INNER JOIN users u ON u.id = c.user_id
        WHERE u.status != $2
          AND u.type = $3
          AND (
            c.company_id = $1
            OR (
              $4::boolean
              AND c.company_id IS NULL
              AND $5 <> ''
              AND LOWER(TRIM(COALESCE(c.company_name, ''))) = LOWER($5)
            )
          )
        ORDER BY label ASC
        `,
        [companyId, userStatus.DELETE, userType.CUSTOMER, forPicker, companyName],
      );
      return {
        ...errorCode.SUCCESS,
        data: {
          companyId,
          companyName,
          rows: (rows || [])
            .filter((r) => String(r.email || '').trim())
            .map((r) => ({
              id: +r.id,
              label: String(r.label || '').trim(),
              email: String(r.email || '').trim(),
              phone: String(r.phone || '').trim(),
              position: String(r.position || '').trim(),
              landLine: String(r.landLine || '').trim(),
              companyId: r.companyId != null ? +r.companyId : null,
              linked: r.companyId != null && +r.companyId === companyId,
              canDelete: r.companyId != null && +r.companyId === companyId,
            })),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  /**
   * Link an existing portal customer back onto this company's contact list.
   * Does not create a new user — returns NOT_FOUND when the email is unknown.
   */
  async linkPartyContact(
    user: IUserInfo,
    body: {
      companyId?: number;
      supplierId?: number;
      email?: string;
      fullName?: string;
      phone?: string;
      position?: string;
    },
  ) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      let companyId = Number(body.companyId);
      const supplierId = Number(body.supplierId);
      if ((!Number.isFinite(companyId) || companyId <= 0) && Number.isFinite(supplierId) && supplierId > 0) {
        const supplier = await this.supplierDisplay(supplierId);
        companyId = supplier.companyId || 0;
      }
      if (!Number.isFinite(companyId) || companyId <= 0) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Link a supply company to a directory company before adding contacts',
        };
      }
      const email = String(body.email || '')
        .trim()
        .toLowerCase();
      if (!email) return { ...errorCode.VALIDATION_ERROR, message: 'Email is required' };

      const rows: Array<{
        id: number;
        type: number;
        status: number;
        fullName: string | null;
        companyId: number | null;
      }> = await this.consumablesRepository.manager.query(
        `
        SELECT
          u.id,
          u.type,
          u.status,
          u.full_name AS "fullName",
          c.company_id AS "companyId"
        FROM users u
        LEFT JOIN customers c ON c.user_id = u.id
        WHERE LOWER(TRIM(u.email)) = $1
          AND u.type = $2
        ORDER BY CASE WHEN u.status = $3 THEN 1 ELSE 0 END, u.id ASC
        LIMIT 1
        `,
        [email, userType.CUSTOMER, userStatus.DELETE],
      );
      const existing = rows?.[0];
      if (!existing) {
        return {
          ...errorCode.NOT_FOUND,
          message: 'No portal customer with this email',
        };
      }

      if (+existing.status === userStatus.DELETE) {
        await this.consumablesRepository.manager.query(
          `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`,
          [userStatus.ACTIVE, existing.id],
        );
      }

      const currentCompanyId =
        existing.companyId != null && +existing.companyId > 0 ? +existing.companyId : null;
      if (currentCompanyId && currentCompanyId !== companyId) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message:
            'This customer is already linked to another company. Change their company in Customers, or use a different email.',
        };
      }

      const customerRows: Array<{ userId: number }> =
        await this.consumablesRepository.manager.query(
          `SELECT user_id AS "userId" FROM public.customers WHERE user_id = $1 LIMIT 1`,
          [existing.id],
        );
      if (!customerRows?.length) {
        return {
          ...errorCode.NOT_FOUND,
          message: 'No portal customer with this email',
        };
      }
      await this.consumablesRepository.manager.query(
        `UPDATE public.customers SET company_id = $1 WHERE user_id = $2`,
        [companyId, existing.id],
      );

      const name =
        String(body.fullName || existing.fullName || '').trim() || email;
      if (body.fullName || body.phone || body.position) {
        await this.consumablesRepository.manager.query(
          `
          UPDATE users SET
            full_name = COALESCE(NULLIF($1, ''), full_name),
            phone = COALESCE(NULLIF($2, ''), phone),
            position = COALESCE(NULLIF($3, ''), position),
            updated_at = NOW()
          WHERE id = $4
          `,
          [
            String(body.fullName || '').trim(),
            String(body.phone || '').trim(),
            String(body.position || '').trim(),
            existing.id,
          ],
        );
      }

      return {
        ...errorCode.SUCCESS,
        message:
          currentCompanyId === companyId
            ? `${name} is already on this contact list`
            : `${name} added back to contacts`,
        data: {
          id: existing.id,
          email,
          label: name,
          companyId,
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  /**
   * Remove a customer from this company's / supplier's contact list only.
   * Does not delete or deactivate the portal user account.
   */
  async softRemovePartyContact(
    user: IUserInfo,
    userId: number,
    query?: { companyId?: string; supplierId?: string },
  ) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      if (!Number.isFinite(userId) || userId <= 0) return errorCode.VALIDATION_ERROR;
      let companyId = Number(query?.companyId);
      const supplierId = Number(query?.supplierId);
      if ((!Number.isFinite(companyId) || companyId <= 0) && Number.isFinite(supplierId) && supplierId > 0) {
        const supplier = await this.supplierDisplay(supplierId);
        companyId = supplier.companyId || 0;
      }
      if (!Number.isFinite(companyId) || companyId <= 0) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'companyId is required to remove a contact from this list',
        };
      }
      const users: Array<{
        id: number;
        type: number;
        status: number;
        fullName: string | null;
      }> = await this.consumablesRepository.manager.query(
        `SELECT id, type, status, full_name AS "fullName" FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      );
      const target = users?.[0];
      if (!target) return errorCode.NOT_FOUND;
      if (+target.type !== userType.CUSTOMER) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Only customer contacts can be removed here' };
      }
      const linked: Array<{ userId: number }> = await this.consumablesRepository.manager.query(
        `SELECT user_id AS "userId" FROM public.customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [userId, companyId],
      );
      if (!linked?.length) {
        return {
          ...errorCode.NOT_FOUND,
          message: 'Contact is not linked to this company',
        };
      }
      await this.consumablesRepository.manager.query(
        `
        UPDATE public.customers
        SET company_id = NULL
        WHERE user_id = $1 AND company_id = $2
        `,
        [userId, companyId],
      );
      const name = String(target.fullName || 'Contact').trim() || 'Contact';
      return {
        ...errorCode.SUCCESS,
        message: `${name} removed from contacts (portal account kept)`,
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async listSuppliers(user: IUserInfo, query: { keyword?: string; activeOnly?: string }) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const qb = this.suppliersRepository
        .createQueryBuilder('s')
        .where('s.deletedAt IS NULL')
        .orderBy('s.name', 'ASC');
      const keyword = String(query.keyword || '').trim();
      if (keyword) {
        qb.andWhere(
          `(s.name ILIKE :kw OR COALESCE(s.category, '') ILIKE :kw OR COALESCE(s.contactName, '') ILIKE :kw OR COALESCE(s.email, '') ILIKE :kw OR COALESCE(s.phone, '') ILIKE :kw)`,
          { kw: `%${keyword}%` },
        );
      }
      if (String(query.activeOnly || '') === '1') {
        qb.andWhere('s.isActive = true');
      }
      const rows = await qb.getMany();
      return { ...errorCode.SUCCESS, data: { count: rows.length, rows } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private async resolveSupplierCompanyName(companyId: number | null | undefined, fallbackName?: string) {
    const id = companyId != null && Number(companyId) > 0 ? +companyId : null;
    if (id) {
      const rows: Array<{ name: string }> = await this.suppliersRepository.manager.query(
        `SELECT name FROM public.customer_companies WHERE id = $1 LIMIT 1`,
        [id],
      );
      const fromDb = String(rows?.[0]?.name || '').trim();
      if (fromDb) return { companyId: id, name: fromDb };
    }
    const name = String(fallbackName || '').trim();
    return { companyId: id, name };
  }

  async createSupplier(user: IUserInfo, body: CreateConsumableSupplierDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const resolved = await this.resolveSupplierCompanyName(body.companyId, body.name);
      if (!resolved.name) return errorCode.VALIDATION_ERROR;
      const row = this.suppliersRepository.create({
        companyId: resolved.companyId,
        name: resolved.name,
        category: String(body.category || '').trim() || null,
        contactName: String(body.contactName || '').trim() || null,
        email: String(body.email || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        address: String(body.address || '').trim() || null,
        website: String(body.website || '').trim() || null,
        notes: String(body.notes || '').trim() || null,
        isActive: body.isActive !== false,
        createdBy: +user.userId,
        updatedBy: +user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const saved = await this.suppliersRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateSupplier(user: IUserInfo, id: number, body: UpdateConsumableSupplierDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.suppliersRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      if (body.companyId !== undefined || body.name != null) {
        const resolved = await this.resolveSupplierCompanyName(
          body.companyId !== undefined ? body.companyId : row.companyId,
          body.name != null ? body.name : row.name,
        );
        if (!resolved.name) return errorCode.VALIDATION_ERROR;
        row.companyId = resolved.companyId;
        row.name = resolved.name;
      }
      if (body.contactName !== undefined) {
        row.contactName = String(body.contactName || '').trim() || null;
      }
      if (body.email !== undefined) row.email = String(body.email || '').trim() || null;
      if (body.phone !== undefined) row.phone = String(body.phone || '').trim() || null;
      if (body.address !== undefined) {
        row.address = String(body.address || '').trim() || null;
      }
      if (body.website !== undefined) {
        row.website = String(body.website || '').trim() || null;
      }
      if (body.notes !== undefined) row.notes = String(body.notes || '').trim() || null;
      if (body.category !== undefined) {
        row.category = String(body.category || '').trim() || null;
      }
      if (body.isActive !== undefined) row.isActive = !!body.isActive;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      const saved = await this.suppliersRepository.save(row);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeSupplier(user: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.suppliersRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      row.deletedAt = new Date();
      row.isActive = false;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      await this.suppliersRepository.save(row);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private async replaceDeliveryItems(deliveryId: number, items: DeliveryItem[]) {
    await this.deliveryItemsRepository.delete({ deliveryId });
    if (!items.length) return;
    await this.deliveryItemsRepository.save(
      items.map((item, index) =>
        this.deliveryItemsRepository.create({
          deliveryId,
          consumableId: item.consumableId,
          name: item.name,
          stockCode: item.stockCode,
          unit: item.unit,
          quantity: item.quantity,
          sortOrder: index,
        }),
      ),
    );
  }

  private parseItemsJsonFallback(itemsJsonFallback?: string): DeliveryItem[] {
    try {
      return this.normalizeItems(JSON.parse(itemsJsonFallback || '[]'));
    } catch {
      return [];
    }
  }

  private async loadDeliveryItems(deliveryId: number, itemsJsonFallback?: string): Promise<DeliveryItem[]> {
    const rows = await this.deliveryItemsRepository.find({
      where: { deliveryId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    if (rows.length) {
      return rows.map((row) => ({
        consumableId: row.consumableId,
        name: row.name,
        stockCode: row.stockCode || null,
        unit: row.unit,
        quantity: Number(row.quantity),
      }));
    }
    return this.parseItemsJsonFallback(itemsJsonFallback);
  }

  private async loadDeliveryItemsBatch(deliveryIds: number[]): Promise<Map<number, DeliveryItem[]>> {
    const map = new Map<number, DeliveryItem[]>();
    if (!deliveryIds.length) return map;
    const rows = await this.deliveryItemsRepository.find({
      where: { deliveryId: In(deliveryIds) },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    for (const row of rows) {
      const list = map.get(row.deliveryId) || [];
      list.push({
        consumableId: row.consumableId,
        name: row.name,
        stockCode: row.stockCode || null,
        unit: row.unit,
        quantity: Number(row.quantity),
      });
      map.set(row.deliveryId, list);
    }
    return map;
  }

  private async logDeliveryEvent(
    deliveryId: number,
    action: string,
    actorId: number | null,
    detail?: {
      emailedTo?: string | null;
      emailedCc?: string | null;
      detail?: string | null;
    },
  ) {
    await this.deliveryEventsRepository.save(
      this.deliveryEventsRepository.create({
        deliveryId,
        action,
        actorId,
        emailedTo: detail?.emailedTo ?? null,
        emailedCc: detail?.emailedCc ?? null,
        detail: detail?.detail ?? null,
      }),
    );
  }

  private async hydrateDelivery(row: ConsumableDelivery, opts?: { forCustomer?: boolean }) {
    const items = await this.loadDeliveryItems(row.id, row.itemsJson);
    const events = await this.deliveryEventsRepository.find({
      where: { deliveryId: row.id },
      relations: ['actor'],
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 50,
    });
    const brand = opts?.forCustomer
      ? String((await this.ensureEmailSettings()).brandName || '').trim() ||
        'SERVICELINK'
      : null;
    const createdName =
      row.createdUser?.fullName?.trim() ||
      row.createdUser?.username ||
      null;
    return {
      ...row,
      items,
      itemsJson: JSON.stringify(items),
      ...(brand
        ? {
            fromLabel: brand,
            fromSender: createdName || brand,
          }
        : {}),
      events: events.map((event) => ({
        id: event.id,
        action: event.action,
        emailedTo: event.emailedTo,
        emailedCc: event.emailedCc,
        detail: event.detail,
        createdAt: event.createdAt,
        actorName:
          event.actor?.fullName ||
          event.actor?.username ||
          (event.actorId ? `User #${event.actorId}` : 'System'),
      })),
    };
  }

  async listDeliveries(
    user: IUserInfo,
    query: {
      keyword?: string;
      customerId?: string;
      deleted?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const isAdmin = this.assertAdmin(user);
      const isCustomer = this.assertCustomer(user);
      if (!isAdmin && !isCustomer) return errorCode.FORBIDDEN;
      const showDeleted = String(query.deleted || '') === '1';
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
      const qb = this.deliveriesRepository
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.createdUser', 'createdUser')
        .orderBy('d.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      if (isCustomer) {
        // Customer soft-delete is per-login; admin soft-delete hides from everyone.
        qb.where('d.deletedAt IS NULL');
        await this.applyCustomerDeliveryScope(qb, user);
        qb.andWhere(this.customerPublishedDeliverySql(), {
          customerSentStatus: 'sent',
        });
        qb.andWhere(this.customerHiddenSql(showDeleted), {
          customerViewerId: +user.userId,
        });
      } else if (showDeleted) {
        qb.where('d.deletedAt IS NOT NULL');
      } else {
        qb.where('d.deletedAt IS NULL');
      }
      if (isAdmin) {
        const customerId = Number(query.customerId);
        if (Number.isFinite(customerId) && customerId > 0) {
          qb.andWhere('d.customerId = :customerId', { customerId });
        }
      }
      const keyword = String(query.keyword || '').trim();
      if (keyword) {
        qb.andWhere(
          `(d.subject ILIKE :kw OR d.companyName ILIKE :kw OR d.customerName ILIKE :kw OR d.siteName ILIKE :kw OR COALESCE(d.emailedTo, '') ILIKE :kw)`,
          { kw: `%${keyword}%` },
        );
      }
      const [rows, total] = await qb.getManyAndCount();
      const deliveryIds = rows.map((r) => r.id);
      const itemMap = await this.loadDeliveryItemsBatch(deliveryIds);
      const brand = isCustomer
        ? String((await this.ensureEmailSettings()).brandName || '').trim() ||
          'SERVICELINK'
        : null;
      const withItems = rows.map((row) => {
        const items =
          itemMap.get(row.id) ||
          this.parseItemsJsonFallback(row.itemsJson);
        const createdName =
          row.createdUser?.fullName?.trim() || row.createdUser?.username || null;
        return {
          ...row,
          items,
          itemsJson: JSON.stringify(items),
          // Customer portal: sender is ServiceLink (brand), not the receiving company.
          ...(brand
            ? {
                fromLabel: brand,
                fromSender: createdName || brand,
              }
            : {}),
        };
      });
      let deletedCount = 0;
      if (isAdmin) {
        const deletedCountRow: Array<{ count: string }> =
          await this.deliveriesRepository.manager.query(
            `SELECT COUNT(*)::text AS count FROM consumable_deliveries WHERE deleted_at IS NOT NULL`,
          );
        deletedCount = Number(deletedCountRow?.[0]?.count || 0);
      } else if (isCustomer) {
        const countQb = this.deliveriesRepository
          .createQueryBuilder('d')
          .where('d.deletedAt IS NULL');
        await this.applyCustomerDeliveryScope(countQb, user);
        countQb.andWhere(this.customerPublishedDeliverySql(), {
          customerSentStatus: 'sent',
        });
        countQb.andWhere(this.customerHiddenSql(true), {
          customerViewerId: +user.userId,
        });
        deletedCount = await countQb.getCount();
      }
      return {
        ...errorCode.SUCCESS,
        data: {
          count: total,
          page,
          limit,
          deletedCount,
          rows: withItems,
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async getDelivery(user: IUserInfo, id: number) {
    try {
      const isAdmin = this.assertAdmin(user);
      const isCustomer = this.assertCustomer(user);
      if (!isAdmin && !isCustomer) return errorCode.FORBIDDEN;
      const row = await this.deliveriesRepository.findOne({
        where: { id },
        relations: ['createdUser'],
      });
      if (!row) return errorCode.NOT_FOUND;
      if (isCustomer) {
        if (row.deletedAt) return errorCode.NOT_FOUND;
        if (!(await this.customerCanViewDelivery(user, row))) {
          return errorCode.FORBIDDEN;
        }
        if (!this.customerDeliveryIsPublished(row)) {
          // Unsent admin drafts must not open via deep-link.
          return errorCode.NOT_FOUND;
        }
        const vis = await this.customerVisibilityState(+user.userId, +id);
        if (vis.cleared || vis.hidden) return errorCode.NOT_FOUND;
      }
      return {
        ...errorCode.SUCCESS,
        data: await this.hydrateDelivery(row, { forCustomer: isCustomer }),
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private async supplierDisplay(supplierId: number) {
    const row = await this.suppliersRepository.findOne({
      where: { id: supplierId, deletedAt: IsNull() },
    });
    if (!row) {
      return { name: '', email: null as string | null, companyId: null as number | null };
    }
    return {
      name: String(row.name || '').trim(),
      email: String(row.email || '').trim() || null,
      companyId: row.companyId != null && +row.companyId > 0 ? +row.companyId : null,
    };
  }

  private async companyDisplay(companyId: number) {
    const rows: Array<{ name: string }> = await this.suppliersRepository.manager.query(
      `SELECT name FROM public.customer_companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    return { name: String(rows?.[0]?.name || '').trim() };
  }

  private async sendDeliveryEmail(
    delivery: ConsumableDelivery,
    actorId: number,
    emailTo?: string,
    emailCc?: string,
  ) {
    const items = await this.enrichItemsStockCodes(
      await this.loadDeliveryItems(delivery.id, delivery.itemsJson),
    );
    let fallbackEmail: string | null = null;
    if (delivery.supplierId) {
      fallbackEmail = (await this.supplierDisplay(+delivery.supplierId)).email;
    } else if (delivery.customerId) {
      fallbackEmail = (await this.customerDisplay(+delivery.customerId)).email;
    }
    const to = String(emailTo || delivery.emailedTo || fallbackEmail || '').trim();
    const toSet = new Set(
      to
        .split(/[;,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
    const cc = String(emailCc ?? delivery.emailedCc ?? '')
      .split(/[;,]+/)
      .map((e) => e.trim())
      .filter((e) => e && !toSet.has(e.toLowerCase()))
      .join(', ');
    if (!to) {
      delivery.emailStatus = 'failed';
      delivery.emailError = 'Supplier email not found';
      delivery.emailedTo = null;
      await this.deliveriesRepository.save(delivery);
      await this.logDeliveryEvent(delivery.id, 'send_failed', actorId, {
        detail: 'Supplier email not found',
      });
      return { ok: false, message: 'Supplier email not found', to: '' };
    }
    const subject = delivery.subject || `Consumables - ${delivery.companyName || delivery.customerName}`;
    const mail = await SendMailDetailed(
      to,
      subject,
      await this.deliveryEmailHtml(delivery, items),
      {
        cc: cc || undefined,
      },
    );
    delivery.emailedTo = to;
    delivery.emailedCc = cc || null;
    if (mail.ok) {
      delivery.emailedAt = new Date();
      delivery.emailStatus = 'sent';
      delivery.emailError = null;
    } else {
      delivery.emailStatus = 'failed';
      delivery.emailError = mail.error || 'Email failed to send';
    }
    await this.deliveriesRepository.save(delivery);
    await this.logDeliveryEvent(delivery.id, mail.ok ? 'send_ok' : 'send_failed', actorId, {
      emailedTo: to,
      emailedCc: cc || null,
      detail: mail.ok ? 'Email sent via Brevo' : mail.error || 'Email failed to send',
    });
    return {
      ok: mail.ok,
      message: mail.ok ? 'Email sent' : mail.error || 'Email failed to send',
      to,
    };
  }

  private mailResponse(saved: ConsumableDelivery, mail: { ok: boolean; message: string }) {
    return {
      ...errorCode.SUCCESS,
      data: saved,
      message: mail.message,
      emailFailed: !mail.ok,
    };
  }

  async createDelivery(user: IUserInfo, body: CreateConsumableDeliveryDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const supplierId = Number(body.supplierId);
      const companyId = Number(body.companyId);
      const customerId = Number(body.customerId);
      const items = await this.enrichItemsStockCodes(this.normalizeItems(body.items));
      const hasSupplier = Number.isFinite(supplierId) && supplierId > 0;
      const hasCompany = Number.isFinite(companyId) && companyId > 0;
      const hasCustomer = Number.isFinite(customerId) && customerId > 0;
      if ((!hasSupplier && !hasCompany && !hasCustomer) || !items.length) {
        return errorCode.VALIDATION_ERROR;
      }
      let companyName = String(body.companyName || '').trim();
      let customerName = String(body.customerName || '').trim();
      let resolvedCompanyId: number | null = hasCompany ? companyId : null;
      let defaultEmail: string | null = String(body.emailTo || '').trim() || null;
      if (hasSupplier) {
        const supplier = await this.supplierDisplay(supplierId);
        companyName = companyName || supplier.name;
        customerName = customerName || supplier.name;
        defaultEmail = defaultEmail || supplier.email;
        resolvedCompanyId = resolvedCompanyId || supplier.companyId;
      } else if (hasCompany) {
        const company = await this.companyDisplay(companyId);
        companyName = companyName || company.name;
        customerName = customerName || company.name;
      } else if (hasCustomer) {
        const display = await this.customerDisplay(customerId);
        companyName = companyName || display.companyName;
        customerName = customerName || display.customerName;
        defaultEmail = defaultEmail || display.email;
      }
      const contactName = String(body.contactName || '').trim();
      if (contactName) {
        customerName = contactName;
      } else if (defaultEmail) {
        customerName = await this.resolveContactNameFromEmails(defaultEmail, customerName);
      }
      const subject =
        String(body.subject || '').trim() ||
        `Consumables - ${companyName || customerName || 'supplier'}`;
      const delivery = this.deliveriesRepository.create({
        customerId: hasCustomer && !hasSupplier && !hasCompany ? customerId : null,
        supplierId: hasSupplier ? supplierId : null,
        companyId: resolvedCompanyId,
        customerName,
        companyName,
        siteName: String(body.siteName || '').trim(),
        subject,
        notes: String(body.notes || '').trim() || null,
        itemsJson: JSON.stringify(items),
        emailedTo: defaultEmail,
        emailedCc: String(body.emailCc || '').trim() || null,
        emailedAt: null,
        emailStatus: 'pending',
        emailError: null,
        createdBy: +user.userId,
        updatedBy: +user.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const saved = await this.deliveriesRepository.save(delivery);
      await this.replaceDeliveryItems(saved.id, items);
      await this.logDeliveryEvent(saved.id, 'created', +user.userId, {
        emailedTo: saved.emailedTo,
        emailedCc: saved.emailedCc,
        detail: `${items.length} item(s)`,
      });
      if (body.sendEmail === false) {
        return { ...errorCode.SUCCESS, data: await this.hydrateDelivery(saved) };
      }
      const mail = await this.sendDeliveryEmail(saved, +user.userId, body.emailTo, body.emailCc);
      const refreshed = await this.deliveriesRepository.findOne({ where: { id: saved.id } });
      return this.mailResponse(
        await this.hydrateDelivery(refreshed || saved),
        mail,
      );
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateDelivery(user: IUserInfo, id: number, body: CreateConsumableDeliveryDto) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.deliveriesRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      const supplierId = Number(
        body.supplierId !== undefined ? body.supplierId : row.supplierId,
      );
      const companyId = Number(
        body.companyId !== undefined ? body.companyId : row.companyId,
      );
      const customerId = Number(
        body.customerId !== undefined ? body.customerId : row.customerId,
      );
      const items = await this.enrichItemsStockCodes(
        body.items != null
          ? this.normalizeItems(body.items)
          : await this.loadDeliveryItems(row.id, row.itemsJson),
      );
      const hasSupplier = Number.isFinite(supplierId) && supplierId > 0;
      const hasCompany = Number.isFinite(companyId) && companyId > 0;
      const hasCustomer = Number.isFinite(customerId) && customerId > 0;
      if ((!hasSupplier && !hasCompany && !hasCustomer) || !items.length) {
        return errorCode.VALIDATION_ERROR;
      }
      let defaultEmail: string | null = null;
      if (hasSupplier) {
        const supplier = await this.supplierDisplay(supplierId);
        row.supplierId = supplierId;
        row.customerId = null;
        row.companyId = supplier.companyId || (hasCompany ? companyId : null);
        row.customerName =
          String(body.customerName || '').trim() || supplier.name || row.customerName;
        row.companyName =
          String(body.companyName || '').trim() || supplier.name || row.companyName;
        defaultEmail = supplier.email;
      } else if (hasCompany) {
        const company = await this.companyDisplay(companyId);
        row.supplierId = null;
        row.customerId = null;
        row.companyId = companyId;
        row.customerName =
          String(body.customerName || '').trim() || company.name || row.customerName;
        row.companyName =
          String(body.companyName || '').trim() || company.name || row.companyName;
      } else {
        const display = await this.customerDisplay(customerId);
        row.customerId = customerId;
        row.supplierId = null;
        row.companyId = null;
        row.customerName =
          String(body.customerName || '').trim() || display.customerName || row.customerName;
        row.companyName =
          String(body.companyName || '').trim() || display.companyName || row.companyName;
        defaultEmail = display.email;
      }
      if (body.siteName !== undefined) row.siteName = String(body.siteName || '').trim();
      if (body.subject !== undefined) {
        row.subject =
          String(body.subject || '').trim() ||
          `Consumables - ${row.companyName || row.customerName || 'supplier'}`;
      }
      if (body.notes !== undefined) row.notes = String(body.notes || '').trim() || null;
      row.itemsJson = JSON.stringify(items);
      if (body.emailTo !== undefined) {
        row.emailedTo = String(body.emailTo || '').trim() || defaultEmail || row.emailedTo;
      }
      if (body.emailCc !== undefined) {
        row.emailedCc = String(body.emailCc || '').trim() || null;
      }
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      const saved = await this.deliveriesRepository.save(row);
      await this.replaceDeliveryItems(saved.id, items);
      await this.logDeliveryEvent(saved.id, 'updated', +user.userId, {
        emailedTo: saved.emailedTo,
        emailedCc: saved.emailedCc,
        detail: `${items.length} item(s)`,
      });
      if (body.sendEmail === false) {
        return { ...errorCode.SUCCESS, data: await this.hydrateDelivery(saved) };
      }
      const mail = await this.sendDeliveryEmail(saved, +user.userId, body.emailTo, body.emailCc);
      const refreshed = await this.deliveriesRepository.findOne({ where: { id } });
      return this.mailResponse(
        await this.hydrateDelivery(refreshed || saved),
        mail,
      );
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async resendDelivery(user: IUserInfo, id: number, body?: { emailTo?: string; emailCc?: string }) {
    try {
      if (!this.assertAdmin(user)) return errorCode.FORBIDDEN;
      const row = await this.deliveriesRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!row) return errorCode.NOT_FOUND;
      if (body?.emailTo != null) row.emailedTo = String(body.emailTo || '').trim() || row.emailedTo;
      if (body?.emailCc != null) row.emailedCc = String(body.emailCc || '').trim() || null;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      await this.deliveriesRepository.save(row);
      const mail = await this.sendDeliveryEmail(row, +user.userId, body?.emailTo, body?.emailCc);
      const refreshed = await this.deliveriesRepository.findOne({ where: { id } });
      return this.mailResponse(
        await this.hydrateDelivery(refreshed || row),
        mail,
      );
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeDelivery(user: IUserInfo, id: number, opts?: { permanent?: boolean }) {
    try {
      const isAdmin = this.assertAdmin(user);
      const isCustomer = this.assertCustomer(user);
      if (!isAdmin && !isCustomer) return errorCode.FORBIDDEN;
      const row = await this.deliveriesRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;

      if (isCustomer) {
        if (row.deletedAt) return errorCode.NOT_FOUND;
        if (!(await this.customerCanViewDelivery(user, row))) {
          return errorCode.FORBIDDEN;
        }
        if (!this.customerDeliveryIsPublished(row)) {
          return errorCode.NOT_FOUND;
        }
        if (opts?.permanent) {
          await this.clearDeletedDeliveryForCustomer(user, id);
          return { ...errorCode.SUCCESS, message: 'Removed from Deleted' };
        }
        await this.softDeleteDeliveryForCustomer(user, id);
        return { ...errorCode.SUCCESS, message: 'Moved to Deleted' };
      }

      if (opts?.permanent) {
        if (!row.deletedAt) return errorCode.VALIDATION_ERROR;
        await this.deliveriesRepository.manager.query(
          `DELETE FROM public.consumable_delivery_customer_visibility WHERE delivery_id = $1`,
          [+id],
        );
        await this.deliveryEventsRepository.delete({ deliveryId: id });
        await this.deliveryItemsRepository.delete({ deliveryId: id });
        await this.deliveriesRepository.delete({ id });
        return { ...errorCode.SUCCESS, message: 'Order permanently deleted' };
      }
      if (row.deletedAt) return errorCode.NOT_FOUND;
      row.deletedAt = new Date();
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      await this.deliveriesRepository.save(row);
      await this.logDeliveryEvent(id, 'deleted', +user.userId);
      return { ...errorCode.SUCCESS, message: 'Order moved to Deleted' };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restoreDelivery(user: IUserInfo, id: number) {
    try {
      const isAdmin = this.assertAdmin(user);
      const isCustomer = this.assertCustomer(user);
      if (!isAdmin && !isCustomer) return errorCode.FORBIDDEN;
      const row = await this.deliveriesRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;

      if (isCustomer) {
        if (row.deletedAt) return errorCode.NOT_FOUND;
        if (!(await this.customerCanViewDelivery(user, row))) {
          return errorCode.FORBIDDEN;
        }
        if (!this.customerDeliveryIsPublished(row)) {
          return errorCode.NOT_FOUND;
        }
        await this.restoreDeliveryForCustomer(user, id);
        return {
          ...errorCode.SUCCESS,
          message: 'Restored',
          data: await this.hydrateDelivery(row),
        };
      }

      if (!row.deletedAt) return errorCode.NOT_FOUND;
      row.deletedAt = null;
      row.updatedBy = +user.userId;
      row.updatedAt = new Date();
      await this.deliveriesRepository.save(row);
      await this.logDeliveryEvent(id, 'restored', +user.userId);
      return { ...errorCode.SUCCESS, message: 'Order restored', data: await this.hydrateDelivery(row) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
