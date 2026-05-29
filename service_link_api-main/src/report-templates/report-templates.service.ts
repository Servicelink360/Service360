function extractPgError(error: any) {
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    detail: error?.detail,
    schema: error?.schema,
    table: error?.table,
    column: error?.column,
    constraint: error?.constraint,
    where: error?.where,
    parameters: error?.parameters,
    query: error?.query,
  };
}

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { IUserInfo } from '../interfaces/IUserInfo';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { ReportTemplate } from './entities/report-template.entity';
import { CreateReportTemplateDto, ReportTemplateItemDto } from './dto/create-report-template.dto';
import { eStatus } from '../constants/status';
import { ReportTemplateItem } from './entities/report-template-item.entity';
import { ReportTemplateCategory } from './entities/report-template-category.entity';
import { ReportTemplateService } from './entities/report-template-service.entity';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import {
  attachServiceIdsToTemplates,
  syncTemplateServices,
  normalizeServiceIds,
} from './report-template-services.helper';
import { GetReportTemplatesDto } from './dto/get-report-templates.dto';
import { ASSIGNED_STAFF_ALL } from './report-template-assignment.constants';
import { UserTasksService } from '../user-tasks/user-tasks.service';
import { userType } from '../constants/user';
import { DEFAULT_REPORT_TEMPLATE_CATEGORIES } from './report-template-category.enum';
import {
  createItemEntities,
  normalizeCategory,
  sortTemplateItems,
} from './report-template-items.helper';

const PRESET_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_REPORT_TEMPLATE_CATEGORIES.map((item) => [item.id, item.name]),
);

const formatCategoryLabel = (value: string) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  const preset = DEFAULT_REPORT_TEMPLATE_CATEGORIES.find(
    (item) => item.id.toLowerCase() === trimmed.toLowerCase(),
  );
  if (preset) {
    return preset.name;
  }
  if (PRESET_CATEGORY_LABELS[trimmed]) {
    return PRESET_CATEGORY_LABELS[trimmed];
  }
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

@Injectable()
export class ReportTemplatesService {
  constructor(
    @InjectRepository(ReportTemplate) private readonly reportTemplatesRepository: Repository<ReportTemplate>,
    @InjectRepository(ReportTemplateItem) private readonly reportTemplateItemRepository: Repository<ReportTemplateItem>,
    @InjectRepository(ReportTemplateCategory) private readonly categoryRepository: Repository<ReportTemplateCategory>,
    @InjectRepository(ReportTemplateService)
    private readonly ReportTemplateServiceRepository: Repository<ReportTemplateService>,
    @Inject('winston') private readonly logger: Logger,
    @Inject(forwardRef(() => UserTasksService)) private readonly userTasksService: UserTasksService,
    private readonly connection: Connection,
  ) {}

  private async collectCategoryMap(): Promise<Map<string, string>> {
    const seen = new Map<string, string>();
    const add = (raw?: string) => {
      const name = String(raw ?? '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, name);
      }
    };

    Object.keys(PRESET_CATEGORY_LABELS).forEach((id) => add(id));

    try {
      const stored = await this.categoryRepository.find({ order: { name: 'ASC' } });
      stored.forEach((row) => add(row.name));
    } catch (error) {
      this.logger.warn(`getCategories: category table unavailable: ${error?.message}`);
    }

    try {
      const rows = await this.reportTemplatesRepository
        .createQueryBuilder('rt')
        .select('DISTINCT rt.category', 'category')
        .where("rt.category IS NOT NULL AND TRIM(rt.category) <> ''")
        .orderBy('rt.category', 'ASC')
        .getRawMany();
      rows.forEach((row) => add(row?.category));
    } catch (error) {
      this.logger.warn(`getCategories: could not load template categories: ${error?.message}`);
    }

    return seen;
  }

  async getCategories() {
    const seen = await this.collectCategoryMap();
    const data = Array.from(seen.values())
      .sort((a, b) => formatCategoryLabel(a).localeCompare(formatCategoryLabel(b)))
      .map((id) => ({ id, name: formatCategoryLabel(id) }));
    return { ...errorCode.SUCCESS, data };
  }

