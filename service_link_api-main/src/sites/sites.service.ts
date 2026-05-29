

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { Logger } from 'winston';
import { IUserInfo } from '../interfaces/IUserInfo';
import { removeAccents } from '../helpers/util';
import { CreateSiteDto, SiteItemDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { Site } from './entities/site.entity';
import { GetShiftsDto, GetSitesDto } from './dto/get-sites.dto';
import { SiteItem } from './entities/site-item.entity';
import { SiteItemStaff } from './entities/site-item-staff.entity';
import { User } from '../users/entities/user.entity';
import { CustomerCompany } from '../users/entities/customer-company.entity';
import { applyCustomerScopeToQuery } from '../helpers/customer-scope';
import { userStatus } from '../constants/user';
import * as moment from 'moment';
import { SendMail } from '../helpers/sendEmail';
import { TasksService } from '../tasks/tasks.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SiteItemStaffShift } from './entities/site-item-staff-shift.entity';
import { userType } from '../constants/user';
import { UserDailyJobItem } from '../user-daily-job/entities/user-daily-job-items.entity';


/** SQL fragment: distinct active staff on valid site items (matches job-sites Staff column). */
const SITE_STAFF_COUNT_SQL = `(
  SELECT COUNT(DISTINCT sis.staff_id)::int
  FROM site_item_staffs sis
  INNER JOIN site_items si ON si.id = sis.site_item_id
  INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
  INNER JOIN services dep ON dep.id = si.service_id
  INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
  WHERE si.site_id = s.id
)`;

/** Primary customer label per site (matches job-sites Customer column: company name, else contact name). */
const SITE_CUSTOMER_SORT_SQL = `(
  SELECT MIN(lbl.sort_label)
  FROM (
    SELECT COALESCE(
      NULLIF(TRIM(co.name), ''),
      NULLIF(TRIM(cc.company_name), ''),
      NULLIF(TRIM(cu.full_name), '')
    ) AS sort_label
    FROM site_items si
    INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
    LEFT JOIN customers cc ON cc.user_id = cu.id
    LEFT JOIN customer_companies co ON co.id = COALESCE(si.company_id, cc.company_id)
    INNER JOIN services dep ON dep.id = si.service_id
    WHERE si.site_id = s.id
  ) lbl
  WHERE lbl.sort_label IS NOT NULL
)`;

/** Distinct active staff assigned to a site (matches job-sites table display). */
function countDistinctActiveStaff(site: Site): number {
  const ids = new Set<number>();
  for (const item of site.items ?? []) {
    for (const s of item.staffs ?? []) {
      if (s.staff) {
        ids.add(s.staffId);
      }
    }
  }
  return ids.size;
}

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site) private readonly sitesRepository: Repository<Site>,
    @InjectRepository(SiteItem) private readonly siteItemsRepository: Repository<SiteItem>,
    @Inject('winston') private readonly logger: Logger,
    @Inject(forwardRef(() => TasksService)) private readonly tasksService: TasksService,
  ) { }

  /**
   * Site form sends company id in customerId; legacy rows may store user id.
   */
  private async resolveSiteItemCustomerRef(
    rawId?: number | null,
    companyIdHint?: number | null,
  ): Promise<{ companyId: number | null; customerId: number }> {
    const id = +(rawId || 0) || +(companyIdHint || 0);
    if (!id) {
      throw new Error('Customer is required');
    }
    const companyRepo = this.sitesRepository.manager.getRepository(CustomerCompany);
    const company = await companyRepo.findOne({ where: { id } });
    if (company) {
      const primary = await this.sitesRepository.manager
        .getRepository(User)
        .createQueryBuilder('users')
        .innerJoin('users.customerInfo', 'customerInfo')
        .where('customerInfo.company_id = :companyId', { companyId: company.id })
        .andWhere('users.status = :active', { active: userStatus.ACTIVE })
        .orderBy('users.id', 'ASC')
        .getOne();
      if (!primary) {
        throw new Error(`No active customer user for company "${company.name}"`);
      }
      return { companyId: company.id, customerId: primary.id };
    }
    const user = await this.sitesRepository.manager.findOne(User, {
      where: { id },
      relations: ['customerInfo'],
    });
    if (!user) {
      throw new Error('Customer not found');
    }
    return {
      companyId: user.customerInfo?.companyId ?? null,
      customerId: user.id,
    };
  }

  private buildSiteItemStaffEntities(staffDtos: SiteItemDto['staffs']): SiteItemStaff[] {
    const staffs: SiteItemStaff[] = [];
    if (!staffDtos?.length) {
      return staffs;
    }
    for (const st of staffDtos) {
      const staffId = +(st.staffId ?? (st as { staff?: { id?: number } }).staff?.id ?? 0);
      if (!staffId) {
        continue;
      }
      const newStaff = new SiteItemStaff();
      newStaff.createdAt = new Date();
      newStaff.staffId = staffId;
      if (st.staffShifts?.length) {
        const staffShifts = [];
        for (const shift of st.staffShifts) {
          const newStaffShift = new SiteItemStaffShift();
          newStaffShift.startTime = shift.startTime;
          newStaffShift.endTime = shift.endTime;
          newStaffShift.type = shift.type;
          newStaffShift.typeValue = shift.typeValue;
          staffShifts.push(newStaffShift);
        }
        newStaff.staffShifts = staffShifts;
      }
      staffs.push(newStaff);
    }
    return staffs;
  }

  /** Replace staff rows (cascade alone leaves orphans and can hit unique constraints). */
  private async replaceSiteItemStaffs(
    siteItemId: number,
    staffDtos: SiteItemDto['staffs'],
  ): Promise<void> {
    const staffRepo = this.sitesRepository.manager.getRepository(SiteItemStaff);
    const existing = await staffRepo.find({
      where: { siteItemId },
      relations: ['staffShifts'],
    });
    if (existing.length) {
      await staffRepo.remove(existing);
    }
    const staffs = this.buildSiteItemStaffEntities(staffDtos);
    for (const row of staffs) {
      row.siteItemId = siteItemId;
      await staffRepo.save(row);
    }
  }

  private siteItemRowMatches(
    incoming: { serviceId: number; customerId: number; companyId: number | null },
    existing: SiteItem,
  ): boolean {
    if (incoming.serviceId !== existing.serviceId) {
      return false;
    }
    if (
      incoming.companyId != null &&
      existing.companyId != null &&
      +incoming.companyId === +existing.companyId
    ) {
      return true;
    }
    return +incoming.customerId === +existing.customerId;
  }

  async getAll() {
    const data = await this.sitesRepository.createQueryBuilder('sites')
      .select(['sites.id', 'sites.name', 'sites.location', 'sites.addressName'])
      .getMany();
    return { ...errorCode.SUCCESS, data };
  }

  async create(userInfo: IUserInfo, body: CreateSiteDto) {
    try {
      const checkId = await this.sitesRepository.findOne({ where: { name: body.name } });
      if (checkId) {
        return errorCode.CODE_EXIST
      }
      const data = new Site();
      data.name = body.name;
      data.location = body.location;
      data.addressName = body.addressName;
      data.description = body.description;
      data.checkInDistance = body.checkInDistance;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;

      if (body.items) {
        const items = [];
        for (const de of body.items) {
          const nDe = new SiteItem();
          nDe.serviceId = de.serviceId;
          const ref = await this.resolveSiteItemCustomerRef(
            de.customerId,
            (de as SiteItemDto & { companyId?: number }).companyId,
          );
          nDe.customerId = ref.customerId;
          nDe.companyId = ref.companyId;

          nDe.createdAt = new Date();
          nDe.staffs = this.buildSiteItemStaffEntities(de.staffs);
          items.push(nDe)
        }
        if (items.length) {
          data.items = items;
        }
      }

      const newItem = await this.sitesRepository.save(data);
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

  private normalizedSiteKeyword(body: GetSitesDto): string {
    return String(body.keyword ?? '').trim();
  }

  /** EXISTS-based filters for site list (no task/shift joins � safe for staff-count sort). */
  private applySiteListExistsFilters(
    query: SelectQueryBuilder<Site>,
    userInfo: IUserInfo,
    body: GetSitesDto,
  ): void {
    const keyword = this.normalizedSiteKeyword(body);
    if (keyword) {
      query.andWhere(
        '(sites.name ILIKE :keyword OR sites.addressName ILIKE :keyword OR sites.description ILIKE :keyword OR sites.location ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    const filterStaffId = +body.staffId || (userInfo.type === 2 ? userInfo.userId : 0);
    if (filterStaffId) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM site_item_staffs sis_f
          INNER JOIN site_items si_f ON si_f.id = sis_f.site_item_id
          INNER JOIN users st_f ON st_f.id = sis_f.staff_id AND st_f.status <> :siteStaffDeleted
          WHERE si_f.site_id = sites.id AND sis_f.staff_id = :filterStaffId
        )`,
        { filterStaffId, siteStaffDeleted: 4 },
      );
    }
    if (userInfo.type === 1) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM site_items si_c
          INNER JOIN users cu ON cu.id = si_c.customer_id AND cu.status <> :siteStaffDeleted
          WHERE si_c.site_id = sites.id
            AND (
              cu.id = :customerId
              OR si_c.company_id = (SELECT company_id FROM customers WHERE user_id = :customerId LIMIT 1)
            )
        )`,
        { customerId: userInfo.userId, siteStaffDeleted: 4 },
      );
    }
    if (userInfo.type === 2 && body.filter === 'TODAY') {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM site_items si_t
          INNER JOIN tasks t ON t.site_item_id = si_t.id
          WHERE si_t.site_id = sites.id
            AND t.start_date <= NOW() AND t.end_date > NOW()
        )`,
      );
    }
  }

  private addSiteStaffCountSelect(query: SelectQueryBuilder<Site>, alias = 'site_staff_count'): void {
    query.addSelect((subQuery) => {
      return subQuery
        .select('COUNT(DISTINCT sis.staff_id)', 'cnt')
        .from(SiteItemStaff, 'sis')
        .innerJoin(SiteItem, 'si', 'si.id = sis.site_item_id')
        .innerJoin(User, 'st', 'st.id = sis.staff_id AND st.status <> :siteStaffNotDeleted', {
          siteStaffNotDeleted: 4,
        })
        .innerJoin('services', 'dep', 'dep.id = si.service_id')
        .innerJoin(User, 'cu', 'cu.id = si.customer_id AND cu.status <> :siteStaffNotDeleted')
        .where('si.site_id = sites.id');
    }, alias);
  }

  private buildSiteListFilterSql(
    userInfo: IUserInfo,
    body: GetSitesDto,
  ): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let n = 1;
    const next = () => `$${n++}`;

    const keyword = this.normalizedSiteKeyword(body);
    if (keyword) {
      const p = next();
      clauses.push(
        `(s.name ILIKE ${p} OR s.address_name ILIKE ${p} OR s.description ILIKE ${p} OR s.location ILIKE ${p})`,
      );
      params.push(`%${keyword}%`);
    }
    const filterStaffId = +body.staffId || (userInfo.type === 2 ? userInfo.userId : 0);
    if (filterStaffId) {
      const p = next();
      clauses.push(
        `EXISTS (
          SELECT 1 FROM site_item_staffs sis_f
          INNER JOIN site_items si_f ON si_f.id = sis_f.site_item_id
          INNER JOIN users st_f ON st_f.id = sis_f.staff_id AND st_f.status <> 4
          WHERE si_f.site_id = s.id AND sis_f.staff_id = ${p}
        )`,
      );
      params.push(filterStaffId);
    }
    if (userInfo.type === 1) {
      const pUser = next();
      const pCompany = next();
      clauses.push(
        `EXISTS (
          SELECT 1 FROM site_items si_c
          INNER JOIN users cu ON cu.id = si_c.customer_id AND cu.status <> 4
          LEFT JOIN customers cc_u ON cc_u.user_id = cu.id
          WHERE si_c.site_id = s.id
            AND (cu.id = ${pUser} OR si_c.company_id = ${pCompany} OR cc_u.company_id = ${pCompany})
        )`,
      );
      params.push(userInfo.userId, userInfo.userId);
    }
    if (userInfo.type === 2 && body.filter === 'TODAY') {
      clauses.push(
        `EXISTS (
          SELECT 1 FROM site_items si_t
          INNER JOIN tasks t ON t.site_item_id = si_t.id
          WHERE si_t.site_id = s.id
            AND t.start_date <= NOW() AND t.end_date > NOW()
        )`,
      );
    }

    const sql = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
    return { sql, params };
  }

  /** Paginate site ids by staff count without joining tasks/shifts (avoids slow DISTINCT + spinners). */
  private async findAllSortedByStaffCount(userInfo: IUserInfo, body: GetSitesDto) {
    const sortDir =
      String(body.orderValue ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const { sql: filterSql, params: filterParams } = this.buildSiteListFilterSql(userInfo, body);
    const limit = +body.limit || 10;
    const offset = Math.max(0, (+body.page - 1) * limit);
    const limitIdx = filterParams.length + 1;
    const offsetIdx = filterParams.length + 2;

    const idRows: { site_id: string | number; staff_cnt: string | number }[] =
      await this.sitesRepository.query(
        `SELECT uniq.site_id, uniq.staff_cnt
         FROM (
           SELECT DISTINCT ON (s.id)
             s.id AS site_id,
             ${SITE_STAFF_COUNT_SQL} AS staff_cnt
           FROM sites s
           WHERE 1=1${filterSql}
           ORDER BY s.id
         ) uniq
         ORDER BY uniq.staff_cnt ${sortDir}, uniq.site_id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...filterParams, limit, offset],
      );
    const staffCountBySiteId = new Map<number, number>();
    const siteIds: number[] = [];
    const seenSiteIds = new Set<number>();
    for (const row of idRows) {
      const id = Number(row.site_id);
      if (Number.isFinite(id) && !seenSiteIds.has(id)) {
        seenSiteIds.add(id);
        siteIds.push(id);
        staffCountBySiteId.set(id, Number(row.staff_cnt) || 0);
      }
    }

    const countRows: { cnt: string }[] = await this.sitesRepository.query(
      `SELECT COUNT(*) AS cnt
       FROM (SELECT DISTINCT s.id FROM sites s WHERE 1=1${filterSql}) site_ids`,
      filterParams,
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    if (!siteIds.length) {
      return { ...errorCode.SUCCESS, data: { count: total, rows: [] } };
    }

    const rows = await this.loadSitesWithRelationsByIds(userInfo, body, siteIds);
    return {
      ...errorCode.SUCCESS,
      data: {
        count: total,
        rows: rows.map((c) => {
          const n =
            c.items.length > 0
              ? { ...c, items: c.items.filter((cc) => cc.customer != null && cc.service != null) }
              : { ...c };
          const sqlCount = staffCountBySiteId.get(c.id);
          return {
            ...n,
            staffCount:
              sqlCount !== undefined ? sqlCount : countDistinctActiveStaff(n as Site),
          };
        }),
      },
    };
  }

  private async loadSitesWithRelationsByIds(
    userInfo: IUserInfo,
    body: GetSitesDto,
    siteIds: number[],
  ): Promise<Site[]> {
    const query = this.sitesRepository.createQueryBuilder('sites');
    query
      .leftJoin('sites.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username'])
      .leftJoin('sites.updatedUser', 'updatedUser')
      .addSelect(['updatedUser.fullName', 'updatedUser.username']);

    if (userInfo.type === 2 || +body.staffId) {
      query.innerJoinAndSelect('sites.items', 'items');
    } else {
      query.leftJoinAndSelect('sites.items', 'items');
    }

    if (userInfo.type === 2 && body.filter === 'TODAY') {
      query
        .innerJoinAndSelect('items.tasks', 'tasks', 'tasks.start_date<=now() and tasks.end_date>now()')
        .innerJoinAndSelect('tasks.shifts', 'shifts')
        .leftJoin('items.service', 'service')
        .addSelect(['service.id', 'service.name'])
        .leftJoin('items.customer', 'customer', 'customer.status!=4')
        .addSelect(['customer.id', 'customer.fullName'])
        .leftJoin('customer.customerInfo', 'customerInfo')
        .addSelect(['customerInfo.companyName']);
    } else {
      query
        .leftJoinAndSelect('items.tasks', 'tasks')
        .leftJoinAndSelect('tasks.siteItem', 'siteItem')
        .leftJoinAndSelect('tasks.shifts', 'shifts')
        .leftJoin('items.service', 'service')
        .addSelect(['service.id', 'service.name'])
        .leftJoin('items.customer', 'customer', 'customer.status!=4')
        .addSelect(['customer.id', 'customer.fullName'])
        .leftJoin('customer.customerInfo', 'customerInfo')
        .addSelect(['customerInfo.companyName']);
    }

    if (+body.staffId) {
      query
        .innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: body.staffId })
        .innerJoin('staffs.staff', 'staff', 'staff.status!=4')
        .addSelect(['staff.id', 'staff.fullName']);
    } else if (userInfo.type === 2) {
      query
        .innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: userInfo.userId })
        .innerJoin('staffs.staff', 'staff', 'staff.status!=4')
        .addSelect(['staff.id', 'staff.fullName']);
    } else {
      query
        .leftJoinAndSelect('items.staffs', 'staffs')
        .leftJoin('staffs.staff', 'staff', 'staff.status!=4')
        .addSelect(['staff.id', 'staff.fullName']);
    }

    if (userInfo.type === 1) {
      query.andWhere('customer.id = :customerId', { customerId: userInfo.userId });
    }

    if (+body.staffId) {
      query
        .leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4  and  taskstaff.id = :staffId', {
          staffId: +body.staffId,
        })
        .addSelect(['taskstaff.fullName', 'taskstaff.username']);
    } else if (userInfo.type === 2) {
      query
        .leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4  and  taskstaff.id = :staffId', {
          staffId: userInfo.userId,
        })
        .addSelect(['taskstaff.fullName', 'taskstaff.username']);
    } else {
      query
        .leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4')
        .addSelect(['taskstaff.fullName', 'taskstaff.username']);
    }

    query.leftJoinAndSelect('staffs.staffShifts', 'staffShifts');
    query.where('sites.id IN (:...siteIds)', { siteIds });
    if (siteIds.length) {
      const orderCase = siteIds.map((id, index) => `WHEN ${+id} THEN ${index}`).join(' ');
      query.orderBy(`CASE sites.id ${orderCase} ELSE ${siteIds.length} END`, 'ASC');
    }

    const rows = await query.getMany();
    const byId = new Map<number, Site>();
    for (const row of rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
      }
    }
    return siteIds.map((id) => byId.get(id)).filter((row): row is Site => !!row);
  }

  /** Paginate site ids by customer name (company name, else contact) on valid site items. */
  private async findAllSortedByCustomer(userInfo: IUserInfo, body: GetSitesDto) {
    const sortDir =
      String(body.orderValue ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const nulls = sortDir === 'ASC' ? 'NULLS FIRST' : 'NULLS LAST';
    const { sql: filterSql, params: filterParams } = this.buildSiteListFilterSql(userInfo, body);
    const limit = +body.limit || 10;
    const offset = Math.max(0, (+body.page - 1) * limit);
    const limitIdx = filterParams.length + 1;
    const offsetIdx = filterParams.length + 2;

    const idRows: { site_id: string | number; customer_sort: string | null }[] =
      await this.sitesRepository.query(
        `SELECT uniq.site_id, uniq.customer_sort
         FROM (
           SELECT DISTINCT ON (s.id)
             s.id AS site_id,
             ${SITE_CUSTOMER_SORT_SQL} AS customer_sort
           FROM sites s
           WHERE 1=1${filterSql}
           ORDER BY s.id
         ) uniq
         ORDER BY uniq.customer_sort ${sortDir} ${nulls}, uniq.site_id DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...filterParams, limit, offset],
      );

    const siteIds: number[] = [];
    const seenSiteIds = new Set<number>();
    for (const row of idRows) {
      const id = Number(row.site_id);
      if (Number.isFinite(id) && !seenSiteIds.has(id)) {
        seenSiteIds.add(id);
        siteIds.push(id);
      }
    }

    const countRows: { cnt: string }[] = await this.sitesRepository.query(
      `SELECT COUNT(*) AS cnt
       FROM (SELECT DISTINCT s.id FROM sites s WHERE 1=1${filterSql}) site_ids`,
      filterParams,
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    if (!siteIds.length) {
      return { ...errorCode.SUCCESS, data: { count: total, rows: [] } };
    }

    const rows = await this.loadSitesWithRelationsByIds(userInfo, body, siteIds);
    return {
      ...errorCode.SUCCESS,
      data: {
        count: total,
        rows: rows.map((c) => {
          const n =
            c.items.length > 0
              ? { ...c, items: c.items.filter((cc) => cc.customer != null && cc.service != null) }
              : { ...c };
          return { ...n, staffCount: countDistinctActiveStaff(n as Site) };
        }),
      },
    };
  }

  async findAll(userInfo: IUserInfo, body: GetSitesDto) {
    try {
      if (body.orderBy === 'staffCount') {
        return this.findAllSortedByStaffCount(userInfo, body);
      }
      if (body.orderBy === 'customer' || body.orderBy === 'customers') {
        return this.findAllSortedByCustomer(userInfo, body);
      }

      const query = this.sitesRepository.createQueryBuilder('sites');
      this.applySiteListExistsFilters(query, userInfo, body);
      query.leftJoin('sites.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('sites.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
      if (userInfo.type === 2 || +body.staffId) {
        query.innerJoinAndSelect('sites.items', 'items')
      } else {
        query.leftJoinAndSelect('sites.items', 'items')
      }


      if (userInfo.type === 2 && body.filter === 'TODAY') {
        query.innerJoinAndSelect('items.tasks', 'tasks', 'tasks.start_date<=now() and tasks.end_date>now()')
          .innerJoinAndSelect('tasks.shifts', 'shifts')
          // .leftJoinAndSelect('shifts.logs', 'logs')

          .leftJoin('items.service', 'service').addSelect(['service.id', 'service.name'])
          .leftJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
          .leftJoin('customer.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
      }
      else {
        query.leftJoinAndSelect('items.tasks', 'tasks')
          .leftJoinAndSelect('tasks.siteItem', 'siteItem')
          .leftJoinAndSelect('tasks.shifts', 'shifts')
          // .leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4').addSelect(['taskstaff.fullName', 'taskstaff.username'])

          // .leftJoinAndSelect('shifts.logs', 'logs')
          .leftJoin('items.service', 'service').addSelect(['service.id', 'service.name'])
          .leftJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
          .leftJoin('customer.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
      }

      if (+body.staffId) {
        query.innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: body.staffId })
          .innerJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])
      }
      else if (userInfo.type === 2) {
        query.innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: userInfo.userId })
          .innerJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])
      } else {
        query.leftJoinAndSelect('items.staffs', 'staffs')
          .leftJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])
      }

      if (userInfo.type === 1) {
        query.andWhere('customer.id = :customerId', { customerId: userInfo.userId })
      }


      if (+body.staffId) {
        query.leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4  and  taskstaff.id = :staffId', { staffId: +body.staffId }).addSelect(['taskstaff.fullName', 'taskstaff.username'])

        // query.andWhere('taskstaff.id = :staffId', { staffId: +body.staffId })
      }
      else if (userInfo.type === 2) {
        query.leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4  and  taskstaff.id = :staffId', { staffId: userInfo.userId }).addSelect(['taskstaff.fullName', 'taskstaff.username'])
      } else {
        query.leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4').addSelect(['taskstaff.fullName', 'taskstaff.username'])
      }

      query.leftJoinAndSelect('staffs.staffShifts', 'staffShifts')
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      const sortDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
      if (
        body.orderBy &&
        [
          'name',
          'addressName',
          'createdAt',
          'updatedAt',
          'location',
          'description',
          'id',
          'checkInDistance',
        ].includes(body.orderBy)
      ) {
        query.orderBy(`sites.${body.orderBy}`, sortDir);
      } else {
        query.orderBy(`sites.createdAt`, 'DESC');
      }
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      return {
        ...errorCode.SUCCESS, data: {
          count: result[1], rows: result[0].map((c) => {
            const n =
              c.items.length > 0
                ? { ...c, items: c.items.filter((cc) => cc.customer != null && cc.service != null) }
                : { ...c };
            return { ...n, staffCount: countDistinctActiveStaff(n as Site) };
          }),
        }
      };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async findOne(id: number) {
    try {
      const query = this.sitesRepository.createQueryBuilder('sites');
      query.leftJoin('sites.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('sites.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
        .leftJoinAndSelect('sites.items', 'items')
        .leftJoinAndSelect('items.tasks', 'tasks')
        .leftJoin('tasks.staff', 'taskstaff').addSelect(['taskstaff.fullName', 'taskstaff.username'])
        .leftJoinAndSelect('tasks.shifts', 'shifts')
        .leftJoinAndSelect('shifts.logs', 'logs')
        .leftJoin('items.service', 'service').addSelect(['service.id', 'service.name'])
        .addSelect(['items.companyId'])
        .leftJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
        .leftJoinAndSelect('items.staffs', 'staffs')
        .leftJoinAndSelect('staffs.staffShifts', 'staffShifts')
        .leftJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])
        .where('sites.id=:id', { id })

      const result = await query.getOne();
      if (!result)
        return errorCode.EXCEPTION;

      return { ...errorCode.SUCCESS, data: result };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateSiteDto) {
    try {
      const checkId = await this.sitesRepository.findOne({ where: { id } });
      if (checkId && checkId.id !== id) {
        return errorCode.CODE_EXIST
      }

      const data = await this.sitesRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined)
        data.name = body.name;
      if (body.description !== undefined)
        data.description = body.description;
      data.updatedBy = userInfo.userId;
      if (body.checkInDistance != undefined)
        data.checkInDistance = body.checkInDistance;
      if (body.location != undefined)
        data.location = body.location;
      if (body.addressName != undefined)
        data.addressName = body.addressName;

      // if (body.items) {
      //   const SERVICES = [];
      //   for (const de of body.items) {
      //     const nDe = new SiteItem();
      //     nDe.serviceId = de.serviceId;
      //     nDe.customerId = de.customerId;
      //     nDe.createdAt = new Date();
      //     const staffs = [];
      //     if (de.staffs) {
      //       for (const st of de.staffs) {
      //         const newStaff = new SiteItemStaff();
      //         newStaff.createdAt = new Date();
      //         newStaff.staffId = st.staffId;
      //         staffs.push(newStaff)
      //       }
      //     }
      //     nDe.staffs = staffs;
      //     SERVICES.push(nDe)
      //   }
      //   if (SERVICES.length) {
      //     data.items = SERVICES;
      //   }
      // }

      data.updatedAt = new Date();
      const newItem = await this.sitesRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }

      if (body.items === undefined) {
        return errorCode.SUCCESS;
      }

      const incomingItems = body.items ?? [];
      const normalizedItems: Array<{
        serviceId: number;
        customerId: number;
        companyId: number | null;
        staffs: SiteItemDto['staffs'];
      }> = [];
      for (const de of incomingItems) {
        const ref = await this.resolveSiteItemCustomerRef(
          de.customerId,
          (de as SiteItemDto & { companyId?: number }).companyId,
        );
        normalizedItems.push({
          serviceId: de.serviceId,
          customerId: ref.customerId,
          companyId: ref.companyId,
          staffs: de.staffs,
        });
      }

      const oldServices = await this.siteItemsRepository.find({ where: { siteId: data.id } });
      for (const ol of oldServices) {
        const check = normalizedItems.find((c) => this.siteItemRowMatches(c, ol));
        if (!check) {
          await this.siteItemsRepository.delete(ol.id);
        }
      }

      for (const de of normalizedItems) {
        const checkService = de.companyId
          ? await this.siteItemsRepository.findOne({
              where: {
                siteId: data.id,
                serviceId: de.serviceId,
                companyId: de.companyId,
              },
            })
          : await this.siteItemsRepository.findOne({
              where: {
                siteId: data.id,
                serviceId: de.serviceId,
                customerId: de.customerId,
              },
            });
        if (checkService) {
          checkService.customerId = de.customerId;
          checkService.companyId = de.companyId;
          await this.siteItemsRepository.save(checkService);
          await this.replaceSiteItemStaffs(checkService.id, de.staffs);
          await this.tasksService.updateTaskStaffs(checkService.id, de.staffs ?? []);
        } else {
          const nDe = new SiteItem();
          nDe.serviceId = de.serviceId;
          nDe.customerId = de.customerId;
          nDe.companyId = de.companyId;
          nDe.siteId = data.id;
          nDe.createdAt = new Date();
          const saved = await this.siteItemsRepository.save(nDe);
          await this.replaceSiteItemStaffs(saved.id, de.staffs);
        }
      }

      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      const message = error instanceof Error ? error.message : errorCode.EXCEPTION.message;
      return { ...errorCode.EXCEPTION, message };
    }
  }

  async remove(id: string) {
    try {
      const data = await this.sitesRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.sitesRepository.delete(+id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.sitesRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleSendReminderEmail() {
    try {
      const sties = await this.sitesRepository.createQueryBuilder('sites')
        .innerJoinAndSelect('sites.items', 'items')
        .innerJoinAndSelect('items.tasks', 'tasks')
        .leftJoinAndSelect('tasks.shifts', 'shifts')
        .leftJoin('items.service', 'service').addSelect(['service.id', 'service.name'])
        .leftJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
        .innerJoin('tasks.staff', 'staff').addSelect(['staff.id', 'staff.fullName', 'staff.email'])
        .getMany();

      for (const site of sties) {
        const items = site.items;
        for (const item of items) {
          const tasks = item.tasks;
          for (const task of tasks) {

            if (new Date(task.startDate) > new Date()) {
              continue;
            }
            if (new Date(task.endDate) < new Date()) {
              continue;
            }
            const shifts = task.shifts;
            for (const taskShift of shifts) {
              //check date
              let bTaskToday = false;
              if (task.type === 'E') {
                bTaskToday = true;
              }
              if (task.type === 'W' && (new Date().getDay() != 0 || new Date().getDay() != 6)) {
                bTaskToday = true;
              }
              if (task.type === 'C') {
                const days = task.typeValue.split(',');
                if (days.includes("" + new Date().getDay())) {
                  bTaskToday = true;
                }
              }

              if (bTaskToday) {
                //check hours
                const startTime = moment(moment().format('YYYY-MM-DD ' + taskShift.from)).subtract(30, 'minutes')
                const endime = moment(moment().format('YYYY-MM-DD ' + taskShift.to));
                const totime = moment(moment().format('YYYY-MM-DD ' + taskShift.to));
                const fromtime = endime
                if (startTime < moment() && endime > moment()) {
                  const resUpdate = await this.tasksService.updateReminder(taskShift.id, task.staffId, 1, moment().format('YYYY-MM-DD ' + taskShift.from))
                  if (resUpdate) {
                    const staff = task.staff;
                    if (!staff.email) {
                      continue;
                    }
                    console.log('g?i email', staff.fullName);
                    const html = `
                      <p>Hello ${staff.fullName},</p>
                      <p>New task has been assigned to you</p>
                      <p>Task: ${task.name}</p>
                      <p>Task description: ${task.description}</p>
                      <p>Site: ${site.name}</p>
                      <p>Service: ${item.service.name}</p>
                      <p>Customer: ${item.customer.fullName}</p>
                      <p>Start at: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
                      <p>End at: ${moment(totime).format('YYYY-MM-DD HH:mm:ss')}</p>
                      <p>Access the link: <a target="_blank" href="http://3.104.215.45:8002/task-today?status=p">http://3.104.215.45:8002/task-today?status=p</a></p>
                      <p>If there is any question, please feel free to contact us at: support@servicelink.com</p>
                      <p>ServiceLink Support Team</p>`
                    SendMail(staff.email, "Reminder to prepare for work at " + site.name, html)

                  } else {
                    console.log('Kh�ng th? g?i', resUpdate);
                  }
                }
              }
            }
          }
        }
      }
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async getUserTaskToday(userInfo: IUserInfo) {
    const data = await this.checkUserTaskToday(userInfo)
    return { ...errorCode.SUCCESS, data }
  }

  async checkUserTaskToday(userInfo: IUserInfo, siteId?: number, serviceId?: number) {
    try {
      const userTasks = [];
      const query = this.sitesRepository.createQueryBuilder('sites')
        .innerJoinAndSelect('sites.items', 'items')
        .innerJoinAndSelect('items.tasks', 'tasks')
        .innerJoinAndSelect('tasks.shifts', 'shifts')
        .innerJoin('items.service', 'Service').addSelect(['service.id', 'service.name'])
        .innerJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
      if (+siteId) {
        query.andWhere(' items.siteId =:siteId ', { siteId })
      }
      if (serviceId) {
        query.andWhere(' items.serviceId =:serviceId ', { serviceId })
      }
      if (userInfo && +userInfo.type === userType.STAFF) {
        query.andWhere('tasks.staffId = :userId', { userId: userInfo.userId })
          .innerJoin('tasks.staff', 'staff').addSelect(['staff.id', 'staff.fullName', 'staff.email'])
      } else if (userInfo && +userInfo.type === userType.CUSTOMER) {
        query.andWhere('items.customerId = :customerId', { customerId: userInfo.userId })
          .innerJoin('tasks.staff', 'staff').addSelect(['staff.id', 'staff.fullName', 'staff.email'])
      } else {
        query.innerJoin('tasks.staff', 'staff').addSelect(['staff.id', 'staff.fullName', 'staff.email'])
      }
      const sites = await query.getMany();
      for (const site of sites) {
        const items = site.items;
        for (const item of items) {
          const tasks = item.tasks;
          for (const task of tasks) {
            if (!task.staff) {
              continue;
            }
            if (new Date(task.startDate) > new Date()) {
              continue;
            }
            if (new Date(task.endDate) < new Date()) {
              continue;
            }
            const shifts = task.shifts;
            for (const taskShift of shifts) {
              //check date
              let bTaskToday = false;
              if (task.type === 'E') {
                bTaskToday = true;
              }
              if (task.type === 'W' && (new Date().getDay() != 0 || new Date().getDay() != 6)) {
                bTaskToday = true;
              }
              if (task.type === 'C') {
                const days = task.typeValue.split(',');
                if (days.includes("" + new Date().getDay())) {
                  bTaskToday = true;
                }
              }

              if (bTaskToday) {
                //check hours
                const tStartTime = moment(moment().format('YYYY-MM-DD ' + taskShift.from));
                const tEndTime = moment(moment().format('YYYY-MM-DD ' + taskShift.to));
                let tmpStartTime;
                let tmpEndTime;
                // const tmpEndTime = moment(tStartTime > moment() ? tStartTime : tStartTime.add(1, 'days')).subtract(90, 'minutes')

                if (moment(tStartTime).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') && moment(tStartTime) < moment()) {
                  tmpStartTime = moment(tStartTime).subtract(90, 'minutes');
                  tmpEndTime = moment(tEndTime).add(90, 'minutes');
                }
                else if (moment(tStartTime).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD')) {
                  if (moment(tStartTime) < moment()) {
                    tmpStartTime = moment(tStartTime).add(1, 'days').subtract(90, 'minutes');
                    tmpEndTime = moment(tEndTime).add(1, 'days').add(90, 'minutes');
                  } else {
                    tmpStartTime = moment(tStartTime).subtract(90, 'minutes');
                    tmpEndTime = moment(tEndTime).add(90, 'minutes');
                  }
                }
                const startTime = tStartTime;
                const endTime = tEndTime;
                if (tmpEndTime < tmpStartTime) {
                  tmpEndTime = moment(tmpEndTime).add(1, 'days');
                }
                if (tmpStartTime < moment() && tmpEndTime > moment()) {
                  let i = 0;
                  i++;
                  //create an empty task for the user here
                  userTasks.push({
                    id: 0,
                    siteId: site.id,
                    siteName: site.name,
                    siteAddress: site.addressName,
                    siteLocation: site.location,
                    customerId: item.customerId,
                    from: taskShift.from,
                    to: taskShift.to,
                    customerName: item.customer.fullName,
                    companyName: item.customer?.customerInfo?.companyName,
                    customer: item.customer,
                    taskShiftId: taskShift.id,
                    taskId: task.id,
                    taskName: task.name,
                    serviceId: item.serviceId,
                    serviceName: item.service.name,
                    description: '',
                    status: 0,
                    reportTemplateId: task.reportTemplateId,
                    staffId: task.staffId,
                    staff: task.staff,
                    startTime,
                    endTime,
                    createdAt: moment()
                  })

                }
              }
            }
          }
        }
      }
      return userTasks;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return [];
    }
  }

  async getCount(userInfo?: IUserInfo) {
    const query = this.sitesRepository.createQueryBuilder('sites')

    query.innerJoin('sites.items', 'items')



    if (userInfo.type === userType.STAFF) {
      query.innerJoin('items.staffs', 'staffs', " staffs.staffId=:staffId", { staffId: userInfo.userId })
    }
    else if (userInfo.type === userType.CUSTOMER) {
      query.innerJoin('items.staffs', 'staffs', " staffs.staffId=:customerId", { customerId: userInfo.userId })
    } else {
      query.innerJoin('items.staffs', 'staffs')
    }
    query.innerJoin('staffs.staff', 'staff', 'staff.status!=4')
    return await query.getCount();
  }

  async getStaffsBySite(siteId: number, serviceId: number, customerId: number) {
    try {
      const query = this.siteItemsRepository.createQueryBuilder('site_items')
        .leftJoinAndSelect('site_items.staffs', 'staffs')
        .innerJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])

      if (+siteId) {
        query.andWhere('site_items.siteId=:siteId', { siteId })
      }
      if (serviceId) {
        query.andWhere('site_items.serviceId=:serviceId', { serviceId })
      }
      if (+customerId) {
        query.andWhere('site_items.customerId=:customerId', { customerId })
      }
      const result = await query.getOne();
      if (!result)
        return { ...errorCode.SUCCESS, data: [] };

      return { ...errorCode.SUCCESS, data: result.staffs.filter(c => c.staff) };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getSitesByStaff(userinfo: IUserInfo) {
    try {
      const startDate = moment().format('YYYY-MM-DD 00:00:00');
      const endDate = moment().format('YYYY-MM-DD 23:59:59');
      const query = this.sitesRepository.createQueryBuilder('sites')
        .innerJoin('sites.items', 'items')
        .innerJoin('items.staffs', 'staffs', 'staffs.staff_id = :staffId', { staffId: userinfo.userId })
        .distinct(true);
      const sites = await query.getMany();
      if (!sites?.length) {
        return { ...errorCode.SUCCESS, data: { rows: [], count: 0 } };
      }

      const siteIds = sites.map((s) => s.id);
      const openItems = await this.sitesRepository.manager
        .createQueryBuilder(UserDailyJobItem, 'items')
        .innerJoinAndSelect('items.userDailyJob', 'job')
        .where('items.type = 1')
        .andWhere('items.check_out IS NULL')
        .andWhere('job.staff_id = :staffId', { staffId: userinfo.userId })
        .andWhere('job.site_id IN (:...siteIds)', { siteIds })
        .andWhere('job.date >= :startDate AND job.date <= :endDate', { startDate, endDate })
        .getMany();

      const openBySiteId = new Map<number, UserDailyJobItem>();
      for (const item of openItems) {
        const siteId = item.userDailyJob?.siteId;
        if (siteId && !openBySiteId.has(siteId)) {
          openBySiteId.set(siteId, item);
        }
      }

      const rows = sites.map((site) => {
        const open = openBySiteId.get(site.id);
        return {
          id: site.id,
          name: site.name,
          location: site.location,
          addressName: site.addressName,
          checkInDistance: site.checkInDistance,
          openCheckInId: open?.id ?? null,
          isCheckedIn: !!open,
          checkInTime: open?.checkIn ?? null,
        };
      });

      return { ...errorCode.SUCCESS, data: { rows, count: rows.length } };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getServicesBySite(userInfo: IUserInfo, siteId: number) {
    try {
      const query = this.siteItemsRepository.createQueryBuilder('site_items')
        .leftJoinAndSelect('site_items.service', 'service').addSelect(['service.id', 'service.name'])
        .leftJoinAndSelect('site_items.staffs', 'staffs')
        .where('site_items.siteId=:siteId ', { siteId })
      if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'site_items.customerId');
      }
      if (userInfo.type === userType.STAFF) {
        query.andWhere('staffs.staffId =:id', { id: userInfo.userId })
      }
      const result = await query.getMany();
      if (!result)
        return { ...errorCode.SUCCESS, data: [] };

      const seen = new Set<string>();
      const rows = [];
      for (const r of result) {
        const depId = r.service?.id;
        if (depId == null || seen.has(String(depId))) continue;
        seen.add(String(depId));
        rows.push({ id: depId, name: r.service.name });
      }
      return { ...errorCode.SUCCESS, data: rows };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getCustomersBySite(userInfo: IUserInfo, siteId: number, serviceId: number) {
    try {
      const query = this.siteItemsRepository.createQueryBuilder('site_items')
        .leftJoinAndSelect('site_items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
        .leftJoinAndSelect('customer.customerInfo', 'customerInfo')
        .where('site_items.siteId=:siteId and site_items.serviceId=:serviceId', { siteId, serviceId })
      if (userInfo.type === userType.STAFF) {
        query.innerJoin('site_items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: userInfo.userId })
      }
      const result = await query.getMany();
      if (!result)
        return { ...errorCode.SUCCESS, data: [] };

      const seen = new Set<number>();
      const rows = [];
      for (const r of result) {
        const id = r.customer?.id;
        if (id == null || seen.has(id)) continue;
        seen.add(id);
        rows.push({
          id,
          name: r.customer.fullName,
          fullName: r.customer.fullName,
          customerName: r.customer.fullName,
          companyName: r.customer.customerInfo?.companyName,
          customerInfo: r.customer.customerInfo,
        });
      }
      return { ...errorCode.SUCCESS, data: rows };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  /** New report (other site): first site_items row for this staff on any job site. */
  async getStaffDefaultReportAssignment(userInfo: IUserInfo) {
    try {
      if (userInfo.type !== userType.STAFF) {
        return { ...errorCode.EXCEPTION, message: 'Staff only' };
      }

      const row = await this.siteItemsRepository
        .createQueryBuilder('site_items')
        .leftJoinAndSelect('site_items.service', 'service')
        .leftJoinAndSelect('site_items.customer', 'customer', 'customer.status!=4')
        .leftJoinAndSelect('customer.customerInfo', 'customerInfo')
        .innerJoin(
          'site_items.staffs',
          'staffFilter',
          'staffFilter.staffId = :staffId',
          { staffId: +userInfo.userId },
        )
        .orderBy('site_items.id', 'ASC')
        .getOne();

      if (!row?.customer?.id || !row?.service?.id) {
        return { ...errorCode.SUCCESS, data: null };
      }

      return {
        ...errorCode.SUCCESS,
        data: {
          serviceId: +(row.serviceId ?? row.service.id),
          serviceName: row.service.name || '',
          customerId: +row.customer.id,
          customerName: row.customer.fullName || '',
          companyName: row.customer.customerInfo?.companyName || '',
          staffId: +userInfo.userId,
        },
      };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  /** New report: resolve Service, customer, and staff from site_items site assignment. */
  async getStaffReportAssignmentBySite(
    userInfo: IUserInfo,
    siteId: number,
    staffId?: number,
    serviceId?: number,
  ) {
    try {
      if (userInfo.type !== userType.STAFF && userInfo.type !== userType.ADMIN) {
        return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
      }

      const effectiveStaffId =
        userInfo.type === userType.STAFF
          ? +userInfo.userId
          : staffId != null && Number.isFinite(+staffId) && +staffId > 0
            ? +staffId
            : undefined;

      const query = this.siteItemsRepository
        .createQueryBuilder('site_items')
        .leftJoinAndSelect('site_items.service', 'service')
        .leftJoinAndSelect('site_items.customer', 'customer', 'customer.status!=4')
        .leftJoinAndSelect('customer.customerInfo', 'customerInfo')
        .leftJoinAndSelect('site_items.staffs', 'staffs')
        .where('site_items.siteId = :siteId', { siteId });

      if (effectiveStaffId) {
        query.innerJoin(
          'site_items.staffs',
          'staffFilter',
          'staffFilter.staffId = :staffId',
          { staffId: effectiveStaffId },
        );
      }

      const deptFilter =
        serviceId != null && Number.isFinite(+serviceId) && +serviceId > 0
          ? +serviceId
          : undefined;
      if (deptFilter) {
        query.andWhere('site_items.serviceId = :serviceId', { serviceId: deptFilter });
      }

      const row = await query.orderBy('site_items.id', 'ASC').getOne();

      if (!row?.customer?.id || !row?.service?.id) {
        return { ...errorCode.SUCCESS, data: null };
      }

      const firstStaffOnItem = row.staffs?.find((s) => s?.staffId != null);
      const resolvedStaffId =
        effectiveStaffId ?? (firstStaffOnItem ? +firstStaffOnItem.staffId : undefined);

      return {
        ...errorCode.SUCCESS,
        data: {
          serviceId: +(row.serviceId ?? row.service.id),
          serviceName: row.service.name || '',
          customerId: +row.customer.id,
          customerName: row.customer.fullName || '',
          companyName: row.customer.customerInfo?.companyName || '',
          staffId: resolvedStaffId,
        },
      };
    } catch (error) {
      console.log(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getSites(userInfo: IUserInfo) {
    try {
      const query = this.sitesRepository.createQueryBuilder('sites')
        .leftJoinAndSelect('sites.items', 'items')
        .leftJoinAndSelect('items.tasks', 'tasks')
      if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'items.customerId');
      }
      if (userInfo.type === userType.STAFF) {
        // query.andWhere('tasks.staffId =:id', { id: userInfo.userId })



        query.innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: userInfo.userId })
        query.leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4  and  taskstaff.id = :staffId', { staffId: userInfo.userId }).addSelect(['taskstaff.fullName', 'taskstaff.username'])
        // .andWhere('tasks.staffId =:id', { id: userInfo.userId })
      }
      const result = await query.getMany();
      return {
        ...errorCode.SUCCESS, data: result.map((r) => {
          return { id: r.id, name: r.name, location: r.location, addressName: r.addressName }
        })
      };
    } catch (error) {
      console.log(error)
    }
  }

  async getShifts(userInfo: IUserInfo, body: GetShiftsDto) {
    try {
      const query = this.siteItemsRepository.createQueryBuilder('items')
        .leftJoinAndSelect('items.site', 'site')
        // .leftJoinAndSelect('items.tasks', 'tasks')
        // .leftJoinAndSelect('tasks.siteItem', 'siteItem')
        // .leftJoinAndSelect('tasks.shifts', 'shifts')
        // .leftJoin('tasks.staff', 'taskstaff', 'taskstaff.status!=4').addSelect(['taskstaff.fullName', 'taskstaff.username'])
        .leftJoin('items.service', 'service').addSelect(['service.id', 'service.name'])
        .leftJoin('items.customer', 'customer', 'customer.status!=4').addSelect(['customer.id', 'customer.fullName'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
      if (+body.staffId) {
        query.innerJoinAndSelect('items.staffs', 'staffs', 'staffs.staffId = :staffId', { staffId: body.staffId })
          .innerJoin('staffs.staff', 'staff', 'staff.status!=4').addSelect(['staff.id', 'staff.fullName'])
      }
      query.leftJoinAndSelect('staffs.staffShifts', 'staffShifts')
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`items.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      } else {
        query.orderBy(`items.createdAt`, 'DESC');
      }
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      return {
        ...errorCode.SUCCESS, data: {
          count: result[1], rows: result[0].filter(cc => cc.customer != null && cc.service != null)
        }
      };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async AddItem(userInfo: IUserInfo, body: SiteItemDto) {
    try {
      const newItem = new SiteItem();
      const ref = await this.resolveSiteItemCustomerRef(
        body.customerId,
        (body as SiteItemDto & { companyId?: number }).companyId,
      );
      newItem.serviceId = body.serviceId;
      newItem.customerId = ref.customerId;
      newItem.companyId = ref.companyId;
      newItem.siteId = body.siteId;
      newItem.createdAt = new Date();
      const saved = await this.siteItemsRepository.save(newItem);
      await this.replaceSiteItemStaffs(saved.id, body.staffs);
      await this.tasksService.updateTaskStaffs(saved.id, body.staffs ?? []);
      return errorCode.SUCCESS;

    } catch (error) {
      const message = error instanceof Error ? error.message : errorCode.EXCEPTION.message;
      return { ...errorCode.EXCEPTION, message };
    }
  }

  async updateItem(userInfo: IUserInfo, id: number, body: SiteItemDto) {
    try {
      const checkService = await this.siteItemsRepository.findOne({ where: { id } });
      if (checkService) {
        const ref = await this.resolveSiteItemCustomerRef(
          body.customerId,
          (body as SiteItemDto & { companyId?: number }).companyId,
        );
        checkService.serviceId = body.serviceId;
        checkService.customerId = ref.customerId;
        checkService.companyId = ref.companyId;
        await this.siteItemsRepository.save(checkService);
        await this.replaceSiteItemStaffs(checkService.id, body.staffs);
        await this.tasksService.updateTaskStaffs(checkService.id, body.staffs ?? []);
        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      const message = error instanceof Error ? error.message : errorCode.EXCEPTION.message;
      return { ...errorCode.EXCEPTION, message };
    }
  }



  async removeSiteItem(id: number) {
    try {
      const data = await this.siteItemsRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.siteItemsRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

}

