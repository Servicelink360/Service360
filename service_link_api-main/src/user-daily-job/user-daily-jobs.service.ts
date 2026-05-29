import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserDailyJob } from './entities/user-daily-job.entity';
import { CreateUserDailyJobDto } from './dto/create-user-daily-job.dto';
import { IUserInfo } from '../interfaces/IUserInfo';
import { UserDailyJobItem } from './entities/user-daily-job-items.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { GetUserDailyJobsDto } from './dto/get-user-daily-job.dto';
import * as moment from 'moment';
import { UpdateUserDailyJobDto } from './dto/update-user-daily-job.dto';
import { Site } from '../sites/entities/site.entity';
import { distanceMetres, parseLatLng } from '../helpers/geo';
import { sumAttendanceTotalSeconds } from '../helpers/duration';
import { userType } from '../constants/user';

@Injectable()
export class UserDailyJobsService {
  constructor(
    @InjectRepository(UserDailyJob) private readonly userDailyJobsRepository: Repository<UserDailyJob>,
    @InjectRepository(UserDailyJobItem) private readonly userDailyJobItemRepository: Repository<UserDailyJobItem>,
    @InjectRepository(Site) private readonly sitesRepository: Repository<Site>,
    @Inject('winston') private readonly logger: Logger,
  ) { }

  private todayRange() {
    return {
      startDate: moment().format('YYYY-MM-DD 00:00:00'),
      endDate: moment().format('YYYY-MM-DD 23:59:59'),
    };
  }

  /** Load username/email/full_name for every staff id in the current result set. */
  private async loadStaffProfiles(staffIds: number[]) {
    const ids = Array.from(
      new Set(staffIds.map((id) => +id).filter((id) => id > 0)),
    );
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.userDailyJobsRepository.query(
      `SELECT id AS user_id, full_name, username, email
       FROM users WHERE id IN (${placeholders})
       ORDER BY full_name ASC`,
      ids,
    );
  }

  private staffIdsFromRows(rows: UserDailyJobItem[]) {
    return rows
      .map((item) => item.userDailyJob?.staffId)
      .filter((id): id is number => !!id);
  }

  private async validateSiteDistance(siteId: number, staffLocation?: string) {
    const site = await this.sitesRepository.findOne({ where: { id: siteId } });
    if (!site?.checkInDistance || site.checkInDistance <= 0) {
      return null;
    }
    const siteCoords = parseLatLng(site.location);
    const staffCoords = parseLatLng(staffLocation);
    if (!siteCoords || !staffCoords) {
      return {
        ...errorCode.EXCEPTION,
        message: 'Location is required to check in at this site',
      };
    }
    const metres = distanceMetres(
      siteCoords.lat,
      siteCoords.lng,
      staffCoords.lat,
      staffCoords.lng,
    );
    if (metres > site.checkInDistance) {
      return {
        ...errorCode.EXCEPTION,
        message: `You must be within ${site.checkInDistance}m of the job site to check in`,
      };
    }
    return null;
  }

  private async findOpenCheckInItem(staffId: number, siteId?: number) {
    const { startDate, endDate } = this.todayRange();
    const qb = this.userDailyJobItemRepository
      .createQueryBuilder('items')
      .innerJoin('items.userDailyJob', 'job')
      .where('items.type = 1')
      .andWhere('items.check_out IS NULL')
      .andWhere('job.staff_id = :staffId', { staffId })
      .andWhere('job.date >= :startDate AND job.date <= :endDate', { startDate, endDate });
    if (siteId) {
      qb.andWhere('job.site_id = :siteId', { siteId });
    }
    return qb.orderBy('items.id', 'DESC').getOne();
  }