  async createCategory(name: string) {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      return { ...errorCode.EXCEPTION, message: 'Category name is required' };
    }
    if (trimmed.length > 120) {
      return { ...errorCode.EXCEPTION, message: 'Category name must be at most 120 characters' };
    }

    const key = trimmed.toLowerCase();
    const existing = await this.categoryRepository
      .createQueryBuilder('c')
      .where('LOWER(c.name) = :key', { key })
      .getOne();
    if (existing) {
      return {
        ...errorCode.SUCCESS,
        data: { id: existing.name, name: formatCategoryLabel(existing.name) },
      };
    }

    try {
      const saved = await this.categoryRepository.save({ name: trimmed });
      return {
        ...errorCode.SUCCESS,
        data: { id: saved.name, name: formatCategoryLabel(saved.name) },
      };
    } catch (error) {
      const pg = extractPgError(error);
      if (pg.code === '23505') {
        return {
          ...errorCode.SUCCESS,
          data: { id: trimmed, name: formatCategoryLabel(trimmed) },
        };
      }
      this.logger.error(`createCategory failed: ${pg.message}`, (error as Error).stack);
      return { ...errorCode.EXCEPTION, message: pg.message || 'Could not save category' };
    }
  }

  async duplicate(user: IUserInfo, id: string) {
    try {
      return await this.connection.transaction(async (manager) => {
        const template = await manager.findOne(ReportTemplate, {
          where: { id: +id },
          relations: ['items'],
        });
        if (!template) {
          return errorCode.NOT_FOUND;
        }

        const newTemplate = manager.create(ReportTemplate, {
          name: `${template.name} (Copy)`,
          description: template.description ?? '',
          fileUrl: template.fileUrl ?? '',
          status: eStatus.YES,
          order: template.order ?? 0,
          category: normalizeCategory(template.category),
          settings: template.settings ?? null,
          assignedStaffId: template.assignedStaffId ?? null,
          createdBy: user.userId,
          updatedBy: user.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const savedTemplate = await manager.save(newTemplate);

        const sortedItems = sortTemplateItems(template.items);
        if (sortedItems.length) {
          await manager.query(
            `SELECT setval(
              'public.report_template_items_id_seq'::regclass,
              GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.report_template_items), 1),
              true
            )`,
          );
          const newItems = sortedItems.map((item, idx) =>
            manager.create(ReportTemplateItem, {
              name: item.name,
              type: item.type,
              value: item.value ?? '',
              order: item.order ?? idx + 1,
              required: typeof item.required === 'boolean' ? item.required : false,
              config: item.config ?? null,
              reportTemplateId: savedTemplate.id,
              createdAt: new Date(),
            }),
          );
          await manager.save(newItems);
        }

        const withItems = await manager.findOne(ReportTemplate, {
          where: { id: savedTemplate.id },
          relations: ['items'],
        });
        if (withItems?.items) {
          withItems.items = sortTemplateItems(withItems.items);
        }
        const sourceDeptIds = await this.ReportTemplateServiceRepository.find({
          where: { reportTemplateId: +id },
          select: ['serviceId'],
        });
        if (sourceDeptIds.length) {
          await syncTemplateServices(
            this.ReportTemplateServiceRepository,
            savedTemplate.id,
            sourceDeptIds.map((r) => +r.serviceId),
          );
        }
        const [withServices] = await attachServiceIdsToTemplates(
          this.ReportTemplateServiceRepository,
          [withItems ?? savedTemplate],
        );
        return {
          ...errorCode.SUCCESS,
          data: withServices,
        };
      });
    } catch (error) {
      const pg = extractPgError(error);
      this.logger.error(`Error duplicating report template ${id}: ${pg.message}`, (error as Error).stack);
      return { ...errorCode.EXCEPTION, message: pg.message || (error as Error).message };
    }
  }

  /** Staff: templates assigned to them or to all staff (id 0). Admin/customer: all active templates. */
  private applyStaffAssignmentFilter(
    query: import('typeorm').SelectQueryBuilder<ReportTemplate>,
    userInfo?: IUserInfo,
  ) {
    if (userInfo && +userInfo.type === userType.STAFF) {
      query.andWhere(
        '(report_templates.assigned_staff_id = :staffUserId OR report_templates.assigned_staff_id = :allStaff)',
        {
          staffUserId: +userInfo.userId,
          allStaff: ASSIGNED_STAFF_ALL,
        },
      );
    }
    return query;
  }

  async getAll(userInfo?: IUserInfo) {
    try {
      const query = this.reportTemplatesRepository
        .createQueryBuilder('report_templates')
        .leftJoinAndSelect('report_templates.items', 'items')
        .where('report_templates.status = :status', { status: eStatus.YES })
        .orderBy('report_templates.order', 'DESC');
      this.applyStaffAssignmentFilter(query, userInfo);
      const data = await query.getMany();
      data.forEach((template) => {
        template.items = sortTemplateItems(template.items);
      });
      const withServices = await attachServiceIdsToTemplates(
        this.ReportTemplateServiceRepository,
        data,
      );
      return { ...errorCode.SUCCESS, data: withServices };
    } catch (error) {
      this.logger.error(`Error getting all report templates: ${error.message}`, error.stack);
      return errorCode.EXCEPTION;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.reportTemplatesRepository.findOne({
        where: { id: +id },
        relations: ['items', 'createdUser', 'updatedUser'],
      });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (data.order === null || data.order === undefined) {
        data.order = 0;
      }
      data.items = sortTemplateItems(data.items);
      const [withServices] = await attachServiceIdsToTemplates(
        this.ReportTemplateServiceRepository,
        [data],
      );
      return { ...errorCode.SUCCESS, data: withServices };
    } catch (error) {
      this.logger.error(`Error finding report template ${id}: ${error.message}`, error.stack);
      return errorCode.EXCEPTION;
    }
  }

  async create(user: IUserInfo, body: CreateReportTemplateDto) {
    try {
      const data = new ReportTemplate();
      data.name = body.name;
      data.description = body.description ?? '';
      data.category = normalizeCategory(body.category);
      data.fileUrl = body.fileUrl ?? '';
      data.order = body.order ?? 0;
      data.settings = body.settings ?? null;
      if (body.assignedStaffId !== undefined) {
        data.assignedStaffId = body.assignedStaffId;
      } else {
        data.assignedStaffId = null;
      }
      data.status = eStatus.YES;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = user.userId;
      data.updatedBy = user.userId;

      if (body.items?.length) {
        data.items = createItemEntities(
          body.items,
          0,
          this.reportTemplateItemRepository,
        );
      }

      const newItem = await this.reportTemplatesRepository.save(data);
      if (!newItem) {
        return { ...errorCode.EXCEPTION, message: 'Save failed', data: null };
      }
      await syncTemplateServices(
        this.ReportTemplateServiceRepository,
        newItem.id,
        normalizeServiceIds(body.serviceIds),
      );
      const full = await this.findOne(String(newItem.id));
      return full?.data
        ? { ...errorCode.SUCCESS, id: newItem.id, data: full.data }
        : { ...errorCode.SUCCESS, id: newItem.id, data: newItem };
    } catch (error) {
      this.logger.error(`Error creating report template: ${error.message}`, error.stack);
      return { ...errorCode.EXCEPTION, message: error.message, data: error.stack };
    }
  }

  async findAll(body: GetReportTemplatesDto) {
    try {
      const query = this.reportTemplatesRepository
        .createQueryBuilder('report_templates')
        .leftJoin('report_templates.createdUser', 'createdUser')
        .addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('report_templates.updatedUser', 'updatedUser')
        .addSelect(['updatedUser.fullName', 'updatedUser.username'])
        .leftJoinAndSelect('report_templates.items', 'items');

      if (body.keyword) {
        query.andWhere(
          '( report_templates.name LIKE :keyword OR report_templates.description LIKE :keyword )',
          { keyword: `%${body.keyword}%` },
        );
      }

      const categoryFilter = (body.category ?? '').trim();
      if (categoryFilter) {
        query.andWhere('LOWER(report_templates.category) = LOWER(:category)', {
          category: categoryFilter,
        });
      }

      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit);
      }
      if (body.orderBy) {
        query.orderBy(
          `report_templates.${body.orderBy}`,
          body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC',
        );
      } else {
        query.orderBy('report_templates.createdAt', 'DESC');
      }

      const result = await query.getManyAndCount();
      result[0].forEach((template) => {
        template.items = sortTemplateItems(template.items);
      });
      if (!result) return errorCode.EXCEPTION;
      return { ...errorCode.SUCCESS, data: { count: result[1], rows: result[0] } };
    } catch (error) {
      this.logger.error(`Error finding report templates: ${error.message}`, error.stack);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  /** Metadata only � never modifies template items. */
  async update(userInfo: IUserInfo, id: string, body: UpdateReportTemplateDto) {
    try {
      const data = await this.reportTemplatesRepository.findOne({
        where: { id: +id },
      });
      if (!data) {
        return errorCode.NOT_FOUND;
      }

      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.category !== undefined) data.category = normalizeCategory(body.category);
      if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl;
      if (body.order !== undefined) data.order = body.order;
      if (data.order === null || data.order === undefined) {
        data.order = 0;
      }
      if (body.status !== undefined) data.status = body.status;
      if (body.settings !== undefined) data.settings = body.settings ?? null;
      if (body.assignedStaffId !== undefined) {
        data.assignedStaffId = body.assignedStaffId;
      }

      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();

      await this.reportTemplatesRepository.save(data);
      if (body.serviceIds !== undefined) {
        await syncTemplateServices(
          this.ReportTemplateServiceRepository,
          +id,
          normalizeServiceIds(body.serviceIds),
        );
      }
      return this.findOne(id);
    } catch (error) {
      const pg = extractPgError(error);
      this.logger.error(`Error updating report template ${id}: ${pg.message}`, (error as Error).stack);
      return { ...errorCode.EXCEPTION, message: pg.message || (error as Error).message };
    }
  }

  /** Atomically replace all template fields (full list required). */
  async replaceItems(userInfo: IUserInfo, id: string, items: ReportTemplateItemDto[]) {
    const templateId = +id;
    if (!Number.isFinite(templateId) || templateId <= 0) {
      return errorCode.NOT_FOUND;
    }
    if (!Array.isArray(items) || items.length === 0) {
      return { ...errorCode.EXCEPTION, message: 'Template must have at least one field' };
    }

    try {
      return await this.connection.transaction(async (manager) => {
        const template = await manager.findOne(ReportTemplate, { where: { id: templateId } });
        if (!template) {
          return errorCode.NOT_FOUND;
        }

        await manager.delete(ReportTemplateItem, { reportTemplateId: templateId });

        const newItems = createItemEntities(items, templateId, manager.getRepository(ReportTemplateItem));
        await manager.save(newItems);

        template.updatedBy = userInfo.userId;
        template.updatedAt = new Date();
        await manager.save(template);

        const withItems = await manager.findOne(ReportTemplate, {
          where: { id: templateId },
          relations: ['items', 'createdUser', 'updatedUser'],
        });
        if (withItems) {
          withItems.items = sortTemplateItems(withItems.items);
        }
        return { ...errorCode.SUCCESS, data: withItems };
      });
    } catch (error) {
      const pg = extractPgError(error);
      this.logger.error(`Error replacing items for template ${id}: ${pg.message}`, (error as Error).stack);
      return { ...errorCode.EXCEPTION, message: pg.message || (error as Error).message };
    }
  }

  async remove(id: string) {
    try {
      const templateId = +id;
      if (!Number.isFinite(templateId) || templateId <= 0) {
        return errorCode.NOT_FOUND;
      }
      const data = await this.reportTemplatesRepository.findOne({ where: { id: templateId } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      const inUseCount = await this.userTasksService.checkReportTemplate(id);
      let detachedReports = 0;
      if (inUseCount > 0) {
        detachedReports = await this.userTasksService.detachReportsFromReportTemplate(
          templateId,
          data.name,
        );
        await this.connection.query(
          `UPDATE public.tasks SET report_template_id = NULL WHERE report_template_id = $1`,
          [templateId],
        );
      }
      await this.reportTemplateItemRepository.delete({ reportTemplateId: templateId });
      await this.reportTemplatesRepository.delete(templateId);
      if (inUseCount > 0) {
        return {
          ...errorCode.SUCCESS,
          message: `Template deleted. ${detachedReports} submitted report(s) were kept (only the template link was removed).`,
        };
      }
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(`Error removing report template ${id}: ${error.message}`, error.stack);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }
}
