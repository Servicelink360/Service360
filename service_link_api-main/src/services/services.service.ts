

import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { Logger } from 'winston';
import { IUserInfo } from '../interfaces/IUserInfo';
import { Service } from './entities/service.entity';
import { ServiceActivity } from '../sites/entities/service-activity.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { GetServicesDto } from './dto/get-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import {
  CreateServiceActivityDto,
  UpdateServiceActivityDto,
} from './dto/service-activity.dto';
import {
  isDetailedService,
  normalizeServiceFrequencyType,
  resolveServiceFrequencyType,
} from './service-frequency.util';
import { FaultIssuesService } from '../fault-issues/fault-issues.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly servicesRepository: Repository<Service>,
    @InjectRepository(ServiceActivity)
    private readonly serviceActivitiesRepository: Repository<ServiceActivity>,
    @Inject('winston') private readonly logger: Logger,
    private readonly faultIssuesService: FaultIssuesService,
  ) { }
  async getAll() {
    const data = await this.servicesRepository.createQueryBuilder('services')
      .select(['services.id', 'services.name', 'services.frequencyType'])
      .orderBy('services.name', 'ASC')
      .getMany();
    return { ...errorCode.SUCCESS, data };
  }

  async create(userInfo: IUserInfo, body: CreateServiceDto) {
    try {
      const dup = await this.servicesRepository.findOne({ where: { name: body.name } });
      if (dup) {
        return errorCode.CODE_EXIST
      }
      const data = new Service();
      data.name = body.name;
      if (body.description !== undefined)
        data.description = body.description;
      data.frequencyType = normalizeServiceFrequencyType(body.frequencyType);
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;

      const newItem = await this.servicesRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      await this.faultIssuesService.ensureOtherOnService(newItem.id);
      return { ...errorCode.SUCCESS, data: { id: newItem.id } };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private usageCountSelects(): string {
    return `
      (SELECT COUNT(DISTINCT si.site_id)::int FROM site_items si WHERE si.service_id = d.id) AS site_count,
      (SELECT COUNT(DISTINCT si.customer_id)::int FROM site_items si WHERE si.service_id = d.id) AS customer_count,
      (SELECT COUNT(DISTINCT si.company_id)::int FROM site_items si WHERE si.service_id = d.id AND si.company_id IS NOT NULL) AS company_count,
      (SELECT COUNT(DISTINCT sis.staff_id)::int
        FROM site_item_staffs sis
        INNER JOIN site_items si ON si.id = sis.site_item_id
        INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
        WHERE si.service_id = d.id) AS staff_count,
      (SELECT COUNT(DISTINCT t.id)::int
        FROM tasks t
        INNER JOIN site_items si ON si.id = t.site_item_id
        WHERE si.service_id = d.id) AS task_count`;
  }

  async findAll(body: GetServicesDto) {
    try {
      const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
      const allowedOrder = [
        'id',
        'name',
        'createdAt',
        'siteCount',
        'customerCount',
        'companyCount',
        'staffCount',
        'taskCount',
      ] as const;
      const orderKey = allowedOrder.includes(body.orderBy as (typeof allowedOrder)[number])
        ? (body.orderBy as (typeof allowedOrder)[number])
        : 'name';
      const orderColumnMap: Record<(typeof allowedOrder)[number], string> = {
        id: 'd.id',
        name: 'd.name',
        createdAt: 'd.created_at',
        siteCount: 'site_count',
        customerCount: 'customer_count',
        companyCount: 'company_count',
        staffCount: 'staff_count',
        taskCount: 'task_count',
      };
      const orderCol = orderColumnMap[orderKey];

      const params: unknown[] = [];
      let keywordSql = '';
      if (body.keyword) {
        params.push(`%${body.keyword}%`);
        keywordSql = ` AND (d.name ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
      }

      const countRows = await this.servicesRepository.manager.query(
        `SELECT COUNT(*)::int AS cnt FROM services d WHERE 1=1${keywordSql}`,
        params,
      );
      const count = +(countRows?.[0]?.cnt ?? 0);

      const limit = +body.limit || 10;
      const offset = Math.max(0, ((+body.page || 1) - 1) * limit);
      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;

      const listRows = await this.servicesRepository.manager.query(
        `SELECT
          d.id,
          d.name,
          d.description,
          d.frequency_type AS "frequencyType",
          d.created_at AS "createdAt",
          d.updated_at AS "updatedAt",
          d.created_by AS "createdBy",
          cu.full_name AS "createdUserFullName",
          ${this.usageCountSelects()}
        FROM services d
        LEFT JOIN users cu ON cu.id = d.created_by
        WHERE 1=1${keywordSql}
        ORDER BY ${orderCol} ${orderDir}, d.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, limit, offset],
      );

      const rows = listRows.map((r: Record<string, unknown>) => ({
        id: +r.id,
        name: r.name,
        description: r.description,
        frequencyType: resolveServiceFrequencyType({
          frequencyType: r.frequencyType as string,
          name: r.name as string,
        }),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        createdBy: r.createdBy,
        createdUser: r.createdUserFullName
          ? { fullName: r.createdUserFullName }
          : undefined,
        siteCount: +(r.site_count ?? 0),
        customerCount: +(r.customer_count ?? 0),
        companyCount: +(r.company_count ?? 0),
        staffCount: +(r.staff_count ?? 0),
        taskCount: +(r.task_count ?? 0),
      }));

      return { ...errorCode.SUCCESS, data: { count, rows } };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateServiceDto) {
    try {
      const data = await this.servicesRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined)
        data.name = body.name;
      if (body.description !== undefined)
        data.description = body.description;
      if (body.frequencyType !== undefined) {
        const nextType = normalizeServiceFrequencyType(body.frequencyType);
        if (
          isDetailedService(data) &&
          nextType === 'simple' &&
          (await this.serviceHasActivitySchedules(id))
        ) {
          return {
            ...errorCode.EXCEPTION,
            message:
              'Cannot switch to Simple while activity schedules exist on site items for this service.',
          };
        }
        data.frequencyType = nextType;
      }

      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.servicesRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }

      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(id: number) {
    try {
      const data = await this.servicesRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.servicesRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.servicesRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private async serviceHasActivitySchedules(serviceId: number): Promise<boolean> {
    const row = await this.servicesRepository.manager.query(
      `
      SELECT 1
      FROM site_item_activity_schedules sch
      INNER JOIN site_items si ON si.id = sch.site_item_id
      WHERE si.service_id = $1
      LIMIT 1
      `,
      [serviceId],
    );
    return row?.length > 0;
  }

  private async assertDetailedService(serviceId: number): Promise<Service | null> {
    const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
    if (!service) return null;
    if (!isDetailedService(service)) {
      return null;
    }
    return service;
  }

  async listActivities(serviceId: number) {
    try {
      const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
      if (!service) return errorCode.NOT_FOUND;
      const rows = await this.serviceActivitiesRepository.find({
        where: { serviceId },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
      return { ...errorCode.SUCCESS, data: rows };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createActivity(serviceId: number, body: CreateServiceActivityDto) {
    try {
      const service = await this.assertDetailedService(serviceId);
      if (!service) {
        return {
          ...errorCode.EXCEPTION,
          message: 'Activities are only available for Detailed frequency services.',
        };
      }
      const name = String(body.name ?? '').trim();
      if (!name) {
        return { ...errorCode.EXCEPTION, message: 'Activity name is required' };
      }
      const dup = await this.serviceActivitiesRepository.findOne({
        where: { serviceId, name },
      });
      if (dup) {
        return { ...errorCode.CODE_EXIST, message: 'Activity already exists on this service' };
      }
      const maxSort = await this.serviceActivitiesRepository
        .createQueryBuilder('a')
        .select('COALESCE(MAX(a.sort_order), -1)', 'max')
        .where('a.service_id = :serviceId', { serviceId })
        .getRawOne();
      const saved = await this.serviceActivitiesRepository.save({
        serviceId,
        name,
        sortOrder: body.sortOrder ?? +(maxSort?.max ?? -1) + 1,
      });
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateActivity(
    serviceId: number,
    activityId: number,
    body: UpdateServiceActivityDto,
  ) {
    try {
      const service = await this.assertDetailedService(serviceId);
      if (!service) {
        return {
          ...errorCode.EXCEPTION,
          message: 'Activities are only available for Detailed frequency services.',
        };
      }
      const activity = await this.serviceActivitiesRepository.findOne({
        where: { id: activityId, serviceId },
      });
      if (!activity) return errorCode.NOT_FOUND;
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) {
          return { ...errorCode.EXCEPTION, message: 'Activity name is required' };
        }
        activity.name = name;
      }
      if (body.sortOrder !== undefined) {
        activity.sortOrder = +body.sortOrder;
      }
      const saved = await this.serviceActivitiesRepository.save(activity);
      return { ...errorCode.SUCCESS, data: saved };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeActivity(serviceId: number, activityId: number) {
    try {
      const service = await this.assertDetailedService(serviceId);
      if (!service) {
        return {
          ...errorCode.EXCEPTION,
          message: 'Activities are only available for Detailed frequency services.',
        };
      }
      const activity = await this.serviceActivitiesRepository.findOne({
        where: { id: activityId, serviceId },
      });
      if (!activity) return errorCode.NOT_FOUND;
      await this.servicesRepository.manager.query(
        `DELETE FROM site_item_activity_schedules WHERE activity_id = $1`,
        [activityId],
      );
      await this.serviceActivitiesRepository.delete(activityId);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
