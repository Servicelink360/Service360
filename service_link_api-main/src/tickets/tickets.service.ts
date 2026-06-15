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
import { applyCustomerScopeToQuery, customerScopeSql } from '../helpers/customer-scope';
import { ClearDeletedTicketsDto } from './dto/clear-deleted-tickets.dto';
import { CustomerNotificationsService } from '../users/customer-notifications.service';

@Injectable()
export class TicketsService {
  /** Hidden from normal ticket lists; shown on Deleted tab. */
  private readonly listExcludedStatuses = [ticketStatus.DELETED];
  constructor(
    @InjectRepository(Ticket) private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketAnswer) private readonly ticketAnswersRepository: Repository<TicketAnswer>,
    @Inject('winston') private readonly logger: Logger,
    private readonly customerNotifications: CustomerNotificationsService,
  ) { }

  private async customerDisplayForUser(
    userId: number,
  ): Promise<{ customerName: string; companyName: string }> {
    if (!userId) return { customerName: '', companyName: '' };
    const rows: Array<{ customerName: string | null; companyName: string | null }> =
      await this.ticketsRepository.manager.query(
        `
        SELECT
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.username
          ) AS "customerName",
          COALESCE(
            NULLIF(TRIM(org.name), ''),
            NULLIF(TRIM(c.company_name), '')
          ) AS "companyName"
        FROM users u
        LEFT JOIN customers c ON c.user_id = u.id
        LEFT JOIN customer_companies org ON org.id = c.company_id
        WHERE u.id = $1
        LIMIT 1
        `,
        [+userId],
      );
    const row = rows?.[0];
    return {
      customerName: row?.customerName?.trim() || '',
      companyName: row?.companyName?.trim() || '',
    };
  }

  private ticketCustomerCompanyName(ticket: Ticket): string {
    const direct = String(ticket.companyName || '').trim();
    if (direct) return direct;
    const info = ticket.customer?.customerInfo;
    const orgName = String(info?.company?.name || '').trim();
    if (orgName) return orgName;
    const legacy = String(info?.companyName || '').trim();
    if (legacy) return legacy;
    return String(ticket.createdUser?.customerInfo?.companyName || '').trim();
  }

  private ticketCustomerPersonName(ticket: Ticket): string {
    const direct = String(ticket.customerName || '').trim();
    if (direct) return direct;
    const user = ticket.customer || ticket.createdUser;
    if (!user) return '';
    return String(user.fullName || user.username || '').trim();
  }

  private enrichTicketRow(ticket: Ticket): Ticket {
    return {
      ...ticket,
      companyName: this.ticketCustomerCompanyName(ticket),
      customerName: this.ticketCustomerPersonName(ticket),
    };
  }

  async create(userInfo: IUserInfo, body: CreateTicketDto) {
    try {
      const ticket = new Ticket();
      ticket.message = body.message;
      if (+userInfo.type === userType.CUSTOMER) {
        ticket.customerId = +userInfo.userId;
        const display = await this.customerDisplayForUser(+userInfo.userId);
        ticket.customerName = display.customerName || userInfo.fullName || body.customerName || '';
        ticket.companyName = display.companyName || body.companyName || '';
      } else {
        ticket.customerId = body.customerId;
        ticket.customerName = body.customerName;
        ticket.companyName = body.companyName;
        if (body.customerId && (!ticket.customerName?.trim() || !ticket.companyName?.trim())) {
          const display = await this.customerDisplayForUser(+body.customerId);
          ticket.customerName = ticket.customerName?.trim() || display.customerName;
          ticket.companyName = ticket.companyName?.trim() || display.companyName;
        }
      }
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

      if (+userInfo.type === userType.CUSTOMER && ticketSaved?.id) {
        void this.customerNotifications.notifyAdminsNewTicket({
          ticketId: ticketSaved.id,
          subject: ticketSaved.subject || body.subject || '',
          siteName: ticketSaved.siteName || body.siteName || '',
          customerName: ticketSaved.customerName || userInfo.fullName || '',
          companyName: ticketSaved.companyName || body.companyName || '',
          createdByUserId: +userInfo.userId,
        });
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
        .leftJoin('tickets.customer', 'ticketCustomer')
        .addSelect([
          'ticketCustomer.id',
          'ticketCustomer.fullName',
          'ticketCustomer.username',
          'ticketCustomer.firstName',
          'ticketCustomer.lastName',
        ])
        .leftJoin('ticketCustomer.customerInfo', 'ticketCustomerInfo')
        .addSelect(['ticketCustomerInfo.companyName'])
        .leftJoin('ticketCustomerInfo.company', 'ticketCustomerCompany')
        .addSelect(['ticketCustomerCompany.name'])
        .leftJoin('tickets.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('createdUser.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
        .leftJoin('tickets.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
        .leftJoinAndSelect('tickets.answers', 'answers')
        .leftJoin('answers.createdUser', 'answersCreatedUser').addSelect(['answersCreatedUser.fullName', 'answersCreatedUser.username'])
        .leftJoin('answers.user', 'answerUser').addSelect(['answerUser.fullName', 'answerUser.username'])
        .leftJoin('answersCreatedUser.customerInfo', 'answersCustomerInfo').addSelect(['answersCustomerInfo.companyName'])
        .leftJoin('answers.updatedUser', 'answersUpdatedUser').addSelect(['answersUpdatedUser.fullName', 'answersUpdatedUser.username'])
      if (body.keyword) {
        query.andWhere("( tickets.subject LIKE :keyword or tickets.message LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      const listDeleted = +body.status === ticketStatus.DELETED;
      if (listDeleted) {
        query.andWhere('tickets.status = :deletedStatus', {
          deletedStatus: ticketStatus.DELETED,
        });
      } else if (+body.status) {
        query.andWhere('tickets.status = :status', { status: +body.status });
      } else {
        query.andWhere('tickets.status NOT IN (:...listExcludedStatuses)', {
          listExcludedStatuses: this.listExcludedStatuses,
        });
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
      query.addOrderBy('answers.createdAt', 'ASC');
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      const rows = result[0].map((ticket) => this.enrichTicketRow(ticket));
      return { ...errorCode.SUCCESS, data: { count: result[1], rows } };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: string, body: UpdateTicketDto) {
    try {
      const data = await this.ticketsRepository.findOne({ where: { id: +id } });
      if (!data || +data.status === ticketStatus.DELETED) {
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
      if (+userInfo.type === userType.CUSTOMER) {
        data.customerId = +userInfo.userId;
        const display = await this.customerDisplayForUser(+userInfo.userId);
        data.customerName = display.customerName || userInfo.fullName || data.customerName;
        data.companyName = display.companyName || data.companyName;
      } else if (body.customerId !== undefined) {
        data.customerId = body.customerId;
        if (body.customerName !== undefined) data.customerName = body.customerName;
        if (body.customerId && (!data.customerName?.trim() || !data.companyName?.trim())) {
          const display = await this.customerDisplayForUser(+body.customerId);
          data.customerName = data.customerName?.trim() || display.customerName;
          data.companyName = data.companyName?.trim() || display.companyName;
        }
      }
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

  async remove(userInfo: IUserInfo, id: string) {
    try {
      const ticketId = +id;
      const data = await this.ticketsRepository.findOne({ where: { id: ticketId } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }

      const userId = +userInfo.userId;
      const type = +userInfo.type;

      if (type === userType.ADMIN) {
        if (+data.status === ticketStatus.DELETED) {
          await this.ticketAnswersRepository.delete({ ticketId });
          await this.ticketsRepository.delete(ticketId);
          return errorCode.SUCCESS;
        }
        data.status = ticketStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.ticketsRepository.save(data);
        return errorCode.SUCCESS;
      }

      if (+data.status === ticketStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }

      if (type === userType.CUSTOMER) {
        if (+data.customerId !== userId) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only remove your own tickets',
          };
        }
        data.status = ticketStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.ticketsRepository.save(data);
        return errorCode.SUCCESS;
      }

      return {
        ...errorCode.CAN_NOT_DELETE,
        message: 'You are not allowed to delete tickets',
      };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restoreTicket(userInfo: IUserInfo, id: string) {
    try {
      const ticketId = +id;
      const data = await this.ticketsRepository.findOne({ where: { id: ticketId } });
      if (!data || +data.status !== ticketStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }

      const userId = +userInfo.userId;
      const type = +userInfo.type;

      if (type === userType.CUSTOMER) {
        if (+data.customerId !== userId) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only restore your own tickets',
          };
        }
      } else if (type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }

      data.status = ticketStatus.PENDING;
      data.updatedBy = userId;
      data.updatedAt = new Date();
      await this.ticketsRepository.save(data);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async purgeDeletedTicketsByIds(userInfo: IUserInfo, body: ClearDeletedTicketsDto) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const ids = Array.from(
        new Set((body?.ids || []).map((n) => +n).filter((n) => Number.isFinite(n) && n > 0)),
      );
      if (!ids.length) {
        return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };
      }
      const tickets = await this.ticketsRepository
        .createQueryBuilder('t')
        .where('t.id IN (:...ids)', { ids })
        .andWhere('t.status = :deletedStatus', { deletedStatus: ticketStatus.DELETED })
        .getMany();
      let clearedCount = 0;
      for (const ticket of tickets) {
        await this.ticketAnswersRepository.delete({ ticketId: ticket.id });
        await this.ticketsRepository.delete(ticket.id);
        clearedCount += 1;
      }
      return { ...errorCode.SUCCESS, data: { clearedCount } };
    } catch (error) {
      this.logger.error((error as Error).message);
      return {
        ...errorCode.EXCEPTION,
        message: (error as Error).message || errorCode.EXCEPTION.message,
      };
    }
  }

  async changeStatus(userInfo: IUserInfo, body: ChangeStatusDto) {
    try {
      const data = await this.ticketsRepository.findOne({ where: { id: body.id } });
      if (!data || +data.status === ticketStatus.DELETED) {
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
      const count = await this.ticketsRepository.count({
        where: { status: status === ticketStatus.DELETED ? ticketStatus.DELETED : status },
      });
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
      ticketAnser.userId = userInfo.userId;
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

  /** Admin: new tickets or waiting for support. Customer: waiting for customer reply. */
  private adminBadgeEligibleSql(alias = 't') {
    return `(
      ${alias}.status = ${ticketStatus.PENDING}
      OR (${alias}.status = ${ticketStatus.INPROGRESS} AND ${alias}.sender = 2)
    )`;
  }

  private customerBadgeEligibleSql(alias = 't') {
    return `(${alias}.status = ${ticketStatus.INPROGRESS} AND ${alias}.sender = 1)`;
  }

  async countNewTicketsForDashboard(userInfo: IUserInfo) {
    try {
      const deletedStatus = ticketStatus.DELETED;
      const viewerId = +userInfo.userId;

      if (+userInfo.type === userType.ADMIN) {
        const rows = await this.ticketsRepository.query(
          `SELECT count(*)::int AS count
           FROM public.tickets t
           WHERE t.status != $1
             AND ${this.adminBadgeEligibleSql('t')}
             AND NOT EXISTS (
               SELECT 1 FROM public.ticket_admin_visibility v
               WHERE v.ticket_id = t.id
                 AND v.user_id = $2
                 AND v.badge_dismissed_at IS NOT NULL
             )`,
          [deletedStatus, viewerId],
        );
        return { ...errorCode.SUCCESS, data: +(rows?.[0]?.count ?? 0) };
      }

      if (+userInfo.type === userType.CUSTOMER) {
        const customerScope = customerScopeSql('t.customer_id').replace(
          /:customerScopeUserId/g,
          '$2',
        );
        const rows = await this.ticketsRepository.query(
          `SELECT count(*)::int AS count
           FROM public.tickets t
           WHERE t.status != $1
             AND ${this.customerBadgeEligibleSql('t')}
             AND ${customerScope}
             AND NOT EXISTS (
               SELECT 1 FROM public.ticket_customer_visibility v
               WHERE v.ticket_id = t.id
                 AND v.user_id = $2
                 AND v.badge_dismissed_at IS NOT NULL
             )`,
          [deletedStatus, viewerId],
        );
        return { ...errorCode.SUCCESS, data: +(rows?.[0]?.count ?? 0) };
      }

      return { ...errorCode.SUCCESS, data: 0 };
    } catch (error) {
      this.logger.error((error as Error).message);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async markAllTicketsOpenedForAdmin(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const deletedStatus = ticketStatus.DELETED;
      const viewerId = +userInfo.userId;
      await this.ticketsRepository.query(
        `INSERT INTO public.ticket_admin_visibility (ticket_id, user_id, badge_dismissed_at)
         SELECT t.id, $1, NOW()
         FROM public.tickets t
         WHERE t.status != $2
           AND ${this.adminBadgeEligibleSql('t')}
           AND NOT EXISTS (
             SELECT 1 FROM public.ticket_admin_visibility v
             WHERE v.ticket_id = t.id
               AND v.user_id = $1
               AND v.badge_dismissed_at IS NOT NULL
           )
         ON CONFLICT (ticket_id, user_id) DO UPDATE
         SET badge_dismissed_at = COALESCE(
           public.ticket_admin_visibility.badge_dismissed_at,
           EXCLUDED.badge_dismissed_at
         )`,
        [viewerId, deletedStatus],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markAllTicketsOpenedForCustomer(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const deletedStatus = ticketStatus.DELETED;
      const viewerId = +userInfo.userId;
      const customerScope = customerScopeSql('t.customer_id').replace(
        /:customerScopeUserId/g,
        '$1',
      );
      await this.ticketsRepository.query(
        `INSERT INTO public.ticket_customer_visibility (ticket_id, user_id, badge_dismissed_at)
         SELECT t.id, $1, NOW()
         FROM public.tickets t
         WHERE t.status != $2
           AND ${this.customerBadgeEligibleSql('t')}
           AND ${customerScope}
           AND NOT EXISTS (
             SELECT 1 FROM public.ticket_customer_visibility v
             WHERE v.ticket_id = t.id
               AND v.user_id = $1
               AND v.badge_dismissed_at IS NOT NULL
           )
         ON CONFLICT (ticket_id, user_id) DO UPDATE
         SET badge_dismissed_at = COALESCE(
           public.ticket_customer_visibility.badge_dismissed_at,
           EXCLUDED.badge_dismissed_at
         )`,
        [viewerId, deletedStatus],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markAllTicketsOpened(userInfo: IUserInfo) {
    if (+userInfo.type === userType.ADMIN) {
      return this.markAllTicketsOpenedForAdmin(userInfo);
    }
    if (+userInfo.type === userType.CUSTOMER) {
      return this.markAllTicketsOpenedForCustomer(userInfo);
    }
    return errorCode.CAN_NOT_DELETE;
  }

  async dashboard(userInfo: IUserInfo) {
    try {
      let rows = [];
      if (userInfo.type === 3)
        rows = await this.ticketsRepository.query(
          `select count(*) as count,status from tickets where status != ? GROUP BY status`,
          [ticketStatus.DELETED],
        )
      else if (userInfo.type === 1)
        rows = await this.ticketsRepository.query(
          `select count(*) as count,status from tickets where customer_id=? and status != ? GROUP BY status`,
          [userInfo.userId, ticketStatus.DELETED],
        )

      return { ...errorCode.SUCCESS, data: rows }
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }
}
