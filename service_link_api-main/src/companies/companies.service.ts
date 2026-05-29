import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { CustomerCompany } from '../users/entities/customer-company.entity';
import { Customer } from '../users/entities/customer.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetCompaniesDto } from './dto/get-companies.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(CustomerCompany)
    private readonly companyRepository: Repository<CustomerCompany>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  sanitizeName(name: string | undefined): string {
    return String(name ?? '')
      .replace(/\s*\[C-\d+\]\s*/gi, ' ')
      .replace(/\s*\(Copy\)\s*/gi, ' ')
      .replace(/\s*\(duplicate\)\s*/gi, ' ')
      .trim();
  }

  private normalizeKey(name: string): string {
    return this.sanitizeName(name).toLowerCase().replace(/\s+/g, ' ');
  }

  private toOptionRow(cc: CustomerCompany) {
    return {
      id: cc.id,
      name: cc.name,
      companyName: cc.name,
    };
  }

  private static readonly STAFF_COUNT_SQL = `(SELECT COUNT(DISTINCT sis.staff_id)::int
    FROM site_item_staffs sis
    INNER JOIN site_items si ON si.id = sis.site_item_id
    INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
    WHERE si.company_id = cc.id)`;

  private async getUsageCounts(companyId: number) {
    const customerCount = await this.customerRepository.count({
      where: { companyId },
    });
    const siteRows = await this.companyRepository.manager.query(
      `SELECT COUNT(DISTINCT site_id)::int AS cnt FROM site_items WHERE company_id = $1`,
      [companyId],
    );
    const staffRows = await this.companyRepository.manager.query(
      `SELECT COUNT(DISTINCT sis.staff_id)::int AS cnt
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
       WHERE si.company_id = $1`,
      [companyId],
    );
    return {
      customerCount,
      siteCount: +(siteRows?.[0]?.cnt ?? 0),
      staffCount: +(staffRows?.[0]?.cnt ?? 0),
    };
  }

  /** Dropdown list (same shape as legacy getCustomerCompanies). */
  async getAllOptions() {
    try {
      const companies = await this.companyRepository.find({ order: { name: 'ASC' } });
      return { ...errorCode.SUCCESS, data: companies.map((c) => this.toOptionRow(c)) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async findAll(body: GetCompaniesDto) {
    try {
      const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
      const allowedOrder = ['name', 'customerCount', 'siteCount', 'staffCount'] as const;
      const orderKey = allowedOrder.includes(body.orderBy as (typeof allowedOrder)[number])
        ? (body.orderBy as (typeof allowedOrder)[number])
        : 'name';
      const orderColumnMap: Record<(typeof allowedOrder)[number], string> = {
        name: 'cc.name',
        customerCount: 'customer_count',
        siteCount: 'site_count',
        staffCount: 'staff_count',
      };
      const orderCol = orderColumnMap[orderKey];

      const params: unknown[] = [];
      let keywordSql = '';
      if (body.keyword) {
        params.push(`%${body.keyword}%`);
        keywordSql = ` AND cc.name ILIKE $${params.length}`;
      }

      const countRows = await this.companyRepository.manager.query(
        `SELECT COUNT(*)::int AS cnt FROM customer_companies cc WHERE 1=1${keywordSql}`,
        params,
      );
      const count = +(countRows?.[0]?.cnt ?? 0);

      const limit = +body.limit || 10;
      const offset = Math.max(0, ((+body.page || 1) - 1) * limit);
      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;

      const listRows = await this.companyRepository.manager.query(
        `SELECT
          cc.id,
          cc.name,
          (SELECT COUNT(*)::int FROM customers c WHERE c.company_id = cc.id) AS customer_count,
          (SELECT COUNT(DISTINCT site_id)::int FROM site_items WHERE company_id = cc.id) AS site_count,
          ${CompaniesService.STAFF_COUNT_SQL} AS staff_count
        FROM customer_companies cc
        WHERE 1=1${keywordSql}
        ORDER BY ${orderCol} ${orderDir}, cc.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, limit, offset],
      );

      const rows = listRows.map((r: Record<string, unknown>) => ({
        id: +r.id,
        name: r.name,
        customerCount: +(r.customer_count ?? 0),
        siteCount: +(r.site_count ?? 0),
        staffCount: +(r.staff_count ?? 0),
      }));

      return { ...errorCode.SUCCESS, data: { rows, count } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async create(body: CreateCompanyDto) {
    try {
      const name = this.sanitizeName(body.name);
      if (!name) {
        return { ...errorCode.EXCEPTION, message: 'Company name is required' };
      }
      const normalizedName = this.normalizeKey(name);
      const existing = await this.companyRepository.findOne({ where: { normalizedName } });
      if (existing) {
        return { ...errorCode.EXCEPTION, message: 'A company with this name already exists' };
      }
      const saved = await this.companyRepository.save(
        this.companyRepository.create({ name, normalizedName }),
      );
      return { ...errorCode.SUCCESS, data: this.toOptionRow(saved) };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(id: number, body: UpdateCompanyDto) {
    try {
      const company = await this.companyRepository.findOne({ where: { id } });
      if (!company) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined) {
        const name = this.sanitizeName(body.name);
        if (!name) {
          return { ...errorCode.EXCEPTION, message: 'Company name is required' };
        }
        const normalizedName = this.normalizeKey(name);
        const duplicate = await this.companyRepository.findOne({
          where: { normalizedName },
        });
        if (duplicate && duplicate.id !== id) {
          return { ...errorCode.EXCEPTION, message: 'A company with this name already exists' };
        }
        company.name = name;
        company.normalizedName = normalizedName;
        await this.companyRepository.save(company);
        await this.customerRepository
          .createQueryBuilder()
          .update(Customer)
          .set({ companyName: name })
          .where('company_id = :id', { id })
          .execute();
      }
      return { ...errorCode.SUCCESS, data: this.toOptionRow(company) };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async remove(id: number) {
    try {
      const company = await this.companyRepository.findOne({ where: { id } });
      if (!company) {
        return errorCode.NOT_FOUND;
      }
      const { customerCount, siteCount } = await this.getUsageCounts(id);
      if (customerCount > 0 || siteCount > 0) {
        const parts: string[] = [];
        if (customerCount > 0) {
          parts.push(`${customerCount} customer account${customerCount === 1 ? '' : 's'}`);
        }
        if (siteCount > 0) {
          parts.push(`${siteCount} job site${siteCount === 1 ? '' : 's'}`);
        }
        return {
          ...errorCode.VALIDATION_ERROR,
          message: `Cannot delete this company while ${parts.join(' and ')} still use it.`,
        };
      }
      await this.companyRepository.delete(id);
      return { ...errorCode.SUCCESS };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }
}
