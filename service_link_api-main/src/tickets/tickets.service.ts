import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserInfo } from '../interfaces/IUserInfo';
import { TicketAnswer } from './entities/ticket-answer.entity';
import { ticketStatus } from '../constants/status';
import { errorCode } from '../constants/errorCode';
import { GetTicketsDto } from './dto/get-tickets.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateTicketAnswerDto } from './dto/create-ticket-answer.dto';
import { UpdateTicketAnswerDto } from './dto/update-ticket-answer.dto';
import { userType } from '../constants/user';
import * as moment from 'moment';
import { applyCustomerScopeToQuery } from '../helpers/customer-scope';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketAnswer) private readonly ticketAnswersRepository: Repository<TicketAnswer>,
    @Inject('winston') private readonly logger: Logger,
  ) { }
  async create(userInfo: IUserInfo, body: CreateTicketDto) {
    try {
      const ticket = new Ticket();
      ticket.message = body.message;
      ticket.customerId = (+userInfo.type === 1) ? userInfo.userId : body.customerId;
      ticket.customerName = (+userInfo.type === 1) ? userInfo.fullName : body.customerName;
      ticket.companyName = body.companyName;
      ticket.serviceId = body.serviceId;
      ticket.serviceName = body.serviceName;
      ticket.attachFiles = body.attachFiles;
      ticket.priority = body.priority;
      ticket.siteId = body.siteId;
      ticket.siteName = body.siteName;
      ticket.subject = body.subject;
      ticket.status = ticketStatus.PENDING;
      ticket.createdBy = userInfo.userId;
      ticket.updatedBy = userInfo.userId;
      ticket.createdAt = new Date();
      ticket.updatedAt = new Date();
      ticket.sender = 1;//1: sender 2:customer
      const ticketSaved = await this.ticketsRepository.save(ticket);
      if (ticketSaved) {
        const content = new TicketAnswer();
        content.ticketId = ticketSaved.id;
        content.createdBy = userInfo.userId;
        content.updatedBy = userInfo.userId;
        content.userId = userInfo.userId;
        content.message = body.message;
        content.attachFiles = body.attachFiles;
        content.createdAt = new Date();
        content.updatedAt = new Date();
        content.type = 1;
        await this.ticketAnswersRepository.save(content);
      }

      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }


  }

  async findAll(userInfo: IUserInfo, body: GetTicketsDto) {
    try {
      const query = this.ticketsRepository.createQueryBuilder('tickets')
        .leftJoin('tickets.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('createdUser.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
        .leftJoin('tickets.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
        .leftJoinAndSelect('tickets.answers', 'answers')
        .leftJoin('answers.createdUser', 'answersCreatedUser').addSelect(['answersCreatedUser.fullName', 'answersCreatedUser.username'])
        .leftJoin('answersCreatedUser.customerInfo', 'answersCustomerInfo').addSelect(['answersCustomerInfo.companyName'])
        .leftJoin('answers.updatedUser', 'answersUpdatedUser').addSelect(['answersUpdatedUser.fullName', 'answersUpdatedUser.username'])
      if (body.keyword) {
        query.andWhere("( tickets.subject LIKE :keyword or tickets.message LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      if (+body.status) {
        query.andWhere("( tickets.status = :status)", { status: +body.status })
      }
      if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'tickets.customerId');
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.startDate && body.endDate) {
        query.andWhere('tickets.created_at > :startDate AND tickets.created_at< :endDate', { startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59") })
      }
      if (body.orderBy) {
        query.orderBy(`tickets.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
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

  async update(userInfo: IUserInfo, id: string, body: UpdateTicketDto) {
    try {
      const data = await this.ticketsRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.subject !== undefined)
        data.subject = body.subject;
      if (body.message !== undefined)
        data.message = body.message;
      if (body.customerId !== undefined)
        data.customerId = body.customerId;
      if (body.customerName !== undefined)
        data.customerName = body.customerName;

      if (body.serviceId !== undefined)
        data.serviceId = body.serviceId;
      if (body.attachFiles !== undefined)
        data.attachFiles = body.attachFiles;
      if (body.priority !== undefined)
        data.priority = body.priority;
      if (body.siteId !== undefined)
        data.siteId = body.siteId;
      if (body.serviceName != undefined)
        data.serviceName = body.serviceName;
      if (body.siteName != undefined)
        data.siteName = body.siteName;
      if (body.subject !== undefined)
        data.subject = body.subject;
      if (body.companyName !== undefined)
        data.companyName = body.companyName;
      data.customerId = (+userInfo.type === 1) ? userInfo.userId : body.customerId;
      data.customerName = (+userInfo.type === 1) ? userInfo.fullName : body.customerName;
      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.ticketsRepository.update(id, data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      const ticketAnser = await this.ticketAnswersRepository.findOne({ where: { ticketId: data.id }, order: { id: 'ASC' } });
      if (!ticketAnser)
        return errorCode.NOT_FOUND
      ticketAnser.attachFiles = body.attachFiles;
      ticketAnser.message = body.message;
      ticketAnser.updatedBy = userInfo.userId;
      ticketAnser.updatedAt = new Date();


      await this.ticketAnswersRepository.save(ticketAnser)
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async remove(id: string) {
    try {
      const data = await this.ticketsRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      await this.ticketsRepository.delete(id);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changeStatus(userInfo: IUserInfo, body: ChangeStatusDto) {
    try {
      const data = await this.ticketsRepository.findOne({ where: { id: body.id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      data.status = body.status
      data.updatedAt = new Date();
      data.updatedBy = userInfo.userId;
      await this.ticketsRepository.save(data);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count(status: number) {
    try {
      const count = await this.ticketsRepository.count({ where: { status } });
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async createComment(userInfo: IUserInfo, body: CreateTicketAnswerDto) {
    try {
      const ticketAnser = new TicketAnswer();
      ticketAnser.attachFiles = body.attachFiles;
      ticketAnser.message = body.message;
      ticketAnser.createdAt = new Date();
      ticketAnser.updatedAt = new Date();
      ticketAnser.createdBy = userInfo.userId;
      ticketAnser.updatedBy = userInfo.userId;
      ticketAnser.type = userInfo.type === 1 ? 1 : 2;
      ticketAnser.ticketId = body.ticketId;
      const result = await this.ticketAnswersRepository.save(ticketAnser);
      if (!result)
        return errorCode.EXCEPTION
      await this.ticketsRepository.update(body.ticketId, { sender: userInfo.type === 1 ? 1 : 2, status: ticketStatus.INPROGRESS })
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }
  async updateComment(userInfo: IUserInfo, id: number, body: UpdateTicketAnswerDto) {
    try {
      const ticketAnser = await this.ticketAnswersRepository.findOne({ where: { id } });
      if (!ticketAnser)
        return errorCode.NOT_FOUND
      ticketAnser.attachFiles = body.attachFiles;
      ticketAnser.message = body.message;
      ticketAnser.createdAt = new Date();
      ticketAnser.updatedAt = new Date();
      ticketAnser.createdBy = userInfo.userId;
      ticketAnser.updatedBy = userInfo.userId;
      await this.ticketAnswersRepository.save(ticketAnser);
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }

  async deleteComment(userInfo: IUserInfo, id: number) {
    try {
      const ticketAnser = await this.ticketAnswersRepository.findOne({ where: { id } });
      if (ticketAnser)
        await this.ticketAnswersRepository.delete(ticketAnser);
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }

  async dashboard(userInfo: IUserInfo) {
    try {
      let rows = [];
      if (userInfo.type === 3)
        rows = await this.ticketsRepository.query(`select count(*) as count,status from tickets GROUP BY status`)
      else if (userInfo.type === 1)
        rows = await this.ticketsRepository.query(`select count(*) as count,status from tickets where customer_id=? GROUP BY status`, [userInfo.userId])

      return { ...errorCode.SUCCESS, data: rows }
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }
}