  async create(userInfo: IUserInfo, body: CreateUserDailyJobDto) {
    try {
      if (+body.type === 1) {
        const distanceError = await this.validateSiteDistance(+body.siteId, body.staffLocation);
        if (distanceError) return distanceError;
        const open = await this.findOpenCheckInItem(userInfo.userId, +body.siteId);
        if (open) {
          return { ...errorCode.SHIFT_EXIST, message: 'Already checked in at this site' };
        }
      }

      const { startDate, endDate } = this.todayRange();
      let data = await this.userDailyJobsRepository
        .createQueryBuilder('user_daily_jobs')
        .andWhere(
          `user_daily_jobs.site_id = :siteId AND user_daily_jobs.staff_id = :staffId AND user_daily_jobs.date >= :startDate AND user_daily_jobs.date <= :endDate`,
          { siteId: body.siteId, staffId: userInfo.userId, startDate, endDate },
        )
        .getOne();
      if (data) {
        data.updatedAt = new Date();
        data.updatedBy = userInfo.userId;
      } else {
        data = new UserDailyJob();
        data.siteId = body.siteId;
        data.siteLocation = body.siteLocation || body.staffLocation || '';
        data.staffId = userInfo.userId;
        data.updatedBy = userInfo.userId;
        data.createdAt = new Date();
        data.updatedAt = new Date();
        data.createdBy = userInfo.userId;
        data.date = new Date();
      }
      const newItem = await this.userDailyJobsRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }

      let checkInId = +body.checkInId;
      if (+body.type === 2 && !checkInId) {
        const open = await this.findOpenCheckInItem(userInfo.userId, +body.siteId);
        checkInId = open?.id;
      }
      const checkInInfo = checkInId
        ? await this.userDailyJobItemRepository.findOne({ where: { id: checkInId } })
        : null;

      const nItem = new UserDailyJobItem();
      nItem.type = body.type;
      nItem.createdAt = new Date();
      if (+body.type === 1) {
        nItem.checkIn = new Date();
      }
      if (+body.type === 2) {
        if (!checkInInfo) {
          return { ...errorCode.NOT_FOUND, message: 'No open check-in found for this site' };
        }
        nItem.checkOut = new Date();
        nItem.checkIn = checkInInfo.checkIn;
        checkInInfo.checkOut = nItem.checkOut;
        await this.userDailyJobItemRepository.save(checkInInfo);
      }
      nItem.userDailyJobId = newItem.id;
      const savedItem = await this.userDailyJobItemRepository.save(nItem);

      return {
        ...errorCode.SUCCESS,
        data: {
          checkInId: +body.type === 1 ? savedItem.id : checkInInfo?.id,
          userDailyJobId: newItem.id,
          checkIn: savedItem.checkIn,
          checkOut: savedItem.checkOut,
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
  strHours(distance) {
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      return (days * 24) + hours + ":" + minutes
    }
    return hours + ":" + minutes
  }

  async findAll(userInfo: IUserInfo, body: GetUserDailyJobsDto) {
    try {
      const query = this.userDailyJobItemRepository.createQueryBuilder('items')
        .leftJoinAndSelect('items.userDailyJob', 'userDailyJob')
        .andWhere('items.type=1')
        .leftJoinAndSelect('userDailyJob.site', 'site')
        .leftJoinAndSelect('userDailyJob.staff', 'staff')
      if (userInfo?.type === userType.STAFF) {
        query.andWhere('userDailyJob.staff_id = :jwtStaffId', { jwtStaffId: userInfo.userId });
      }
      if (+body.siteId) {
        query.andWhere("userDailyJob.siteId = :siteId", { siteId: body.siteId })
      }
      if (+body.staffId) {
        query.andWhere("userDailyJob.staffId = :staffId", { staffId: body.staffId })
      }
      if (body.startDate && body.endDate) {
        query.andWhere(`items.createdAt >= :startDate AND items.createdAt <= :endDate`, { startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59") })
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      }
      else {
        query.orderBy(`userDailyJob.id`, 'DESC');
      }


      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      if (body.isTotalHours && +body.isTotalHours === 1) {
        const querTotal = this.userDailyJobItemRepository.createQueryBuilder('items')
          .leftJoin('items.userDailyJob', 'userDailyJob')
          .andWhere('items.type=1')
        if (+body.siteId) {
          querTotal.andWhere("userDailyJob.siteId = :siteId", { siteId: body.siteId })
        }
        if (+body.staffId) {
          querTotal.andWhere("userDailyJob.staffId = :staffId", { staffId: body.staffId })
        }
        if (body.startDate && body.endDate) {
          querTotal.andWhere(`items.createdAt >= :startDate AND items.createdAt <= :endDate`, { startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59") })
        }
        querTotal.select(['items.checkOut', 'items.checkIn'])
        const resultTotal = await querTotal.getMany();
        const totalSeconds = sumAttendanceTotalSeconds(resultTotal);
        let staff: any[] = [];
        try {
          staff = await this.loadStaffProfiles(this.staffIdsFromRows(result[0]));
        } catch (err) {
          this.logger.error(`loadStaffProfiles: ${err?.message || err}`);
        }
        return {
          ...errorCode.SUCCESS,
          data: {
            count: result[1],
            rows: result[0],
            total: totalSeconds,
            staff,
          },
        };
      }
      let staff: any[] = [];
      try {
        staff = await this.loadStaffProfiles(this.staffIdsFromRows(result[0]));
      } catch (err) {
        this.logger.error(`loadStaffProfiles: ${err?.message || err}`);
      }
      return {
        ...errorCode.SUCCESS, data: {
          count: result[1], rows: result[0], total: 0, staff,
        }
      };

    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }


  async getUsers(body: GetUserDailyJobsDto) {
    try {
      let strSite = '';
      const params = []
      if (+body.siteId) {
        strSite = " AND user_daily_jobs.site_id =?";
        params.push(body.siteId)
      }

      if (+body.staffId) {
        strSite += " AND user_daily_jobs.staff_id =?";
        params.push(body.staffId)
      }
      if (body.startDate && body.endDate) {
        strSite += ` AND items.created_at >= ? AND items.created_at <= ?`;
        params.push(
          moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
          moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
        );
      }

      const data = await this.userDailyJobsRepository.query(`
        SELECT DISTINCT user_daily_jobs.staff_id AS user_id,
          users.full_name, users.username, users.email
        FROM user_daily_job_items items
        INNER JOIN user_daily_jobs ON user_daily_jobs.id = items.user_daily_job_id
        LEFT JOIN users ON users.id = user_daily_jobs.staff_id
        WHERE items.type = 1 AND user_daily_jobs.staff_id IS NOT NULL ${strSite}
        ORDER BY users.full_name ASC
        `, params)
      return { ...errorCode.SUCCESS, data };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async findOne(id: number) {
    const data = await this.userDailyJobsRepository.findOne({ where: { id: id }, relations: ['items'] })
    return { ...errorCode.SUCCESS, data };
  }


  async update(userInfo: IUserInfo, id: number, body: UpdateUserDailyJobDto) {
    try {

      const data = await this.userDailyJobItemRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (!data.checkOut) {
        const checkInInfo = await this.userDailyJobItemRepository.findOne({ where: { id } });
        const nItem = new UserDailyJobItem();
        nItem.type = 2;
        nItem.createdAt = new Date();
        nItem.checkOut = new Date();
        if (checkInInfo) {
          nItem.checkIn = checkInInfo.checkIn;
          checkInInfo.checkOut = nItem.checkOut;
          await this.userDailyJobItemRepository.save(checkInInfo);
        }
        nItem.createdAt = new Date();
        nItem.userDailyJobId = data.userDailyJobId;
        await this.userDailyJobItemRepository.save(nItem);
      }

      data.checkIn = body.checkIn;
      data.checkOut = body.checkOut;
      const newItem = await this.userDailyJobItemRepository.save(data);
      if (!newItem) {
        await this.userDailyJobsRepository.update(data.userDailyJobId, { updatedAt: new Date(), updatedBy: userInfo.userId })
        return errorCode.EXCEPTION;
      }
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(id: string) {
    try {
      const data = await this.userDailyJobItemRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (data.checkOut)
        await this.userDailyJobItemRepository.delete({ checkOut: data.checkOut, userDailyJobId: data.userDailyJobId, type: 2 });
      await this.userDailyJobItemRepository.delete(id);

      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


}
