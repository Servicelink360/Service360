


import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { Logger } from 'winston';
import { IUserInfo } from '../interfaces/IUserInfo';
import { removeAccents } from '../helpers/util';
import { GetPositionsDto } from './dto/get-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dto/create-position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position) private readonly positionsRepository: Repository<Position>,
    @Inject('winston') private readonly logger: Logger,
  ) { }
  async getAll() {
    const data = await this.positionsRepository.createQueryBuilder('positions')
      .select(['positions.id', 'positions.name'])
      .getMany();
    return { ...errorCode.SUCCESS, data };
  }

  async create(userInfo: IUserInfo, body: CreatePositionDto) {
    try {
      const checkId = await this.positionsRepository.findOne({ where: { id: body.id } });
      if (checkId) {
        return errorCode.CODE_EXIST
      }
      const data = new Position();
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
      const newItem = await this.positionsRepository.save(data);
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

  async findAll(body: GetPositionsDto) {
    try {
      const query = this.positionsRepository.createQueryBuilder('positions');
      query.leftJoin('positions.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('positions.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
      if (body.keyword) {
        query.where("( positions.name LIKE :keyword or positions.description LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`positions.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      }
      else {
        query.orderBy(`positions.createdAt`, 'DESC');
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

  async update(userInfo: IUserInfo, id: string, body: UpdatePositionDto) {
    try {
      const checkId = await this.positionsRepository.findOne({ where: { id } });
      if (checkId && checkId.id !== id) {
        return errorCode.CODE_EXIST
      }

      const data = await this.positionsRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.name !== undefined)
        data.name = body.name;
      if (body.order !== undefined)
        data.order = body.order;
      if (body.description !== undefined)
        data.description = body.description;
      if (body.order !== undefined)
        data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.positionsRepository.update(id, data);
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
      const data = await this.positionsRepository.findOne({ where: { id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.positionsRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.positionsRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}

