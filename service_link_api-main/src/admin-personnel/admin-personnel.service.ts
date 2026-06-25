import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { AdminPersonnel } from './entities/admin-personnel.entity';
import { AdminPersonnelRoleType } from './entities/admin-personnel-role-type.entity';
import { CreateAdminPersonnelDto } from './dto/create-admin-personnel.dto';
import { UpdateAdminPersonnelDto } from './dto/update-admin-personnel.dto';
import { CreateAdminPersonnelRoleTypeDto } from './dto/create-admin-personnel-role-type.dto';

const ROLE_LABEL_MAX = 100;

@Injectable()
export class AdminPersonnelService {
  constructor(
    @InjectRepository(AdminPersonnel)
    private readonly personnelRepository: Repository<AdminPersonnel>,
    @InjectRepository(AdminPersonnelRoleType)
    private readonly roleTypeRepository: Repository<AdminPersonnelRoleType>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private assertAdmin(userInfo: IUserInfo) {
    return +userInfo.type === userType.ADMIN;
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

  private async ensureRoleType(label: string): Promise<string | null> {
    const formatted = this.formatRoleLabel(label);
    if (!formatted) return null;
    const normalized = this.normalizeRoleKey(formatted);
    let row = await this.roleTypeRepository.findOne({
      where: { normalizedLabel: normalized },
    });
    if (!row) {
      row = await this.roleTypeRepository.save({
        label: formatted,
        normalizedLabel: normalized,
      });
    } else if (row.label !== formatted) {
      row.label = formatted;
      await this.roleTypeRepository.save(row);
    }
    return row.label;
  }

  private mapRow(row: AdminPersonnel) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? '',
      role: row.role,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  async listRoleTypes(userInfo: IUserInfo) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const catalog = await this.roleTypeRepository.find({ order: { label: 'ASC' } });
      const catalogKeys = new Set(catalog.map((r) => r.normalizedLabel));
      const personnelRows = await this.personnelRepository.find({
        where: { isActive: true },
        select: ['role'],
      });
      for (const row of personnelRows) {
        const formatted = this.formatRoleLabel(row.role);
        if (!formatted) continue;
        const key = this.normalizeRoleKey(formatted);
        if (catalogKeys.has(key)) continue;
        await this.ensureRoleType(formatted);
        catalogKeys.add(key);
      }
      const merged = await this.roleTypeRepository.find({ order: { label: 'ASC' } });
      return {
        ...errorCode.SUCCESS,
        data: merged.map((r) => ({ id: r.id, label: r.label })),
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createRoleType(userInfo: IUserInfo, body: CreateAdminPersonnelRoleTypeDto) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const formatted = this.formatRoleLabel(body.label);
      if (!formatted) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Type name is required' };
      }
      const label = await this.ensureRoleType(formatted);
      const row = await this.roleTypeRepository.findOne({
        where: { normalizedLabel: this.normalizeRoleKey(formatted) },
      });
      return { ...errorCode.SUCCESS, data: { id: row?.id ?? 0, label: label ?? formatted } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeRoleType(userInfo: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const row = await this.roleTypeRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      const assigned = await this.personnelRepository
        .createQueryBuilder('p')
        .select(['p.name', 'p.email'])
        .where('p.is_active = true')
        .andWhere('LOWER(TRIM(p.role)) = :key', { key: row.normalizedLabel })
        .orderBy('p.name', 'ASC')
        .getMany();
      if (assigned.length > 0) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: `Cannot remove "${row.label}" — still assigned to ${assigned.length} staff`,
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

  async list(userInfo: IUserInfo) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const rows = await this.personnelRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
      return { ...errorCode.SUCCESS, data: rows.map((r) => this.mapRow(r)) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async create(userInfo: IUserInfo, body: CreateAdminPersonnelDto) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!name || !email) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Name and email are required' };
      }
      const roleRaw = this.formatRoleLabel(body.role ?? 'Staff');
      if (!roleRaw) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Staff type is required' };
      }
      const role = await this.ensureRoleType(roleRaw);
      if (!role) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Staff type is required' };
      }
      const saved = await this.personnelRepository.save({
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

  async update(userInfo: IUserInfo, id: number, body: UpdateAdminPersonnelDto) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const row = await this.personnelRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      if (body.name !== undefined) row.name = String(body.name).trim();
      if (body.email !== undefined) row.email = String(body.email).trim().toLowerCase();
      if (body.phone !== undefined) row.phone = body.phone?.trim() || null;
      if (body.role !== undefined) {
        const roleRaw = this.formatRoleLabel(body.role);
        if (!roleRaw) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff type is required' };
        }
        const role = await this.ensureRoleType(roleRaw);
        if (!role) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff type is required' };
        }
        row.role = role;
      }
      const saved = await this.personnelRepository.save(row);
      return { ...errorCode.SUCCESS, data: this.mapRow(saved) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(userInfo: IUserInfo, id: number) {
    try {
      if (!this.assertAdmin(userInfo)) {
        return { ...errorCode.EXCEPTION, message: 'Admin only' };
      }
      const row = await this.personnelRepository.findOne({ where: { id } });
      if (!row) return errorCode.NOT_FOUND;
      row.isActive = false;
      await this.personnelRepository.save(row);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async findActiveById(id: number): Promise<AdminPersonnel | null> {
    if (!id) return null;
    const row = await this.personnelRepository.findOne({ where: { id, isActive: true } });
    return row ?? null;
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
}
