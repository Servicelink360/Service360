import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { errorCode } from '../constants/errorCode';
import { Service } from '../services/entities/service.entity';
import { FaultIssue } from './entities/fault-issue.entity';
import { ServiceFaultIssue } from './entities/service-fault-issue.entity';
import { AddServiceFaultIssueDto } from './dto/add-service-fault-issue.dto';
import { CreateFaultIssueDto } from './dto/create-fault-issue.dto';

export const OTHER_FAULT_ISSUE_LABEL = 'Other';

@Injectable()
export class FaultIssuesService {
  constructor(
    @InjectRepository(FaultIssue)
    private readonly faultIssuesRepository: Repository<FaultIssue>,
    @InjectRepository(ServiceFaultIssue)
    private readonly serviceFaultIssuesRepository: Repository<ServiceFaultIssue>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  private async findOtherIssue(): Promise<FaultIssue | null> {
    return this.faultIssuesRepository.findOne({
      where: { label: OTHER_FAULT_ISSUE_LABEL, isActive: true },
    });
  }

  async listCatalog() {
    try {
      const rows = await this.faultIssuesRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', label: 'ASC' },
      });
      return { ...errorCode.SUCCESS, data: rows };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createCatalogIssue(body: CreateFaultIssueDto) {
    try {
      const label = String(body.label ?? '').trim();
      if (!label) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Issue label is required' };
      }
      const existing = await this.faultIssuesRepository.findOne({ where: { label } });
      if (existing) {
        if (!existing.isActive) {
          existing.isActive = true;
          await this.faultIssuesRepository.save(existing);
        }
        return { ...errorCode.SUCCESS, data: existing };
      }
      const maxSort = await this.faultIssuesRepository
        .createQueryBuilder('f')
        .select('COALESCE(MAX(f.sort_order), -1)', 'max')
        .getRawOne();
      const saved = await this.faultIssuesRepository.save({
        label,
        sortOrder: +(maxSort?.max ?? -1) + 1,
        isActive: true,
      });
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private mapOptions(rows: { label: string }[]) {
    return rows.map((row) => ({ id: row.label, name: row.label }));
  }

  async listForService(serviceId: number) {
    try {
      const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
      if (!service) return errorCode.NOT_FOUND;

      const rows = await this.serviceFaultIssuesRepository
        .createQueryBuilder('sfi')
        .innerJoinAndSelect('sfi.faultIssue', 'fi')
        .where('sfi.service_id = :serviceId', { serviceId })
        .andWhere('fi.is_active = true')
        .orderBy('fi.sort_order', 'ASC')
        .addOrderBy('fi.label', 'ASC')
        .getMany();

      const data = rows.map((row) => ({
        faultIssueId: row.faultIssueId,
        label: row.faultIssue?.label ?? '',
        sortOrder: row.sortOrder,
      }));
      return { ...errorCode.SUCCESS, data };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async getIssueOptionsForService(serviceId?: number) {
    try {
      if (!serviceId || !Number.isFinite(+serviceId)) {
        const other = await this.findOtherIssue();
        return {
          ...errorCode.SUCCESS,
          data: other ? this.mapOptions([other]) : [],
        };
      }

      const rows = await this.serviceFaultIssuesRepository
        .createQueryBuilder('sfi')
        .innerJoin('sfi.faultIssue', 'fi')
        .select('fi.label', 'label')
        .where('sfi.service_id = :serviceId', { serviceId: +serviceId })
        .andWhere('fi.is_active = true')
        .orderBy('fi.sort_order', 'ASC')
        .addOrderBy('fi.label', 'ASC')
        .getRawMany<{ label: string }>();

      const labels = rows
        .map((row) => String(row.label ?? (row as { fi_label?: string }).fi_label ?? '').trim())
        .filter(Boolean);
      if (!labels.length) {
        return { ...errorCode.SUCCESS, data: [] };
      }

      return { ...errorCode.SUCCESS, data: this.mapOptions(labels.map((label) => ({ label }))) };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async isIssueAllowedForService(serviceId: number, issueLabel: string): Promise<boolean> {
    const label = String(issueLabel ?? '').trim();
    if (!label || !serviceId) return false;

    const row = await this.serviceFaultIssuesRepository
      .createQueryBuilder('sfi')
      .innerJoin('sfi.faultIssue', 'fi')
      .where('sfi.service_id = :serviceId', { serviceId: +serviceId })
      .andWhere('fi.is_active = true')
      .andWhere('fi.label = :label', { label })
      .getOne();

    return Boolean(row);
  }

  async ensureOtherOnService(serviceId: number) {
    const other = await this.findOtherIssue();
    if (!other?.id) return;

    const existing = await this.serviceFaultIssuesRepository.findOne({
      where: { serviceId, faultIssueId: other.id },
    });
    if (existing) return;

    const maxSort = await this.serviceFaultIssuesRepository
      .createQueryBuilder('sfi')
      .select('COALESCE(MAX(sfi.sort_order), -1)', 'max')
      .where('sfi.service_id = :serviceId', { serviceId })
      .getRawOne();

    await this.serviceFaultIssuesRepository.save({
      serviceId,
      faultIssueId: other.id,
      sortOrder: +(maxSort?.max ?? -1) + 1,
    });
  }

  private async resolveFaultIssue(body: AddServiceFaultIssueDto): Promise<FaultIssue | null> {
    if (body.faultIssueId) {
      return this.faultIssuesRepository.findOne({
        where: { id: +body.faultIssueId, isActive: true },
      });
    }
    const label = String(body.label ?? '').trim();
    if (!label) return null;
    const created = await this.createCatalogIssue({ label });
    if (created.code !== errorCode.SUCCESS.code || !created.data) return null;
    return created.data as FaultIssue;
  }

  async addToService(serviceId: number, body: AddServiceFaultIssueDto) {
    try {
      const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
      if (!service) return errorCode.NOT_FOUND;

      const faultIssue = await this.resolveFaultIssue(body);
      if (!faultIssue?.id) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Issue is required' };
      }

      const dup = await this.serviceFaultIssuesRepository.findOne({
        where: { serviceId, faultIssueId: faultIssue.id },
      });
      if (dup) {
        return { ...errorCode.CODE_EXIST, message: 'Issue already assigned to this service' };
      }

      const maxSort = await this.serviceFaultIssuesRepository
        .createQueryBuilder('sfi')
        .select('COALESCE(MAX(sfi.sort_order), -1)', 'max')
        .where('sfi.service_id = :serviceId', { serviceId })
        .getRawOne();

      await this.serviceFaultIssuesRepository.save({
        serviceId,
        faultIssueId: faultIssue.id,
        sortOrder:
          faultIssue.sortOrder != null && Number.isFinite(+faultIssue.sortOrder)
            ? +faultIssue.sortOrder
            : +(maxSort?.max ?? -1) + 1,
      });

      return {
        ...errorCode.SUCCESS,
        data: { faultIssueId: faultIssue.id, label: faultIssue.label },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeFromService(serviceId: number, faultIssueId: number) {
    try {
      const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
      if (!service) return errorCode.NOT_FOUND;

      const link = await this.serviceFaultIssuesRepository.findOne({
        where: { serviceId, faultIssueId },
        relations: ['faultIssue'],
      });
      if (!link) return errorCode.NOT_FOUND;

      await this.serviceFaultIssuesRepository.delete({ serviceId, faultIssueId });
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async replaceForService(serviceId: number, faultIssueIds: number[]) {
    try {
      const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
      if (!service) return errorCode.NOT_FOUND;

      const orderedIds: number[] = [];
      const seen = new Set<number>();
      for (const raw of faultIssueIds ?? []) {
        const id = +raw;
        if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
        seen.add(id);
        orderedIds.push(id);
      }

      const current = await this.serviceFaultIssuesRepository.find({
        where: { serviceId },
      });
      const currentById = new Map(current.map((row) => [row.faultIssueId, row]));
      const nextIdSet = new Set(orderedIds);

      for (const row of current) {
        if (nextIdSet.has(row.faultIssueId)) continue;
        await this.serviceFaultIssuesRepository.delete({
          serviceId,
          faultIssueId: row.faultIssueId,
        });
      }

      for (let i = 0; i < orderedIds.length; i++) {
        const faultIssueId = orderedIds[i];
        const existing = currentById.get(faultIssueId);
        if (existing) {
          if (existing.sortOrder !== i) {
            existing.sortOrder = i;
            await this.serviceFaultIssuesRepository.save(existing);
          }
          continue;
        }
        await this.serviceFaultIssuesRepository.save({
          serviceId,
          faultIssueId,
          sortOrder: i,
        });
      }

      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
