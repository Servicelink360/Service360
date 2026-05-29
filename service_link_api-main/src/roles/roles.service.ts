import { Inject, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { Logger } from 'winston';
import { IUserInfo } from '../interfaces/IUserInfo';
import { GetRolesDto } from './dto/get-roles.dto';
import { Role } from './entities/role.entity';
import { removeAccents } from '../helpers/util';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @Inject('winston') private readonly logger: Logger,
  ) { }
  async getAll() {
    const roles = await this.rolesRepository.createQueryBuilder('roles').select(['roles.id', 'roles.name']).getMany();
    return { ...errorCode.SUCCESS, data: roles };
  }

  async create(userInfo: IUserInfo, body: CreateRoleDto) {
    try {
      const checkId = await this.rolesRepository.findOne({ where: { name: body.name } });
      if (checkId) {
        return errorCode.NAME_EXIST
      }
      const data = new Role();
      data.name = body.name;
      data.id = removeAccents(body.name.split(' ').join('').toUpperCase());
      if (body.description !== undefined)
        data.description = body.description;
      if (body.order !== undefined)
        data.order = body.order;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      const newItem = await this.rolesRepository.save(data);
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

  async findAll(body: GetRolesDto) {
    try {
      const query = this.rolesRepository.createQueryBuilder('roles')
        .leftJoin('roles.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('roles.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
      if (body.keyword) {
        query.where("( roles.name LIKE :keyword or roles.name LIKE :description )", { keyword: `%${body.keyword}%` })
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`roles.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
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

  async update(userInfo: IUserInfo, id: string, body: UpdateRoleDto) {
    try {
      const checkId = await this.rolesRepository.findOne({ where: { name: body.name, id: Not(id) } });
      if (checkId && checkId.id !== id) {
        return errorCode.NAME_EXIST
      }

      const data = await this.rolesRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined)
        data.name = body.name;
      // data.id = removeAccents(body.name.split(' ').join('').toUpperCase());
      if (body.description !== undefined)
        data.description = body.description;
      if (body.order !== undefined)
        data.order = body.order;
      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.rolesRepository.update(id, data);
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
      const data = await this.rolesRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.rolesRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.rolesRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}
