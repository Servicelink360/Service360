import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { IUserInfo } from '../interfaces/IUserInfo';
import { Task } from './entities/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { TaskShift } from './entities/task-shift.entity';
import { ChangeStatusDto } from './dto/change-status-task.dto';
import { TaskShiftLog } from './entities/task-shift-log.entity';
import { GetTasksDto } from './dto/get-tasks.dto';
import { eStatus } from '../constants/status';
import * as moment from 'moment';
import { userType } from '../constants/user';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskShift) private readonly taskShiftsRepository: Repository<TaskShift>,
    @InjectRepository(TaskShiftLog) private readonly taskShiftLogsRepository: Repository<TaskShiftLog>,
    @Inject('winston') private readonly logger: Logger,
  ) { }
  async create(userInfo: IUserInfo, body: CreateTaskDto) {
    try {

      const data = new Task();
      data.name = body.name;
      data.description = body.description;
      data.siteItemId = body.siteItemId;
      data.reportTemplateId = body.reportTemplateId;
      data.startDate = body.startDate;
      data.endDate = body.endDate;
      data.type = body.type;
      data.typeValue = body.typeValue;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      data.status = eStatus.YES;
      if (body.staffId !== undefined)
        data.staffId = body.staffId;
      if (body.shifts) {
        const shifts = [];
        for (const item of body.shifts) {
          const nItem = new TaskShift();
          nItem.from = item.from;
          nItem.to = item.to;
          nItem.createdAt = new Date();
          shifts.push(nItem)
        }
        data.shifts = shifts;
      }
      const newItem = await this.tasksRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      const logs = [];
      const taskInfo = await this.tasksRepository.findOne({ where: { id: newItem.id }, relations: ['shifts'] })
      // for (const item of taskInfo.shifts) {
      //   const log = new TaskShiftLog();
      //   log.shiftId = item.shiftId;
      //   log.createdBy = userInfo.userId;
      //   log.updatedBy = userInfo.userId;
      //   log.type = item.type;
      //   log.status = item.status;
      //   log.typeValue = item.typeValue;
      //   log.startDate = item.startDate;
      //   log.endDate = item.endDate;
      //   log.createdAt = new Date();
      //   log.taskName = taskInfo.name
      //   log.shiftName = item.shift.name
      //   log.action = "CREATED";
      //   log.taskShiftId = item.id;
      //   logs.push(log)
      // }
      await this.taskShiftLogsRepository.save(logs);

      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
  async findOne(id: number) {
    const taskInfo = await this.tasksRepository.findOne({ where: { id: id }, relations: ['shifts'] })
    return { ...errorCode.SUCCESS, data: taskInfo };
  }
  async findAll(body: GetTasksDto) {
    try {
      const query = this.tasksRepository.createQueryBuilder('tasks')
        .leftJoin('tasks.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('tasks.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
      if (body.keyword) {
        query.where("( tasks.name LIKE :keyword or tasks.description LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`tasks.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      }
      else {
        query.orderBy(`tasks.createdAt`, 'DESC');
      }
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      return { ...errorCode.SUCCESS, data: { count: result[1], rows: result[0] } };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateTaskDto) {
    try {

      const data = await this.tasksRepository.findOne({ where: { id }, relations: ['shifts'] });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined)
        data.name = body.name;
      if (body.description !== undefined)
        data.description = body.description;

      if (body.siteItemId !== undefined)
        data.siteItemId = body.siteItemId;
      if (body.staffId !== undefined)
        data.staffId = body.staffId;

      if (body.reportTemplateId !== undefined)
        data.reportTemplateId = body.reportTemplateId;
      if (body.startDate !== undefined)
        data.startDate = body.startDate;
      if (body.endDate !== undefined)
        data.endDate = body.endDate;
      if (body.type !== undefined)
        data.type = body.type;
      if (body.typeValue !== undefined)
        data.typeValue = body.typeValue;

      if (body.status !== undefined)
        data.status = body.status;
      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      if (body.shifts) {
        const shifts = [];
        for (const item of body.shifts) {

          const nItem = new TaskShift();
          nItem.from = item.from;
          nItem.to = item.to;
          const shiftInfo = data.shifts.find(c => c.taskId === id);
          if (shiftInfo) {
            nItem.createdAt = shiftInfo.createdAt;
          }
          else {
            nItem.createdAt = new Date();
          }

          shifts.push(nItem)
        }
        data.shifts = shifts;
      }
      const newItem = await this.tasksRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      const logs = [];
      const taskInfo = await this.tasksRepository.findOne({ where: { id: newItem.id }, relations: ['shifts'] })
      // for (const item of taskInfo.shifts) {
      //   const log = new TaskShiftLog();
      //   log.shiftId = item.shiftId;
      //   log.type = item.type;
      //   log.status = item.status;
      //   log.createdBy = userInfo.userId;
      //   log.updatedBy = userInfo.userId;
      //   log.typeValue = item.typeValue;
      //   log.startDate = item.startDate;
      //   log.endDate = item.endDate;
      //   log.createdAt = new Date();
      //   log.taskName = taskInfo.name
      //   log.shiftName = item.shift.name
      //   log.taskShiftId = item.id;
      //   log.action = "UPDATED";
      //   logs.push(log)
      // }
      await this.taskShiftLogsRepository.save(logs);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(id: string) {
    try {
      const data = await this.tasksRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.tasksRepository.delete(+id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


  async changeStatus(userInfo: IUserInfo, taskShiftId: number, body: ChangeStatusDto) {
    try {

      const data = await this.taskShiftsRepository.findOne({ where: { id: taskShiftId } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      // data.status = body.status
      const newItem = await this.taskShiftsRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }

      const logs = [];
      const item = await this.taskShiftsRepository.findOne({ where: { id: taskShiftId }, relations: ['shift', 'task'] })

      // const log = new TaskShiftLog();
      // log.shiftId = item.shiftId;
      // log.taskId = item.taskId;
      // log.createdBy = userInfo.userId;
      // log.updatedBy = userInfo.userId;
      // log.type = item.type;
      // log.status = item.status;
      // log.typeValue = item.typeValue;
      // log.startDate = item.startDate;
      // log.endDate = item.endDate;
      // log.createdAt = new Date();
      // log.updatedAt = new Date();
      // log.taskName = item.task.name;
      // log.shiftName = item.shift.name
      // log.action = "CHANGE_STATUS";
      // log.taskShiftId = taskShiftId;
      // logs.push(log)
      // await this.taskShiftLogsRepository.save(logs);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateReminder(id: number, userId: number, reminderTimes: number, reminderDay: string) {
    try {

      const query2 = this.taskShiftsRepository.createQueryBuilder('taskshifts')
        .where(`taskshifts.id=:id and  DATE_FORMAT(taskshifts.reminderDay, '%Y/%m/%d')=:date and taskshifts.reminderDay=:reminderDay`,
          { id, date: moment().format('YYYY/MM/DD'), reminderDay })
      const check = await query2.getCount();
      if (check > 0) {
        return null;
      }
      const data = await this.taskShiftsRepository.findOne({ where: { id } });
      data.reminderTimes = reminderTimes;
      data.reminderDay = reminderDay;
      await this.taskShiftsRepository.save(data);
      return data
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return null;
    }
  }

  async getCount(userInfo?: IUserInfo) {
    const query = this.tasksRepository.createQueryBuilder('tasks')
    if (userInfo.type === userType.STAFF) {
      query.where('tasks.staffId=:staffId', { staffId: userInfo.userId })
    }
    else if (userInfo.type === userType.CUSTOMER) {
      query.where('tasks.staffId=:customerId', { customerId: userInfo.userId })
    }
    return await this.tasksRepository.count();
  }

  async updateTaskStaffs(siteItemId: number, starffs) {
    const sStaff = await this.tasksRepository.find({ where: { siteItemId: String(siteItemId) } })
    for (const item of sStaff) {
      const check = starffs.find(c => c.staffId === item.staffId);
      if (!check) {
        await this.tasksRepository.delete({ id: item.id });
      }
    }
  }

}
