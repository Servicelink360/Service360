import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { Customer } from '../users/entities/customer.entity';
import { CustomerCompany } from '../users/entities/customer-company.entity';
import { customerCanAccessCustomerId } from '../helpers/customer-scope';
import { CustomerPersonnel } from './entities/customer-personnel.entity';
import { CreateCustomerPersonnelDto } from './dto/create-customer-personnel.dto';
import { UpdateCustomerPersonnelDto } from './dto/update-customer-personnel.dto';
import { CreateCustomerPersonnelRoleTypeDto } from './dto/create-customer-personnel-role-type.dto';
import { CustomerPersonnelRoleType } from './entities/customer-personnel-role-type.entity';

const ROLE_LABEL_MAX = 100;

@Injectable()
export class CustomerPersonnelService {
  constructor(
    @InjectRepository(CustomerPersonnel)
    private readonly personnelRepository: Repository<CustomerPersonnel>,
    @InjectRepository(CustomerPersonnelRoleType)
    private readonly roleTypeRepository: Repository<CustomerPersonnelRoleType>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerCompany)
    private readonly companyRepository: Repository<CustomerCompany>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private normalizeKey(name: string): string {
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  async resolveCompanyIdForCustomerUser(userId: number): Promise<number | null> {
    const me = await this.customerRepository.findOne({ where: { userId } });
    if (!me) return null;
    if (me.companyId != null && +me.companyId > 0) return +me.companyId;
    const name = String(me.companyName ?? '').trim();
    if (!name) return null;
    const key = this.normalizeKey(name);
    let company = await this.companyRepository.findOne({
      where: { normalizedName: key },
    });
    if (!company) {
      company = await this.companyRepository.save({
        name,
        normalizedName: key,
      });
    }
    return company.id;
  }

  async resolveCompanyIdForFaultCustomer(customerId: number): Promise<number | null> {
    return this.resolveCompanyIdForCustomerUser(+customerId);
  }

  private normalizeRoleLabel(label: string): string {
    return String(label ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, ROLE_LABEL_MAX);
  }

  private normalizeRoleKey(label: string): string {
    return this.normalizeRoleLabel(label).toLowerCase();
  }

  private formatRoleLabel(label: string): string | null {
    const cleaned = this.normalizeRoleLabel(label);
    return cleaned || null;
  }

  private async ensureRoleTypeForCompany(companyId: number, label: string): Promise<string | null> {
    const formatted = this.formatRoleLabel(label);
    if (!formatted) return null;
    const normalized = this.normalizeRoleKey(formatted);
    let row = await this.roleTypeRepository.findOne({
      where: { companyId, normalizedLabel: normalized },
    });
    if (!row) {
      row = await this.roleTypeRepository.save({
        companyId,
        label: formatted,
        normalizedLabel: normalized,
      });
    } else if (row.label !== formatted) {
      row.label = formatted;
      await this.roleTypeRepository.save(row);
    }
    return row.label;
  }

  private async resolveCompanyIdFromFaultId(faultId: number): Promise<number | null> {
    const faultRow: { customer_id: number }[] = await this.personnelRepository.manager.query(
      `SELECT customer_id FROM report_faults WHERE id = $1 LIMIT 1`,
      [+faultId],
    );
    const customerId = faultRow?.[0]?.customer_id;
    if (!customerId) return null;
    return this.resolveCompanyIdForFaultCustomer(+customerId);
  }

  private async resolveCompanyIdForPersonnelContext(
    userInfo: IUserInfo,
    faultId?: number,
  ): Promise<number | null> {
    if (+userInfo.type === userType.CUSTOMER) {
      return this.resolveCompanyIdForCustomerUser(+userInfo.userId);
    }
    if (+userInfo.type === userType.ADMIN && faultId != null && +faultId > 0) {
      return this.resolveCompanyIdFromFaultId(+faultId);
    }
    return null;
  }

  async listRoleTypes(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      const companyId = await this.resolveCompanyIdForCustomerUser(+userInfo.userId);
      if (!companyId) {
        return { ...errorCode.SUCCESS, data: [] };
      }
      const catalog = await this.roleTypeRepository.find({
        where: { companyId },
        order: { label: 'ASC' },
      });
      const catalogKeys = new Set(catalog.map((r) => r.normalizedLabel));
      const personnelRows = await this.personnelRepository.find({
        where: { companyId, isActive: true },
        select: ['role'],
      });
      for (const row of personnelRows) {
        const formatted = this.formatRoleLabel(row.role);
        if (!formatted) continue;
        const key = this.normalizeRoleKey(formatted);
        if (catalogKeys.has(key)) continue;
        await this.ensureRoleTypeForCompany(companyId, formatted);
        catalogKeys.add(key);
      }
      const merged = await this.roleTypeRepository.find({
        where: { companyId },
        order: { label: 'ASC' },
      });
      return {
        ...errorCode.SUCCESS,
        data: merged.map((r) => ({ id: r.id, label: r.label })),
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createRoleType(userInfo: IUserInfo, body: CreateCustomerPersonnelRoleTypeDto) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      const companyId = await this.resolveCompanyIdForCustomerUser(+userInfo.userId);
      if (!companyId) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Company profile required' };
      }
      const formatted = this.formatRoleLabel(body.label);
      if (!formatted) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Type name is required' };
      }
      const label = await this.ensureRoleTypeForCompany(companyId, formatted);
      const row = await this.roleTypeRepository.findOne({
        where: { companyId, normalizedLabel: this.normalizeRoleKey(formatted) },
      });
      return { ...errorCode.SUCCESS, data: { id: row?.id ?? 0, label: label ?? formatted } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeRoleType(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      const companyId = await this.resolveCompanyIdForCustomerUser(+userInfo.userId);
      if (!companyId) return errorCode.NOT_FOUND;
      const row = await this.roleTypeRepository.findOne({ where: { id, companyId } });
      if (!row) return errorCode.NOT_FOUND;
      const assigned = await this.personnelRepository
        .createQueryBuilder('p')
        .select(['p.name', 'p.email'])
        .where('p.company_id = :companyId', { companyId })
        .andWhere('p.is_active = true')
        .andWhere('LOWER(TRIM(p.role)) = :key', { key: row.normalizedLabel })
        .orderBy('p.name', 'ASC')
        .getMany();
      if (assigned.length > 0) {
        const contactWord = assigned.length === 1 ? 'contact' : 'contacts';
        return {
          ...errorCode.VALIDATION_ERROR,
          message: `Cannot remove "${row.label}" — still assigned to ${assigned.length} personnel ${contactWord}`,
          data: {
            typeLabel: row.label,
            totalCount: assigned.length,
            assignedContacts: assigned.map((p) => ({
              name: p.name || p.email,
              email: p.email,
            })),
          },
        };
      }
      await this.roleTypeRepository.delete(row.id);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private mapRow(row: CustomerPersonnel) {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      email: row.email,
      phone: row.phone ?? '',
      role: row.role,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  async list(userInfo: IUserInfo, faultId?: number) {
    try {
      if (+userInfo.type === userType.ADMIN && (!faultId || +faultId <= 0)) {
        return { ...errorCode.EXCEPTION, message: 'Customer or admin with faultId required' };
      }
      const companyId = await this.resolveCompanyIdForPersonnelContext(userInfo, faultId);

      if (+userInfo.type !== userType.CUSTOMER && +userInfo.type !== userType.ADMIN) {
        return { ...errorCode.EXCEPTION, message: 'Customer or admin with faultId required' };
      }

      if (!companyId) {
        return { ...errorCode.SUCCESS, data: [] };
      }

      const rows = await this.personnelRepository.find({
        where: { companyId, isActive: true },
        order: { name: 'ASC' },
      });
      return { ...errorCode.SUCCESS, data: rows.map((r) => this.mapRow(r)) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async create(userInfo: IUserInfo, body: CreateCustomerPersonnelDto) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      const companyId = await this.resolveCompanyIdForCustomerUser(+userInfo.userId);
      if (!companyId) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Company profile required to add personnel' };
      }
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!name || !email) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Name and email are required' };
      }
      const roleRaw = this.formatRoleLabel(body.role ?? 'Personnel');
      if (!roleRaw) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Personnel type is required' };
      }
      const role = await this.ensureRoleTypeForCompany(companyId, roleRaw);
      if (!role) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Personnel type is required' };
      }
      const saved = await this.personnelRepository.save({
        companyId,
        name,
        email,
        phone: body.phone?.trim() || null,
        role,
        isActive: true,
        createdBy: +userInfo.userId,
      });
      return { ...errorCode.SUCCESS, data: this.mapRow(saved) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private async canManagePersonnel(userInfo: IUserInfo, row: CustomerPersonnel): Promise<boolean> {
    if (+userInfo.type === userType.ADMIN) return true;
    if (+userInfo.type !== userType.CUSTOMER) return false;
    const companyId = await this.resolveCompanyIdForCustomerUser(+userInfo.userId);
    return companyId != null && +companyId === +row.companyId;
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateCustomerPersonnelDto) {
    try {
      const row = await this.personnelRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      if (!(await this.canManagePersonnel(userInfo, row))) {
        return +userInfo.type === userType.CUSTOMER ? errorCode.CAN_NOT_DELETE : errorCode.EXCEPTION;
      }
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      if (body.name !== undefined) row.name = String(body.name).trim();
      if (body.email !== undefined) row.email = String(body.email).trim().toLowerCase();
      if (body.phone !== undefined) row.phone = body.phone?.trim() || null;
      if (body.role !== undefined) {
        const roleRaw = this.formatRoleLabel(body.role);
        if (!roleRaw) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel type is required' };
        }
        const role = await this.ensureRoleTypeForCompany(row.companyId, roleRaw);
        if (!role) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel type is required' };
        }
        row.role = role;
      }
      if (body.isActive !== undefined) row.isActive = !!body.isActive;
      const saved = await this.personnelRepository.save(row);
      return { ...errorCode.SUCCESS, data: this.mapRow(saved) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(userInfo: IUserInfo, id: number) {
    try {
      const row = await this.personnelRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Customer only' };
      }
      if (!(await this.canManagePersonnel(userInfo, row))) {
        return errorCode.CAN_NOT_DELETE;
      }
      row.isActive = false;
      await this.personnelRepository.save(row);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async findActiveForDelegation(personnelId: number, faultCustomerId: number) {
    const row = await this.personnelRepository.findOne({
      where: { id: personnelId, isActive: true },
    });
    if (!row) return null;
    const companyId = await this.resolveCompanyIdForFaultCustomer(faultCustomerId);
    if (!companyId || +companyId !== +row.companyId) return null;
    const allowed = await customerCanAccessCustomerId(
      this.customerRepository,
      faultCustomerId,
      faultCustomerId,
    );
    if (!allowed && companyId) {
      // personnel company must match fault customer org
    }
    return row;
  }

  async findActiveMapByIds(
    ids: number[],
  ): Promise<Map<number, { name: string; role: string }>> {
    const unique = [...new Set(ids.filter((id) => id > 0))];
    const map = new Map<number, { name: string; role: string }>();
    if (!unique.length) return map;
    const rows = await this.personnelRepository.find({
      where: { id: In(unique), isActive: true },
    });
    for (const row of rows) {
      map.set(+row.id, {
        name: String(row.name ?? '').trim(),
        role: String(row.role ?? '').trim(),
      });
    }
    return map;
  }

  async assertPersonnelBelongsToFaultCustomer(
    personnelId: number,
    faultCustomerId: number,
  ): Promise<CustomerPersonnel | null> {
    const row = await this.personnelRepository.findOne({
      where: { id: personnelId, isActive: true },
    });
    if (!row) return null;
    const faultCompanyId = await this.resolveCompanyIdForFaultCustomer(faultCustomerId);
    if (!faultCompanyId || +faultCompanyId !== +row.companyId) return null;
    return row;
  }
}
