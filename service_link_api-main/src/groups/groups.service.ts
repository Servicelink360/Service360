


import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { Logger } from 'winston';
import { IUserInfo } from '../interfaces/IUserInfo';
import { removeAccents } from '../helpers/util';
import { Group } from './entities/group.entity';
import { GetGroupsDto } from './dto/get-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupsRepository: Repository<Group>,
    @Inject('winston') private readonly logger: Logger,
  ) { }
  async getAll() {
    const data = await this.groupsRepository.createQueryBuilder('groups')
      .select(['groups.id', 'groups.name', 'groups.serviceId'])
      .getMany();
    return { ...errorCode.SUCCESS, data };
  }

  async create(userInfo: IUserInfo, body: CreateGroupDto) {
    try {
      const checkId = await this.groupsRepository.findOne({ where: { id: body.id } });
      if (checkId) {
        return errorCode.CODE_EXIST
      }
      const data = new Group();
      data.name = body.name;
      data.id = removeAccents(body.name.split(' ').join('').toUpperCase());
      if (body.description !== undefined)
        data.description = body.description;
      if (body.order !== undefined)
        data.order = body.order;

      if (body.serviceId !== undefined)
        data.serviceId = body.serviceId;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      const newItem = await this.groupsRepository.save(data);
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

  async findAll(body: GetGroupsDto) {
    try {
      const query = this.groupsRepository.createQueryBuilder('groups');
      query.leftJoin('groups.service', 'service').addSelect(['Service.name'])
      query.leftJoin('groups.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('groups.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
      if (body.keyword) {
        query.where("( groups.name LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`groups.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      }
      else {
        query.orderBy(`groups.createdAt`, 'DESC');
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

  async update(userInfo: IUserInfo, id: string, body: UpdateGroupDto) {
    try {
      const checkId = await this.groupsRepository.findOne({ where: { id } });
      if (checkId && checkId.id !== id) {
        return errorCode.CODE_EXIST
      }

      const data = await this.groupsRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.serviceId !== undefined)
        data.serviceId = body.serviceId;
      if (body.name !== undefined)
        data.name = body.name;
      if (body.order !== undefined)
        data.order = body.order;
      if (body.description !== undefined)
        data.description = body.description;
      if (body.order !== undefined)
        data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.groupsRepository.update(id, data);
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

  async remove(id: string) {
    try {
      const data = await this.groupsRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.groupsRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.groupsRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}

