import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as moment from 'moment';
import { IsNull, Repository } from 'typeorm';
import { IUserInfo } from '../interfaces/IUserInfo';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import {
  applyCustomerScopeToQuery,
  customerCanAccessCustomerId,
} from '../helpers/customer-scope';
import { getPublicRoot } from '../paths';
import { Customer } from '../users/entities/customer.entity';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { ClearDeletedInvoicesDto } from './dto/clear-deleted-invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private customerRepo() {
    return this.invoicesRepository.manager.getRepository(Customer);
  }

  private async customerDisplayForUser(
    userId: number,
  ): Promise<{ customerName: string; companyName: string }> {
    if (!userId) return { customerName: '', companyName: '' };
    const rows: Array<{ customerName: string | null; companyName: string | null }> =
      await this.invoicesRepository.manager.query(
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
          ) AS "companyName"
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
    };
  }

  async create(userInfo: IUserInfo, body: CreateInvoiceDto) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      if (!body.customerId || !String(body.title || '').trim()) {
        return errorCode.VALIDATION_ERROR;
      }
      if (!body.attachFiles || body.attachFiles === '[]') {
        return errorCode.VALIDATION_ERROR;
      }

      const display = await this.customerDisplayForUser(+body.customerId);
      const invoice = this.invoicesRepository.create({
        customerId: +body.customerId,
        customerName: body.customerName?.trim() || display.customerName,
        companyName: body.companyName?.trim() || display.companyName,
        title: String(body.title).trim(),
        notes: body.notes?.trim() || null,
        attachFiles: body.attachFiles,
        createdBy: +userInfo.userId,
        updatedBy: +userInfo.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await this.invoicesRepository.save(invoice);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private listDeletedTab(body: GetInvoicesDto): boolean {
    return String(body.status || '').trim().toLowerCase() === 'deleted';
  }

  private applyKeywordAndDateFilters(
    query: ReturnType<Repository<Invoice>['createQueryBuilder']>,
    body: GetInvoicesDto,
  ) {
    if (body.keyword) {
      query.andWhere(
        `(invoices.title ILIKE :keyword
          OR invoices.company_name ILIKE :keyword
          OR invoices.customer_name ILIKE :keyword
          OR createdUser.full_name ILIKE :keyword
          OR createdUser.username ILIKE :keyword)`,
        { keyword: `%${body.keyword}%` },
      );
    }

    if (body.startDate && body.endDate) {
      query.andWhere('invoices.created_at > :startDate AND invoices.created_at <= :endDate', {
        startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
        endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
      });
    }
  }

  private applyRoleListTabFilter(
    query: ReturnType<Repository<Invoice>['createQueryBuilder']>,
    userInfo: IUserInfo,
    listDeleted: boolean,
  ) {
    const viewerId = +userInfo.userId;

    if (+userInfo.type === userType.CUSTOMER) {
      applyCustomerScopeToQuery(query, userInfo, 'invoices.customerId');
      if (listDeleted) {
        query.andWhere(
          `EXISTS (
            SELECT 1 FROM invoice_customer_visibility v
            WHERE v.invoice_id = invoices.id
              AND v.user_id = :customerViewerId
              AND v.hidden_at IS NOT NULL
              AND v.cleared_at IS NULL
          )`,
          { customerViewerId: viewerId },
        );
      } else {
        query.andWhere(
          `NOT EXISTS (
            SELECT 1 FROM invoice_customer_visibility v
            WHERE v.invoice_id = invoices.id
              AND v.user_id = :customerViewerId
              AND v.hidden_at IS NOT NULL
              AND v.cleared_at IS NULL
          )`,
          { customerViewerId: viewerId },
        );
      }
      return;
    }

    if (+userInfo.type === userType.ADMIN) {
      if (listDeleted) {
        query.andWhere('invoices.admin_deleted_at IS NOT NULL');
      } else {
        query.andWhere('invoices.admin_deleted_at IS NULL');
      }
    }
  }

  private buildListQuery(userInfo: IUserInfo, body: GetInvoicesDto) {
    const listDeleted = this.listDeletedTab(body);
    const query = this.invoicesRepository
      .createQueryBuilder('invoices')
      .leftJoin('invoices.customer', 'customer')
      .addSelect(['customer.fullName', 'customer.username'])
      .leftJoin('invoices.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username']);

    this.applyKeywordAndDateFilters(query, body);

    if (+userInfo.type === userType.CUSTOMER) {
      this.applyRoleListTabFilter(query, userInfo, listDeleted);
    } else if (+userInfo.type === userType.ADMIN) {
      this.applyRoleListTabFilter(query, userInfo, listDeleted);
    } else {
      return null;
    }

    const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
    const orderBy = body.orderBy || 'createdAt';
    const orderMap: Record<string, string> = {
      createdAt: 'invoices.createdAt',
      companyName: 'invoices.companyName',
      customerName: 'invoices.customerName',
      title: 'invoices.title',
      sender: 'createdUser.fullName',
      files: 'invoices.attachFiles',
    };
    const orderColumn = orderMap[orderBy] || orderMap.createdAt;
    query.orderBy(orderColumn, orderDir);
    return query;
  }

  private async softDeleteForCustomer(userInfo: IUserInfo, invoiceId: number) {
    await this.invoicesRepository.manager.query(
      `
      INSERT INTO public.invoice_customer_visibility (invoice_id, user_id, hidden_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (invoice_id, user_id) DO UPDATE
      SET hidden_at = COALESCE(public.invoice_customer_visibility.hidden_at, NOW())
      `,
      [+invoiceId, +userInfo.userId],
    );
  }

  private async restoreForCustomer(userInfo: IUserInfo, invoiceId: number) {
    await this.invoicesRepository.manager.query(
      `
      UPDATE public.invoice_customer_visibility
      SET hidden_at = NULL
      WHERE invoice_id = $1 AND user_id = $2 AND hidden_at IS NOT NULL
      `,
      [+invoiceId, +userInfo.userId],
    );
  }

  async findAll(userInfo: IUserInfo, body: GetInvoicesDto) {
    try {
      const query = this.buildListQuery(userInfo, body);
      if (!query) {
        return errorCode.CAN_NOT_DELETE;
      }

      if (+body.limit) {
        query.take(+body.limit).skip((+body.page - 1) * +body.limit);
      }

      const [rows, count] = await query.getManyAndCount();
      return { ...errorCode.SUCCESS, data: { count, rows } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async countDeletedTab(userInfo: IUserInfo, body: GetInvoicesDto) {
    try {
      const query = this.buildListQuery(userInfo, { ...body, status: 'deleted' });
      if (!query) {
        return { ...errorCode.SUCCESS, data: 0 };
      }
      const count = await query.getCount();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private parseAttachFileUrls(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  }

  private fileNameFromUrl(url: string): string {
    const parts = String(url).split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'invoice-file');
  }

  private contentTypeFromFilename(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lower.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'application/octet-stream';
  }

  private async readInvoiceFileBuffer(
    fileUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const filename = this.fileNameFromUrl(fileUrl);
    const marker = '/public/';
    const lower = fileUrl.toLowerCase();
    const markerIndex = lower.indexOf(marker);
    if (markerIndex >= 0) {
      const relative = fileUrl.slice(markerIndex + marker.length);
      const fullPath = join(getPublicRoot(), relative);
      if (existsSync(fullPath)) {
        const buffer = await fs.readFile(fullPath);
        return {
          buffer,
          contentType: this.contentTypeFromFilename(filename),
          filename,
        };
      }
    }

    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const contentType =
      String(response.headers['content-type'] || '').split(';')[0].trim() ||
      this.contentTypeFromFilename(filename);
    return {
      buffer: Buffer.from(response.data),
      contentType,
      filename,
    };
  }

  private async getInvoiceIfAllowed(
    userInfo: IUserInfo,
    id: number,
  ): Promise<Invoice | null> {
    const invoice = await this.invoicesRepository.findOne({ where: { id: +id } });
    if (!invoice) return null;

    if (+userInfo.type === userType.CUSTOMER) {
      const allowed = await customerCanAccessCustomerId(
        this.customerRepo(),
        +userInfo.userId,
        +invoice.customerId,
      );
      if (!allowed) return null;
    } else if (+userInfo.type !== userType.ADMIN) {
      return null;
    }

    return invoice;
  }

  async downloadFile(
    userInfo: IUserInfo,
    id: number,
    fileIndex: number,
  ): Promise<
    | { buffer: Buffer; contentType: string; filename: string }
    | { error: typeof errorCode.NOT_FOUND | typeof errorCode.EXCEPTION }
  > {
    try {
      const invoice = await this.getInvoiceIfAllowed(userInfo, id);
      if (!invoice) {
        return { error: errorCode.NOT_FOUND };
      }

      const urls = this.parseAttachFileUrls(invoice.attachFiles);
      const index = Number.isFinite(fileIndex) ? Math.max(0, Math.floor(fileIndex)) : 0;
      const fileUrl = urls[index];
      if (!fileUrl) {
        return { error: errorCode.NOT_FOUND };
      }

      const file = await this.readInvoiceFileBuffer(fileUrl);
      return file;
    } catch (error) {
      this.logger.error(error);
      return { error: errorCode.EXCEPTION };
    }
  }

  async findOne(userInfo: IUserInfo, id: number) {
    try {
      const invoice = await this.getInvoiceIfAllowed(userInfo, id);
      if (!invoice) return errorCode.NOT_FOUND;

      return { ...errorCode.SUCCESS, data: invoice };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateInvoiceDto) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const invoice = await this.invoicesRepository.findOne({ where: { id: +id } });
      if (!invoice || invoice.adminDeletedAt) return errorCode.NOT_FOUND;

      if (body.title !== undefined) invoice.title = String(body.title).trim();
      if (body.notes !== undefined) invoice.notes = body.notes?.trim() || null;
      if (body.attachFiles !== undefined) invoice.attachFiles = body.attachFiles;
      invoice.updatedBy = +userInfo.userId;
      invoice.updatedAt = new Date();

      const saved = await this.invoicesRepository.save(invoice);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(userInfo: IUserInfo, id: number) {
    try {
      const invoice = await this.getInvoiceIfAllowed(userInfo, id);
      if (!invoice) return errorCode.NOT_FOUND;

      if (+userInfo.type === userType.ADMIN) {
        if (invoice.adminDeletedAt) {
          await this.invoicesRepository.manager.query(
            `DELETE FROM public.invoice_customer_visibility WHERE invoice_id = $1`,
            [+id],
          );
          await this.invoicesRepository.delete(+id);
          return errorCode.SUCCESS;
        }
        invoice.adminDeletedAt = new Date();
        invoice.updatedBy = +userInfo.userId;
        invoice.updatedAt = new Date();
        await this.invoicesRepository.save(invoice);
        return errorCode.SUCCESS;
      }

      if (+userInfo.type === userType.CUSTOMER) {
        const hiddenRows = await this.invoicesRepository.manager.query(
          `
          SELECT 1 FROM invoice_customer_visibility
          WHERE invoice_id = $1 AND user_id = $2
            AND hidden_at IS NOT NULL AND cleared_at IS NULL
          LIMIT 1
          `,
          [+id, +userInfo.userId],
        );
        if (hiddenRows?.length) {
          await this.invoicesRepository.manager.query(
            `
            UPDATE public.invoice_customer_visibility
            SET cleared_at = NOW()
            WHERE invoice_id = $1 AND user_id = $2
              AND hidden_at IS NOT NULL AND cleared_at IS NULL
            `,
            [+id, +userInfo.userId],
          );
          return errorCode.SUCCESS;
        }
        await this.softDeleteForCustomer(userInfo, +id);
        return errorCode.SUCCESS;
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restore(userInfo: IUserInfo, id: number) {
    try {
      const invoice = await this.getInvoiceIfAllowed(userInfo, id);
      if (!invoice) return errorCode.NOT_FOUND;

      if (+userInfo.type === userType.ADMIN) {
        if (!invoice.adminDeletedAt) {
          return errorCode.NOT_FOUND;
        }
        invoice.adminDeletedAt = null;
        invoice.updatedBy = +userInfo.userId;
        invoice.updatedAt = new Date();
        await this.invoicesRepository.save(invoice);
        return errorCode.SUCCESS;
      }

      if (+userInfo.type === userType.CUSTOMER) {
        await this.restoreForCustomer(userInfo, +id);
        return errorCode.SUCCESS;
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async clearDeleted(userInfo: IUserInfo, body: ClearDeletedInvoicesDto) {
    try {
      const ids = Array.from(
        new Set((body?.ids || []).map((n) => +n).filter((n) => Number.isFinite(n) && n > 0)),
      );
      if (!ids.length) {
        return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };
      }

      if (+userInfo.type === userType.ADMIN) {
        let clearedCount = 0;
        for (const invoiceId of ids) {
          const invoice = await this.invoicesRepository.findOne({ where: { id: invoiceId } });
          if (!invoice?.adminDeletedAt) continue;
          await this.invoicesRepository.manager.query(
            `DELETE FROM public.invoice_customer_visibility WHERE invoice_id = $1`,
            [invoiceId],
          );
          await this.invoicesRepository.delete(invoiceId);
          clearedCount += 1;
        }
        return { ...errorCode.SUCCESS, data: { clearedCount } };
      }

      if (+userInfo.type === userType.CUSTOMER) {
        const params: unknown[] = [+userInfo.userId, ...ids];
        const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(', ');
        const result = await this.invoicesRepository.manager.query(
          `
          UPDATE public.invoice_customer_visibility v
          SET cleared_at = NOW()
          WHERE v.user_id = $1
            AND v.invoice_id IN (${placeholders})
            AND v.hidden_at IS NOT NULL
            AND v.cleared_at IS NULL
          `,
          params,
        );
        const clearedCount =
          (result && typeof result.rowCount === 'number' && result.rowCount) || 0;
        return { ...errorCode.SUCCESS, data: { clearedCount } };
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async countForDashboard(userInfo: IUserInfo): Promise<number> {
    try {
      if (+userInfo.type === userType.CUSTOMER) {
        return this.countUnopenedForCustomer(userInfo);
      }
      if (+userInfo.type === userType.ADMIN) {
        return this.invoicesRepository.count({ where: { adminDeletedAt: IsNull() } });
      }
      return 0;
    } catch (error) {
      this.logger.error(error);
      return 0;
    }
  }

  private async countUnopenedForCustomer(userInfo: IUserInfo): Promise<number> {
    const query = this.invoicesRepository.createQueryBuilder('invoices');
    applyCustomerScopeToQuery(query, userInfo, 'invoices.customerId');
    query.andWhere('invoices.admin_deleted_at IS NULL');
    query.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM invoice_customer_visibility v
        WHERE v.invoice_id = invoices.id
          AND v.user_id = :viewerId
          AND v.hidden_at IS NOT NULL
          AND v.cleared_at IS NULL
      )`,
      { viewerId: +userInfo.userId },
    );
    query.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM invoice_customer_visibility v
        WHERE v.invoice_id = invoices.id
          AND v.user_id = :viewerId
          AND v.opened_at IS NOT NULL
      )`,
      { viewerId: +userInfo.userId },
    );
    return query.getCount();
  }

  private async setCustomerOpened(viewerId: number, invoiceId: number) {
    await this.invoicesRepository.manager.query(
      `
      INSERT INTO public.invoice_customer_visibility (invoice_id, user_id, opened_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (invoice_id, user_id) DO UPDATE
      SET opened_at = COALESCE(public.invoice_customer_visibility.opened_at, NOW())
      `,
      [+invoiceId, +viewerId],
    );
  }

  async markAllOpened(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.SUCCESS;
      }
      const query = this.invoicesRepository
        .createQueryBuilder('invoices')
        .select(['invoices.id']);
      applyCustomerScopeToQuery(query, userInfo, 'invoices.customerId');
      query.andWhere('invoices.admin_deleted_at IS NULL');
      query.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM invoice_customer_visibility v
          WHERE v.invoice_id = invoices.id
            AND v.user_id = :viewerId
            AND v.hidden_at IS NOT NULL
            AND v.cleared_at IS NULL
        )`,
        { viewerId: +userInfo.userId },
      );
      const rows = await query.getMany();
      for (const row of rows) {
        if (row.id) {
          await this.setCustomerOpened(+userInfo.userId, +row.id);
        }
      }
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async countForCustomer(userInfo: IUserInfo): Promise<number> {
    if (+userInfo.type !== userType.CUSTOMER && +userInfo.type !== userType.ADMIN) {
      return 0;
    }
    const query = this.invoicesRepository.createQueryBuilder('invoices');
    if (+userInfo.type === userType.CUSTOMER) {
      applyCustomerScopeToQuery(query, userInfo, 'invoices.customerId');
    }
    return query.getCount();
  }
}
