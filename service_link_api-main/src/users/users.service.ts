import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Raw } from 'typeorm';
import { errorCode } from 'src/constants/errorCode';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import config from './../config';
import { ChangePasswordAdminDto, ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangeProfileDto } from './dto/change-profile.dto';
import { userStatus, userType } from '../constants/user';
import { Logger } from 'winston';
import { v4 as uuid } from 'uuid';
import { UserToken } from './entities/user-token.entity';
import { userTokenType } from 'src/constants/type';
import { GetUsersDto } from './dto/get-users.dto';
import { CheckUsernameQueryDto } from 'src/auth/dto/check-username.dto';
import * as moment from 'moment'
import { IUserInfo } from '../interfaces/IUserInfo';
import { IErrorData } from '../interfaces/IErrorData';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SignUpDto } from '../auth/dto/sign-up.dto';
import { SendMail } from '../helpers/sendEmail';
import { emailSignInUrl, emailSupportFooterHtml } from '../helpers/emailContent';
import { v4 as uuidv4 } from 'uuid';
import { Chr6, makeOTP } from '../helpers/util';
import { ForgotPassword2Dto, ForgotPasswordDto } from '../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { RequestSignUpDto } from '../auth/dto/request-sign-up.dto';
import { VerifyForgotPasswordDto } from '../auth/dto/verify-forgot-password-password.dto';
import { UserRole } from './entities/user-role.entity';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserGroup } from './entities/user-group.entity';
import { Customer } from './entities/customer.entity';
import { CustomerCompany } from './entities/customer-company.entity';
import { Staff } from './entities/staff.entity';
import { SettingsService } from '../settings/settings.service';
import { UpdateCustomerNotificationDto } from './dto/update-customer-notification.dto';
@Injectable()
export class UsersService {
  /** Login identifier stored in `users.username`; always mirrors email when email is set. */
  private loginUsernameFromBody(body: { email?: string; username?: string }): string {
    const email = String(body?.email ?? '').trim();
    if (email) return email;
    return String(body?.username ?? '').trim();
  }

  /** Roles table uses string ids (e.g. ADMIN); never coerce with Number(). */
  private normalizeRoleId(roleId: unknown): string | null {
    if (roleId === null || roleId === undefined || roleId === '') return null;
    const normalized = String(roleId).trim();
    if (!normalized || normalized === 'NaN') return null;
    return normalized;
  }

    async findAdminUser() {
      return await this.userRepository.findOne({ where: { type: 3 } });
    }

    async saveUser(user: User) {
      return await this.userRepository.save(user);
    }
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserToken) private readonly userTokenRepository: Repository<UserToken>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
    @Inject('winston') private readonly logger: Logger,
    @Inject(forwardRef(() => SettingsService)) private readonly settingsService: SettingsService,
  ) { }

  /** Display/storage company name only — no per-user [C-id] suffix. */
  sanitizeCompanyDisplayName(companyName: string | undefined): string {
    return String(companyName ?? '')
      .replace(/\s*\[C-\d+\]\s*/gi, ' ')
      .replace(/\s*\(Copy\)\s*/gi, ' ')
      .replace(/\s*\(duplicate\)\s*/gi, ' ')
      .trim();
  }

  private normalizeCompanyKey(companyName: string): string {
    return this.sanitizeCompanyDisplayName(companyName).toLowerCase().replace(/\s+/g, ' ');
  }

  /** Same company_id for all customers at the same organisation. */
  private async resolveCompanyId(companyName: string | undefined): Promise<number | null> {
    const display = this.sanitizeCompanyDisplayName(companyName);
    const key = this.normalizeCompanyKey(display);
    if (!key) {
      return null;
    }
    const repo = this.userRepository.manager.getRepository(CustomerCompany);
    let company = await repo.findOne({ where: { normalizedName: key } });
    if (!company) {
      company = await repo.save(
        repo.create({ name: display, normalizedName: key }),
      );
    } else if (company.name !== display) {
      company.name = display;
      await repo.save(company);
    }
    return company.id;
  }

  private resolveUserType(body: { type?: number; companyName?: string }): number {
    const t = Number(body.type);
    if (t === userType.CUSTOMER || t === userType.STAFF || t === userType.ADMIN) {
      return t;
    }
    if (body.companyName) {
      return userType.CUSTOMER;
    }
    return Number.isFinite(t) && t > 0 ? t : userType.STAFF;
  }

  private async buildCustomerDetailsFromBody(
    userId: number,
    body: CreateUserDto | UpdateUserDto,
  ): Promise<Customer> {
    const details = new Customer();
    details.userId = userId;
    details.city = body.city ?? '';
    details.state = body.state ?? '';
    details.postCode = body.postCode ?? '';
    details.country = body.country ?? '';
    details.website = body.website ?? '';
    details.location = body.location ?? '';
    details.landLine = body.landLine ?? '';
    details.description = body.description ?? '';
    details.sendLoginInfo = body.sendLoginInfo ?? 0;
    details.showQrCode = body.showQrCode ?? 0;
    if (body.companyId != null && +body.companyId > 0) {
      const company = await this.userRepository.manager
        .getRepository(CustomerCompany)
        .findOne({ where: { id: +body.companyId } });
      if (company) {
        details.companyId = company.id;
        details.companyName = company.name;
      } else {
        details.companyName = this.sanitizeCompanyDisplayName(body.companyName);
        details.companyId = await this.resolveCompanyId(body.companyName);
      }
    } else {
      details.companyName = this.sanitizeCompanyDisplayName(body.companyName);
      details.companyId = await this.resolveCompanyId(body.companyName);
    }
    details.companyEmail = body.companyEmail ?? '';
    details.companyPhone = body.companyPhone ?? '';
    return details;
  }

  /** Ensures users.type = CUSTOMER, customers row, shared company_id, no staff row. */
  async finalizeCustomerAccount(
    userId: number,
    body: CreateUserDto | UpdateUserDto,
  ): Promise<void> {
    await this.userRepository.update(userId, { type: userType.CUSTOMER });
    await this.userRepository.manager.delete(Staff, { userId });
    const details = await this.buildCustomerDetailsFromBody(userId, body);
    await this.userRepository.manager.save(Customer, details);
  }

  private customerBodyFromUser(user: User): UpdateUserDto {
    const info = user.customerInfo;
    return {
      username: user.username,
      email: user.email,
      type: userType.CUSTOMER,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      gender: user.gender,
      dob: user.dob,
      address: user.address,
      position: user.position,
      status: user.status,
      allowDelete: user.allowDelete,
      companyName: this.sanitizeCompanyDisplayName(info?.companyName || user.fullName || ''),
      companyEmail: info?.companyEmail ?? '',
      companyPhone: info?.companyPhone ?? '',
      city: info?.city ?? '',
      state: info?.state ?? '',
      postCode: info?.postCode ?? '',
      country: info?.country ?? '',
      website: info?.website ?? '',
      location: info?.location ?? '',
      landLine: info?.landLine ?? '',
      description: info?.description ?? '',
      sendLoginInfo: info?.sendLoginInfo ?? 0,
      showQrCode: info?.showQrCode ?? 0,
      password: '',
      fullName: user.fullName ?? '',
      positionId: user.position ?? '',
    };
  }

  /** Older rows (e.g. bootstrap admin) may have null created_at; list UI expects a value. */
  private normalizeUserListRow(user: User): User {
    if (!user.createdAt && user.updatedAt) {
      user.createdAt = user.updatedAt;
    }
    return this.normalizeCustomerOnRead(user);
  }

  private normalizeCustomerOnRead(user: User): User {
    if (+user.type === userType.CUSTOMER) {
      if (!user.customerInfo) {
        return user;
      }
      user.customerInfo.companyName = this.sanitizeCompanyDisplayName(
        user.customerInfo.companyName || user.fullName,
      );
      (user as User & { notificationPrefs?: Record<string, boolean> }).notificationPrefs = {
        emailNotifyNormalFaultReports: !!user.customerInfo.emailNotifyNormalFaultReports,
        emailNotifyUrgentFaultReports: !!user.customerInfo.emailNotifyUrgentFaultReports,
        emailNotifyNewReports: !!user.customerInfo.emailNotifyNewReports,
        emailNotifyMessages: !!user.customerInfo.emailNotifyMessages,
      };
      return user;
    }
    if (+user.type === userType.ADMIN) {
      (user as User & { notificationPrefs?: Record<string, boolean> }).notificationPrefs = {
        emailNotifyNormalFaultReports: !!user.emailNotifyNormalFaultReports,
        emailNotifyUrgentFaultReports: !!user.emailNotifyUrgentFaultReports,
        emailNotifyNewReports: !!user.emailNotifyNewReports,
        emailNotifyMessages: !!user.emailNotifyMessages,
        emailNotifyTickets: !!user.emailNotifyTickets,
      };
    }
    return user;
  }

  /** Apply customer rules to every customer user (startup + optional manual sync). */
  async syncAllCustomerProfiles(): Promise<IErrorData> {
    let synced = 0;
    let failed = 0;
    const rows = await this.userRepository
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.customerInfo', 'customerInfo')
      .where('users.type = :customerType', { customerType: userType.CUSTOMER })
      .andWhere('users.status != :deleted', { deleted: userStatus.DELETE })
      .getMany();

    for (const user of rows) {
      try {
        await this.finalizeCustomerAccount(user.id, this.customerBodyFromUser(user));
        synced += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `syncAllCustomerProfiles user ${user.id}: ${(error as Error).message}`,
        );
      }
    }
    return { ...errorCode.SUCCESS, data: { synced, failed } };
  }

  async duplicateCustomer(userInfo: IUserInfo, sourceUserId: number) {
    try {
      const source = await this.userRepository.findOne({
        where: { id: sourceUserId },
        relations: ['customerInfo', 'groups'],
      });
      if (!source) {
        return errorCode.NOT_FOUND;
      }
      if (+source.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Only customer accounts can be duplicated' };
      }
      const info = source.customerInfo;
      const copyTag = '_copy';
      const email = source.email
        ? String(source.email).replace('@', `${copyTag}@`)
        : `customer${copyTag}${Date.now()}@example.local`;
      const body: CreateUserDto = {
        username: source.username ?? `customer${sourceUserId}`,
        password: 'ChangeMe123!',
        email,
        type: userType.CUSTOMER,
        firstName: source.firstName ?? '',
        lastName: source.lastName ?? '',
        phone: source.phone ?? '',
        avatar: source.avatar ?? '',
        gender: source.gender ?? '',
        dob: source.dob,
        address: source.address ?? '',
        position: source.position ?? '',
        companyName: info?.companyName ?? '',
        companyEmail: info?.companyEmail ?? '',
        companyPhone: info?.companyPhone ?? '',
        city: info?.city ?? '',
        state: info?.state ?? '',
        postCode: info?.postCode ?? '',
        country: info?.country ?? '',
        website: info?.website ?? '',
        location: info?.location ?? '',
        landLine: info?.landLine ?? '',
        description: info?.description ?? '',
        sendLoginInfo: 2,
        showQrCode: info?.showQrCode ?? 0,
        groups: source.groups?.map((g) => g.groupId) ?? [],
        allowDelete: source.allowDelete ?? 0,
        startDate: new Date(),
        ratings: 0,
      };
      return await this.create(userInfo, body, userType.CUSTOMER);
    } catch (error) {
      this.logger.error(`duplicateCustomer ${sourceUserId}: ${(error as Error).message}`);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async repairCustomerAccount(userId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['customerInfo', 'staffInfo'],
      });
      if (!user) {
        return errorCode.NOT_FOUND;
      }
      await this.finalizeCustomerAccount(userId, this.customerBodyFromUser(user));
      const full = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['customerInfo', 'roles', 'groups'],
      });
      return { ...errorCode.SUCCESS, data: full };
    } catch (error) {
      this.logger.error(`repairCustomerAccount ${userId}: ${(error as Error).message}`);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async profile(userId: number) {
    try {
      const user = await this.userRepository.createQueryBuilder('users')
        .leftJoin('users.roles', 'roles').addSelect(["roles.roleId"])
        .leftJoinAndSelect('users.customerInfo', 'customerInfo')
        .leftJoinAndSelect('users.staffInfo', 'staffInfo')
        .where('users.id =:id', { id: userId })
        .getOne();
      if (user) {
        return { ...errorCode.SUCCESS, data: this.normalizeCustomerOnRead(user) };
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changePassword(userInfo: IUserInfo, body: ChangePasswordDto) {
    try {
      const user = await this.userRepository.createQueryBuilder('users')
        .where(" id = :userId", { userId: userInfo.userId })
        .addSelect("users.password")
        .getOne();
      if (user) {
        const isMatch = await bcrypt.compare(body.oldPassword + config.PASSWORD_SALT, user.password);
        if (isMatch) {
          const saltOrRounds = 10;
          const hash = await bcrypt.hash(body.newPassword + config.PASSWORD_SALT, saltOrRounds);
          user.password = hash;
          user.updatedAt = new Date();
          await this.userRepository.save(user);
          return errorCode.SUCCESS;
        }
        return errorCode.PASSWORD_NOT_MATCH;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


  async changePasswordAdmin(body: ChangePasswordAdminDto) {
    try {
      const user = await this.userRepository.createQueryBuilder('users')
        .where(" id = :userId", { userId: body.userId })
        .addSelect("users.password")
        .getOne();
      if (user) {
        const saltOrRounds = 10;
        const hash = await bcrypt.hash(body.newPassword + config.PASSWORD_SALT, saltOrRounds);
        user.password = hash;
        user.updatedAt = new Date();
        await this.userRepository.save(user);
        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changeEmail(body: ChangeEmailDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: body.user_id } });
      if (user) {
        const checkEmail = await this.userRepository.findOne({ where: { id: Not(body.user_id), email: body.email } });
        if (checkEmail) {
          return errorCode.EMAIL_EXIST;
        }
        user.email = body.email;
        user.updatedAt = new Date();
        await this.userRepository.save(user);

        //send token to user's email
        //create new token
        const newUserToken = new UserToken();
        newUserToken.token = uuid();
        //7 days
        const t = new Date();
        t.setDate(t.getDate() + 7);
        newUserToken.expired = new Date(t);
        newUserToken.createdAt = new Date();
        newUserToken.ip = "";
        newUserToken.os = "WEB";
        newUserToken.status = userStatus.PENDING;
        newUserToken.type = userTokenType.VERIFY_EMAIL;
        newUserToken.userKey = user.id.toString();

        await this.userTokenRepository.save(newUserToken);
        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changeEmailByUser(body: ChangeEmailDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: body.user_id } });
      if (user) {
        const checkEmail = await this.userRepository.findOne({ where: { id: Not(body.user_id), email: body.email } });
        if (checkEmail) {
          return errorCode.EMAIL_EXIST;
        }
        user.email = body.email;
        user.updatedAt = new Date();
        await this.userRepository.save(user);

        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changeProfile(userId: number, body: ChangeProfileDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        if (body.fullName)
          user.fullName = body.fullName;

        if (body.avatar)
          user.avatar = body.avatar;
        if (body.phone)
          user.phone = body.phone;

        if (body.gender)
          user.gender = body.gender;

        if (body.dob)
          user.dob = body.dob;
        if (body.address)
          user.address = body.address;

        user.updatedAt = new Date();
        await this.userRepository.save(user);
        return this.profile(user.id);
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async updateCustomerNotificationSettings(
    userId: number,
    body: UpdateCustomerNotificationDto,
  ) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['customerInfo'],
      });
      if (!user) {
        return errorCode.NOT_FOUND;
      }
      if (+user.type === userType.CUSTOMER && user.customerInfo) {
        const info = user.customerInfo;
        if (body.emailNotifyNormalFaultReports !== undefined) {
          info.emailNotifyNormalFaultReports = !!body.emailNotifyNormalFaultReports;
        }
        if (body.emailNotifyUrgentFaultReports !== undefined) {
          info.emailNotifyUrgentFaultReports = !!body.emailNotifyUrgentFaultReports;
        }
        if (body.emailNotifyNewReports !== undefined) {
          info.emailNotifyNewReports = !!body.emailNotifyNewReports;
        }
        if (body.emailNotifyMessages !== undefined) {
          info.emailNotifyMessages = !!body.emailNotifyMessages;
        }
        await this.userRepository.manager.getRepository(Customer).save(info);
        return this.profile(userId);
      }
      if (+user.type === userType.ADMIN) {
        if (body.emailNotifyNormalFaultReports !== undefined) {
          user.emailNotifyNormalFaultReports = !!body.emailNotifyNormalFaultReports;
        }
        if (body.emailNotifyUrgentFaultReports !== undefined) {
          user.emailNotifyUrgentFaultReports = !!body.emailNotifyUrgentFaultReports;
        }
        if (body.emailNotifyNewReports !== undefined) {
          user.emailNotifyNewReports = !!body.emailNotifyNewReports;
        }
        if (body.emailNotifyMessages !== undefined) {
          user.emailNotifyMessages = !!body.emailNotifyMessages;
        }
        if (body.emailNotifyTickets !== undefined) {
          user.emailNotifyTickets = !!body.emailNotifyTickets;
        }
        user.updatedAt = new Date();
        await this.userRepository.save(user);
        return this.profile(userId);
      }
      return {
        ...errorCode.VALIDATION_ERROR,
        message: 'Email notification settings are only available for customer and admin accounts',
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  createQueryGetAll(userInfo: IUserInfo, body: GetUsersDto) {
    const roleUser = userInfo.roleIds.find(c => c === 'USER');
    const query = this.userRepository.createQueryBuilder('users');
    if (+body.type) {
      query.andWhere(" users.type= :type", { type: +body.type })
    }
    if (body.keyword) {
      query.andWhere(`(users.fullName LIKE :keyword OR users.email like :keyword OR users.username like :keyword  OR users.phone like :keyword)`, { keyword: `%${body.keyword}%` })
    }
    if (body.startDate && body.endDate) {
      query.andWhere(`users.createdAt > :startDate AND users.createdAt <= :endDate`, { startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59") })
    }
    query.leftJoin('users.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
    query.leftJoin('users.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
    query.leftJoin('users.roles', 'roles').addSelect(['roles.id', 'roles.roleId'])
    query.leftJoin('users.groups', 'groups').addSelect(['groups.groupId'])
    query.leftJoinAndSelect('users.customerInfo', 'customerInfo')
    query.leftJoinAndSelect('customerInfo.company', 'customerOrg')
    query.leftJoinAndSelect('users.staffInfo', 'staffInfo')
    const includeDeleted =
      body.includeDeleted === true ||
      body.includeDeleted === 'true' ||
      body.includeDeleted === '1';
    if (!includeDeleted) {
      query.andWhere('users.status != :deletedStatus', { deletedStatus: userStatus.DELETE });
    }
    if (body.orderBy) {
      query.orderBy(`users.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
    } else {
      query.orderBy(`users.id`, 'DESC');
    }
    return query;
  }

  //admin
  async getAll(userInfo: IUserInfo, body: GetUsersDto) {
    try {

      if (body.limit && body.page) {
        const result = await this.createQueryGetAll(userInfo, body).take(body.limit).skip((body.page - 1) * body.limit).getManyAndCount();
        if (!result) {
          return { ...errorCode.SUCCESS, data: { count: 0, rows: [] } };
        }
        const newRows = result[0].map((row) => this.normalizeUserListRow(row));

        return { ...errorCode.SUCCESS, data: { count: result[1], rows: newRows } };
      }
      const rows = await this.createQueryGetAll(userInfo, body).getMany();

      return {
        ...errorCode.SUCCESS,
        data: { count: rows.length, rows: rows.map((row) => this.normalizeUserListRow(row)) },
      };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION
    }
  }

  /** Username is not required to be unique; only email is enforced on create/update. */
  async checkUsernameExists(_userId: number, _body: CheckUsernameQueryDto) {
    return errorCode.SUCCESS;
  }

  async verifyEmail(token: string) {
    const userToken = await this.userTokenRepository.findOne({ where: { token, type: userTokenType.VERIFY_EMAIL } });
    if (!userToken) {
      return errorCode.NOT_FOUND;
    }

    if (userToken.status && parseInt(userToken.status.toString()) === userStatus.ACTIVE) {
      return errorCode.ACTIVATED
    }

    userToken.status = userStatus.ACTIVE;
    userToken.updatedAt = new Date();
    await this.userTokenRepository.save(userToken);
    return errorCode.SUCCESS;
  }

  async changeStatus(id: number, status: number) {
    const userInfo = await this.userRepository.findOne({ where: { id } });
    if (!userInfo) {
      return errorCode.NOT_FOUND;
    }
    userInfo.status = status;
    const userSaved = await this.userRepository.save(userInfo);
    if (!userSaved) {
      return errorCode.EXCEPTION;
    }
    return errorCode.SUCCESS;
  }

  async create(userInfo: IUserInfo, body: CreateUserDto, type: number) {
    try {
      const data: User = new User();
      data.email = body.email;
      data.username = this.loginUsernameFromBody(body);
      const checkEmail = await this.userRepository.count({ where: { email: Like(body.email),status:userStatus.ACTIVE } });
      if (checkEmail > 0)
        return errorCode.EMAIL_EXIST;

      data.password = body.password;
      data.fullName = `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim();
      data.type = this.resolveUserType(body);
      data.allowDelete = body.allowDelete;
      data.avatar = body.avatar;
      data.phone = body.phone;
      data.gender = body.gender;
      data.dob = body.dob;
      data.firstName = body.firstName;
      data.lastName = body.lastName;
      data.position = body.position;
      data.status = userStatus.ACTIVE;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      if (body.groups) {
        const groups = [];
        for (const de of body.groups) {
          const nDe = new UserGroup();
          nDe.groupId = de;
          nDe.createdAt = new Date();
          groups.push(nDe)
        }
        if (groups.length) {
          data.groups = groups;
        }
      }
      if (+data.type === userType.CUSTOMER) {
        data.customerInfo = await this.buildCustomerDetailsFromBody(0, body);
      }
      if (+data.type === userType.STAFF) {
        const details = new Staff();
        details.ratings = body.ratings;
        details.startDate = body.startDate;
        details.companyName = body.companyName;
        data.staffInfo = details;
      }
      if (+data.type === userType.ADMIN && body.companyName) {
        const details = new Staff();
        details.companyName = body.companyName;
        data.staffInfo = details;
      }
      const result = await this.userRepository.save(data);
      if (result) {
        if (+result.type === userType.CUSTOMER) {
          await this.finalizeCustomerAccount(result.id, body);
        }
        if (body.sendLoginInfo) {
          const html = `
          <p>Hello ${body.email},</p>
          <p>The system has just created your account</p>
          <p>Your account:</p>
          <p>email (login): <b>${body.email}</b></p>
          <p>password: <b>${body.password}</b></p>
          <p>link: <b>${emailSignInUrl()}</b></p>
          ${emailSupportFooterHtml()}`
          SendMail(body.email, "Your Account", html);
        }
        if (body.userRoles) {
          const userRoles = [];
          for (const roleId of body.userRoles) {
            const normalizedRoleId = this.normalizeRoleId(roleId);
            if (normalizedRoleId) {
              const newItem = new UserRole();
              newItem.roleId = normalizedRoleId;
              newItem.userId = result.id;
              newItem.createdAt = new Date();
              userRoles.push(newItem);
            }
          }
          if (userRoles.length > 0) {
            await this.userRoleRepository.save(userRoles);
          }
        }
        const full = await this.userRepository.findOne({
          where: { id: result.id },
          relations: ['customerInfo', 'staffInfo', 'roles', 'groups'],
        });
        return { ...errorCode.SUCCESS, data: full ?? result };
      }
      return errorCode.EXCEPTION;
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: number, body: UpdateUserDto) {
    try {
      const data: User = await this.userRepository.findOne({ where: { id } });
      if (!data)
        return errorCode.NOT_FOUND;

      const checkEmail = await this.userRepository.count({ where: { email: Like(body.email), id: Not(id) ,status:userStatus.ACTIVE} });
      if (checkEmail > 0)
        return errorCode.EMAIL_EXIST;

      data.updatedAt = new Date();
      data.updatedBy = userInfo.userId;
      data.email = body.email;
      data.username = this.loginUsernameFromBody(body);
      data.fullName = `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim();
      data.type = this.resolveUserType(body);
      data.avatar = body.avatar;
      data.phone = body.phone;
      data.gender = body.gender;
      data.dob = body.dob;
      data.address = body.address;
      data.firstName = body.firstName;
      data.allowDelete = body.allowDelete;
      data.lastName = body.lastName;
      data.position = body.position;
      data.status = body.status;
      data.updatedAt = new Date();
      data.updatedBy = userInfo.userId;
      if (body.groups) {
        const groups = [];
        for (const de of body.groups) {
          const nDe = new UserGroup();
          nDe.groupId = de;
          nDe.createdAt = new Date();
          groups.push(nDe)
        }
        if (groups.length) {
          data.groups = groups;
        }
      }

      if (+data.type === userType.CUSTOMER) {
        data.customerInfo = await this.buildCustomerDetailsFromBody(id, body);
        data.staffInfo = null;
      }
      if (+data.type === userType.STAFF) {
        const details = new Staff();
        details.ratings = body.ratings;
        details.startDate = body.startDate;
        data.staffInfo = details;
      }
      if (+data.type === userType.ADMIN && body.companyName) {
        const details = new Staff();
        details.companyName = body.companyName;
        data.staffInfo = details;
      }

      const result = await this.userRepository.save(data);
      if (result) {
        if (+result.type === userType.CUSTOMER) {
          await this.finalizeCustomerAccount(id, body);
        }
        if (body.userRoles && body.userRoles.length) {
          await this.userRoleRepository.delete({ userId: data.id })
          const userRoles = [];
          for (const roleId of body.userRoles) {
            const normalizedRoleId = this.normalizeRoleId(roleId);
            if (normalizedRoleId) {
              const newItem = new UserRole();
              newItem.roleId = normalizedRoleId;
              newItem.createdAt = new Date();
              newItem.userId = data.id;
              userRoles.push(newItem);
            }
          }
          if (userRoles.length > 0) {
            await this.userRoleRepository.save(userRoles);
          }
        }


        return { ...errorCode.SUCCESS, data: result };
      }
      return errorCode.EXCEPTION;
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async validateUser(username: string, password: string, type: number, version: string) {
    // NOTE:
    // Admin/staff/customer all use the same sign-in UI in practice.
    // Email is unique; username is not — prefer email for login, and avoid ambiguous username matches.
    const loginType = +type;
    const login = String(username ?? '').trim();
    const baseQuery = () =>
      this.userRepository.createQueryBuilder('users')
        .leftJoin('users.roles', 'roles')
        .addSelect(['roles.roleId'])
        .addSelect(['users.password'])
        .andWhere('users.status != :deleted', { deleted: userStatus.DELETE })
        .andWhere('users.status != 4');

    let user: User | null = null;
    if (login.includes('@')) {
      user = await baseQuery()
        .andWhere('users.email = :email', { email: login })
        .getOne();
    } else {
      const byUsername = await baseQuery()
        .andWhere('users.username = :uname', { uname: login })
        .getMany();
      if (byUsername.length > 1) {
        return {
          error: 'AMBIGUOUS_USERNAME',
          message: 'Multiple accounts use this username. Please sign in with your email address.',
        };
      }
      user = byUsername[0] ?? null;
      if (!user) {
        user = await baseQuery()
          .andWhere('users.email = :email', { email: login })
          .getOne();
      }
    }
    if (!user) {
      return { error: 'USER_NOT_FOUND', message: 'User not found' };
    }
    const isMatch = await bcrypt.compare(password + config.PASSWORD_SALT, user.password);
    if (!isMatch) {
      return { error: 'PASSWORD_MISMATCH', message: 'Password does not match' };
    }

    // If the caller explicitly passed a type and it's valid, optionally reject mismatches.
    // For now we do NOT reject to preserve existing behaviour across portals.
    // if ([userType.ADMIN, userType.STAFF, userType.CUSTOMER].includes(loginType) && user.type !== loginType) {
    //   return { error: 'TYPE_MISMATCH', message: 'User type does not match' };
    // }

    // Load the correct profile relation for the authenticated user (without relying on a caller-provided type).
    // Keep it lightweight: only join the relation that matches the real user.type.
    if (user.type === userType.CUSTOMER) {
      const hydrated = await this.userRepository.createQueryBuilder('users')
        .leftJoinAndSelect('users.customerInfo', 'customerInfo')
        .where('users.id = :id', { id: user.id })
        .getOne();
      if (hydrated?.customerInfo) user.customerInfo = hydrated.customerInfo;
    } else if (user.type === userType.STAFF) {
      const hydrated = await this.userRepository.createQueryBuilder('users')
        .leftJoinAndSelect('users.staffInfo', 'staffInfo')
        .where('users.id = :id', { id: user.id })
        .getOne();
      if (hydrated?.staffInfo) user.staffInfo = hydrated.staffInfo;
    }

    await this.userRepository.update(user.id, { lastLogin: new Date(), lastVersion: version });
    return user;
  }

  async forgotPassword(body: ForgotPassword2Dto) {
    try {
      const email = (body.email || '').trim().toLowerCase();
      const phone = (body.phone || '').trim();
      if (!email) {
        return errorCode.NOT_FOUND;
      }

      const qb = this.userRepository
        .createQueryBuilder('users')
        .where('users.status = :status', { status: userStatus.ACTIVE })
        .andWhere('LOWER(TRIM(users.email)) = :email', { email });

      if (phone) {
        qb.andWhere('users.phone = :phone AND users.phone IS NOT NULL', { phone });
      }

      const user = await qb.getOne();
      if (!user) {
        return errorCode.NOT_FOUND;
      }
      const userToken = await this.userTokenRepository.findOne(
        {
          where: { userKey: String(user.id), status: userStatus.PENDING, type: userTokenType.FORGOT_PASSWORD }
        });
      if (userToken) {
        userToken.status = userStatus.REJECT;
        await this.userTokenRepository.save(userToken);
      }

      const t = new Date();
      t.setSeconds(t.getSeconds() + 5 * 60);
      const newUserToken = new UserToken();
      newUserToken.os = body.platform || 'web';
      newUserToken.userKey = user.id.toString();
      newUserToken.createdAt = new Date();
      newUserToken.updatedAt = new Date();
      newUserToken.expired = new Date(t)
      newUserToken.token = Chr6().toUpperCase();
      newUserToken.type = userTokenType.FORGOT_PASSWORD;
      newUserToken.status = userStatus.PENDING;
      await this.userTokenRepository.save(newUserToken);
      const html = `<p>Password Retrieve Request</p>
        <p>Hello ${user.email},</p>
        <p>The system has just created an OTP code to update the new password.</p>
        <p>Your confirmation code is <b>${newUserToken.token}</b></p>
        ${emailSupportFooterHtml()}`
      SendMail(user.email, "Forgot Password", html);
      return errorCode.SUCCESS;

    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


  async forgotPasswordAdmin(body: ForgotPasswordDto) {
    try {
      const email = (body.email || '').trim().toLowerCase();
      if (!email) {
        return errorCode.NOT_FOUND;
      }
      const user = await this.userRepository.createQueryBuilder('users')
        .where('users.status = :status', { status: userStatus.ACTIVE })
        .andWhere('LOWER(TRIM(users.email)) = :email', { email })
        .getOne();
      if (!user) {
        return errorCode.NOT_FOUND;
      }
      const userToken = await this.userTokenRepository.findOne(
        {
          where: { userKey: String(user.id), status: userStatus.PENDING, type: userTokenType.FORGOT_PASSWORD }
        });
      if (userToken) {
        userToken.status = userStatus.REJECT;
        await this.userTokenRepository.save(userToken);
      }

      const t = new Date();
      t.setSeconds(t.getSeconds() + 5 * 60);
      const newUserToken = new UserToken();
      newUserToken.os = 'WEB';
      newUserToken.userKey = user.id.toString();
      newUserToken.createdAt = new Date();
      newUserToken.updatedAt = new Date();
      newUserToken.expired = new Date(t)
      newUserToken.token = Chr6().toUpperCase();
      newUserToken.type = userTokenType.FORGOT_PASSWORD;
      newUserToken.status = userStatus.PENDING;
      await this.userTokenRepository.save(newUserToken);
      const html = `<p>Password Retrieve Request</p>
        <p>Hello ${user.email},</p>
        <p>The system has just created an OTP code to update the new password.</p>
        <p>Your confirmation code is <b>${newUserToken.token}</b></p>
        ${emailSupportFooterHtml()}`
      SendMail(user.email, "Forgot Password", html);
      return errorCode.SUCCESS;

    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


  async verifyOTPForgotPassword(body: VerifyForgotPasswordDto) {
    try {
      const userToken = await this.userTokenRepository.findOne({ where: { token: body.token, status: userStatus.PENDING, type: userTokenType.FORGOT_PASSWORD } });
      if (!userToken) {
        return errorCode.TOKEN_WRONG;
      }
      if (userToken.expired < new Date()) {
        return errorCode.TOKEN_EXPIRED;
      }
      return errorCode.SUCCESS;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async resetPassword(body: ResetPasswordDto) {
    try {
      const token = String(body.token || '').trim().toUpperCase();
      const userToken = await this.userTokenRepository.findOne({
        where: {
          token,
          status: userStatus.PENDING,
          type: userTokenType.FORGOT_PASSWORD,
        },
      });
      if (userToken) {
        userToken.status = userStatus.ACTIVE;
        await this.userTokenRepository.save(userToken);
        //reset password
        const user = await this.userRepository.createQueryBuilder('users')
          .where(" id = :userId", { userId: userToken.userKey })
          .addSelect("users.password")
          .getOne();
        const newUser = { ...user };
        const saltOrRounds = 10;
        const hash = await bcrypt.hash(body.password + config.PASSWORD_SALT, saltOrRounds);
        newUser.password = hash;
        newUser.updatedAt = new Date();
        await this.userRepository.save(newUser);
        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  /** Legacy availability check — usernames are not unique; always treat as available. */
  async checkUsername(_username: string) {
    return errorCode.NOT_FOUND;
  }

  async checkEmail(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: [{ email: email,status:userStatus.ACTIVE}], });
      if (user) {
        return errorCode.SUCCESS;
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async requestSignUp(body: RequestSignUpDto, ip: string) {
    const user = await this.userRepository.findOne({ where: [{ email: body.email,status:userStatus.ACTIVE }] });
    if (user) {
      return errorCode.EMAIL_EXIST
    }
    await this.userTokenRepository.update({ userKey: body.email, status: userStatus.PENDING, type: userTokenType.VERIFY_EMAIL }, { status: userStatus.REJECT });
    const newUserToken = new UserToken();
    newUserToken.token = makeOTP();
    const t = new Date();
    t.setHours(t.getHours() + 3);
    newUserToken.expired = new Date(t);
    newUserToken.createdAt = new Date();
    newUserToken.ip = ip;
    newUserToken.os = body.email;
    newUserToken.status = userStatus.PENDING;
    newUserToken.type = userTokenType.VERIFY_EMAIL;
    newUserToken.updatedAt = new Date();
    newUserToken.userKey = body.email;
    await this.userTokenRepository.save(newUserToken);
    const html = `
    <p>Hello ${body.email},</p>
    <p>The system has just created an OTP code to verify your account.</p>
    <p>Your confirmation code is <b>${newUserToken.token}</b></p>
    ${emailSupportFooterHtml()}`
    SendMail(body.email, "Account Verification", html);
    return { ...errorCode.SUCCESS };
  }

  async signUp(body: SignUpDto) {
    try {
      const userToken = await this.userTokenRepository.findOne({ where: { token: body.confirmToken, type: userTokenType.VERIFY_EMAIL, status: userStatus.PENDING } });
      if (!userToken) {
        return errorCode.NOT_FOUND;
      }
      if (userToken.expired < new Date()) {
        return errorCode.TOKEN_EXPIRED;
      }
      if (userToken.userKey.toLowerCase() !== body.email.toLowerCase()) {
        return errorCode.NOT_FOUND;
      }
      userToken.status = userStatus.ACTIVE;
      await this.userTokenRepository.save(userToken);

      if (body.email) {
        const userEmail = await this.userRepository.findOne({ where: { email: Raw(alias => `${alias} = :email and ${alias} is not null`, { email: body.email }), status: In([1, 2]) } });
        if (userEmail) {
          return errorCode.EMAIL_EXIST
        }
      }
      const user = new User();
      user.email = body.email.toLowerCase();
      user.username = uuidv4();
      user.password = body.password;
      if (body.fullName)
        user.fullName = `${body.fullName}`
      user.phone = body.phone;



      user.type = userType.CUSTOMER;
      user.createdAt = new Date();
      user.updatedAt = new Date();
      user.status = userStatus.ACTIVE;

      const result = await this.userRepository.save(user);
      if (!result) {

        return errorCode.EXCEPTION;
      }
      await this.userRepository.update(result.id, { updatedBy: result.id, createdBy: result.id })
      return { ...errorCode.SUCCESS };
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async confirmSignUp(token: string) {
    const userToken = await this.userTokenRepository.findOne({ where: { token, type: userTokenType.VERIFY_EMAIL, status: userStatus.PENDING } });
    if (!userToken) {
      return errorCode.NOT_FOUND;
    }
    if (userToken.expired < new Date()) {
      return errorCode.TOKEN_EXPIRED;
    }
    const user = await this.userRepository.findOne({ where: { id: parseFloat(userToken.userKey), type: userType.CUSTOMER } });
    if (user) {
      userToken.status = userStatus.ACTIVE;
      await this.userTokenRepository.save(userToken);
      user.status = userStatus.ACTIVE;
      const result = await this.userRepository.save(user);
      if (result) {

        return errorCode.SUCCESS;
      }
      return errorCode.EXCEPTION;
    }
  }

  async tryPassword(password: string) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash("" + password + config.PASSWORD_SALT, saltOrRounds);
    return { ...errorCode.SUCCESS, data: hash };
  }

  async updateUserRole(body: UpdateUserRoleDto) {
    try {
      if (body.userRoles && body.userRoles.length == 0) {
        return errorCode.NOT_FOUND;
      }
      await this.userRoleRepository.delete({ userId: body.userId })
      const userRoles = [];
      for (const roleId of body.userRoles) {
        const normalizedRoleId = this.normalizeRoleId(roleId);
        if (!normalizedRoleId) continue;
        const newItem = new UserRole();
        newItem.roleId = normalizedRoleId;
        newItem.createdAt = new Date();
        newItem.userId = body.userId;
        userRoles.push(newItem);
      }
      await this.userRoleRepository.save(userRoles);
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION
    }
  }

  async userCount(startDate?: Date, endDate?: Date) {
    const query = this.userRepository.createQueryBuilder('users')
      .andWhere("users.type =:type", { type: userType.CUSTOMER })
      .andWhere("users.status !=4")
    if (startDate && endDate) {
      query.andWhere('users.created_at >=:startDate and users.created_at <:endDate', { startDate: moment(startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(endDate).format("YYYY-MM-DD 23:59:59") })
    }
    return await query.getCount()
  }

  async getUsers() {
    const data = await this.userRepository.createQueryBuilder('users')
      .select(['users.id', 'users.username', 'users.fullName', 'users.phone', 'users.email', 'users.type'])
      .leftJoinAndSelect('users.customerInfo', 'customerInfo')
      .leftJoinAndSelect('customerInfo.company', 'customerOrg')
      .where('users.status=1').getMany();
    return { ...errorCode.SUCCESS, data };
  }

  /** Distinct organisations for site/task customer dropdowns (not individual contact names). */
  async getCustomerCompanies() {
    const companies = await this.userRepository.manager
      .getRepository(CustomerCompany)
      .find({ order: { name: 'ASC' } });
    const result: Array<{
      id: number;
      name: string;
      companyName: string;
      primaryUserId: number | null;
    }> = [];
    for (const cc of companies) {
      const primary = await this.userRepository
        .createQueryBuilder('users')
        .innerJoin('users.customerInfo', 'customerInfo')
        .where('customerInfo.company_id = :companyId', { companyId: cc.id })
        .andWhere('users.status = :active', { active: userStatus.ACTIVE })
        .orderBy('users.id', 'ASC')
        .getOne();
      result.push({
        id: cc.id,
        name: cc.name,
        companyName: cc.name,
        primaryUserId: primary?.id ?? null,
      });
    }
    return { ...errorCode.SUCCESS, data: result };
  }

  async getRolesById(id: number) {
    const query = this.userRepository.createQueryBuilder('users')
      .leftJoin('users.roles', 'roles').addSelect(["roles.roleId"])
      .where('users.id =:id', { id })

    const userId = await query.getOne();
    if (!userId)
      return []
    return userId.roles.map((r, i) => r.roleId)
  }

  async sendEmail() {
    const html = `<p>Password Retrieve Request</p>
    <p>Hello quybv90@gmail.com,</p>
    <p>The system has just created an OTP code to update the new password.</p>
    <p>Your confirmation code is <b>111</b></p>
    ${emailSupportFooterHtml()}`
    SendMail('quybv90@gmail.com', "Forgot Password", html);
    return errorCode.SUCCESS
  }


  private async purgeUserCoreRecords(manager: import('typeorm').EntityManager, userId: number) {
    try {
      await manager.query(
        `DELETE FROM public.user_task_customer_visibility WHERE user_id = $1`,
        [userId],
      );
      await manager.query(
        `DELETE FROM public.user_task_admin_visibility WHERE user_id = $1`,
        [userId],
      );
      await manager.query(
        `DELETE FROM public.report_fault_admin_visibility WHERE user_id = $1`,
        [userId],
      );
      await manager.query(
        `DELETE FROM public.report_fault_customer_visibility WHERE user_id = $1`,
        [userId],
      );
    } catch {
      /* table may not exist on older DBs */
    }
    await manager.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [userId]);
    await manager.query(`DELETE FROM public.user_groups WHERE user_id = $1`, [userId]);
    await manager.query(`DELETE FROM public.user_tokens WHERE user_key = $1`, [String(userId)]);
    await manager.query(`DELETE FROM public.staff WHERE user_id = $1`, [userId]);
    await manager.query(`DELETE FROM public.customers WHERE user_id = $1`, [userId]);
    await manager.query(`DELETE FROM public.users WHERE id = $1`, [userId]);
  }

  private async deleteUserTasksForCustomer(manager: import('typeorm').EntityManager, userId: number) {
    const userTaskRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.user_tasks WHERE customer_id = $1`,
      [userId],
    );
    for (const row of userTaskRows) {
      const taskId = +row.id;
      await manager.query(`DELETE FROM public.user_task_reports WHERE user_task_id = $1`, [taskId]);
      try {
        await manager.query(
          `UPDATE public.customer_admin_messages SET user_task_id = NULL WHERE user_task_id = $1`,
          [taskId],
        );
      } catch {
        /* optional */
      }
    }
    await manager.query(`DELETE FROM public.user_tasks WHERE customer_id = $1`, [userId]);
  }

  private async deleteUserTasksForStaff(manager: import('typeorm').EntityManager, userId: number) {
    const userTaskRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.user_tasks WHERE staff_id = $1`,
      [userId],
    );
    for (const row of userTaskRows) {
      const taskId = +row.id;
      await manager.query(`DELETE FROM public.user_task_reports WHERE user_task_id = $1`, [taskId]);
      try {
        await manager.query(
          `UPDATE public.customer_admin_messages SET user_task_id = NULL WHERE user_task_id = $1`,
          [taskId],
        );
      } catch {
        /* optional */
      }
    }
    await manager.query(`DELETE FROM public.user_tasks WHERE staff_id = $1`, [userId]);
  }

  private async deleteReportFaultsForUser(
    manager: import('typeorm').EntityManager,
    column: 'customer_id' | 'staff_id',
    userId: number,
  ) {
    const faultRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.report_faults WHERE ${column} = $1`,
      [userId],
    );
    for (const row of faultRows) {
      const faultId = +row.id;
      await manager.query(`DELETE FROM public.report_fault_answers WHERE report_fault_id = $1`, [faultId]);
      try {
        await manager.query(
          `UPDATE public.customer_admin_messages SET report_fault_id = NULL WHERE report_fault_id = $1`,
          [faultId],
        );
      } catch {
        /* optional */
      }
    }
    await manager.query(`DELETE FROM public.report_faults WHERE ${column} = $1`, [userId]);
  }

  private async deleteCustomerThreads(manager: import('typeorm').EntityManager, userId: number) {
    const threadRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.customer_admin_threads WHERE customer_id = $1`,
      [userId],
    );
    for (const row of threadRows) {
      const threadId = +row.id;
      const msgRows: Array<{ id: number }> = await manager.query(
        `SELECT id FROM public.customer_admin_messages WHERE thread_id = $1`,
        [threadId],
      );
      for (const msg of msgRows) {
        await manager.query(
          `DELETE FROM public.customer_admin_message_deletions WHERE message_id = $1`,
          [+msg.id],
        );
      }
      await manager.query(`DELETE FROM public.customer_admin_messages WHERE thread_id = $1`, [threadId]);
    }
    await manager.query(`DELETE FROM public.customer_admin_threads WHERE customer_id = $1`, [userId]);
  }

  private async deleteStaffThreads(manager: import('typeorm').EntityManager, userId: number) {
    const threadRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.customer_admin_threads WHERE staff_id = $1`,
      [userId],
    );
    for (const row of threadRows) {
      const threadId = +row.id;
      const msgRows: Array<{ id: number }> = await manager.query(
        `SELECT id FROM public.customer_admin_messages WHERE thread_id = $1`,
        [threadId],
      );
      for (const msg of msgRows) {
        await manager.query(
          `DELETE FROM public.customer_admin_message_deletions WHERE message_id = $1`,
          [+msg.id],
        );
      }
      await manager.query(`DELETE FROM public.customer_admin_messages WHERE thread_id = $1`, [threadId]);
    }
    await manager.query(`DELETE FROM public.customer_admin_threads WHERE staff_id = $1`, [userId]);
  }

  private async deleteTasksByStaff(manager: import('typeorm').EntityManager, staffId: number) {
    const taskRows: Array<{ id: number }> = await manager.query(
      `SELECT id FROM public.tasks WHERE staff_id = $1`,
      [staffId],
    );
    const taskIds = taskRows.map((r) => +r.id).filter((id) => Number.isFinite(id));
    if (!taskIds.length) {
      return;
    }
    await manager.query(
      `DELETE FROM public.task_shift_logs
       WHERE task_shift_id IN (
         SELECT ts.id FROM public.task_shifts ts WHERE ts.task_id = ANY($1::int[])
       )`,
      [taskIds],
    );
    await manager.query(`DELETE FROM public.task_shifts WHERE task_id = ANY($1::int[])`, [taskIds]);
    await manager.query(`DELETE FROM public.tasks WHERE id = ANY($1::int[])`, [taskIds]);
  }

  /**
   * Permanently removes one customer user and rows that reference that user id only.
   * Shared customer_companies and other customer accounts at the same company are kept.
   */
  private async hardDeleteCustomer(userInfo: IUserInfo, userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return errorCode.NOT_FOUND;
    }
    if (+user.type !== userType.CUSTOMER) {
      return { ...errorCode.VALIDATION_ERROR, message: 'User is not a customer account' };
    }

    try {
      await this.userRepository.manager.transaction(async (manager) => {
        const siteItemRows: Array<{ id: number }> = await manager.query(
          `SELECT id FROM public.site_items WHERE customer_id = $1`,
          [userId],
        );
        const siteItemIds = siteItemRows.map((r) => +r.id).filter((id) => Number.isFinite(id));

        if (siteItemIds.length) {
          await manager.query(
            `DELETE FROM public.site_item_staff_shifts
             WHERE site_item_staff_id IN (
               SELECT id FROM public.site_item_staffs WHERE site_item_id = ANY($1::int[])
             )`,
            [siteItemIds],
          );
          await manager.query(
            `DELETE FROM public.site_item_staffs WHERE site_item_id = ANY($1::int[])`,
            [siteItemIds],
          );
          await manager.query(
            `DELETE FROM public.task_shift_logs
             WHERE task_shift_id IN (
               SELECT ts.id FROM public.task_shifts ts
               INNER JOIN public.tasks t ON t.id = ts.task_id
               WHERE t.site_item_id = ANY($1::int[])
             )`,
            [siteItemIds],
          );
          await manager.query(
            `DELETE FROM public.task_shifts
             WHERE task_id IN (SELECT id FROM public.tasks WHERE site_item_id = ANY($1::int[]))`,
            [siteItemIds],
          );
          await manager.query(
            `DELETE FROM public.tasks WHERE site_item_id = ANY($1::int[])`,
            [siteItemIds],
          );
          await manager.query(
            `DELETE FROM public.site_items WHERE id = ANY($1::int[])`,
            [siteItemIds],
          );
        }

        await this.deleteUserTasksForCustomer(manager, userId);
        await this.deleteReportFaultsForUser(manager, 'customer_id', userId);

        const ticketRows: Array<{ id: number }> = await manager.query(
          `SELECT id FROM public.tickets WHERE customer_id = $1`,
          [userId],
        );
        for (const row of ticketRows) {
          await manager.query(`DELETE FROM public.ticket_answers WHERE ticket_id = $1`, [+row.id]);
        }
        await manager.query(`DELETE FROM public.tickets WHERE customer_id = $1`, [userId]);

        await this.deleteCustomerThreads(manager, userId);

        try {
          await manager.query(
            `UPDATE public.sites SET client_id = NULL WHERE client_id = $1`,
            [userId],
          );
        } catch {
          /* legacy column */
        }

        await this.purgeUserCoreRecords(manager, userId);
      });

      this.logger.info(`Customer user ${userId} permanently deleted by admin ${userInfo.userId}`);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(`hardDeleteCustomer ${userId}: ${(error as Error).message}`);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  /** Removes staff assignments and tasks for this staff id only; other staff unchanged. */
  private async hardDeleteStaff(userInfo: IUserInfo, userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return errorCode.NOT_FOUND;
    }
    if (+user.type !== userType.STAFF) {
      return { ...errorCode.VALIDATION_ERROR, message: 'User is not a staff account' };
    }

    try {
      await this.userRepository.manager.transaction(async (manager) => {
        const sisRows: Array<{ id: number }> = await manager.query(
          `SELECT id FROM public.site_item_staffs WHERE staff_id = $1`,
          [userId],
        );
        const sisIds = sisRows.map((r) => +r.id).filter((id) => Number.isFinite(id));
        if (sisIds.length) {
          await manager.query(
            `DELETE FROM public.site_item_staff_shifts WHERE site_item_staff_id = ANY($1::int[])`,
            [sisIds],
          );
          await manager.query(`DELETE FROM public.site_item_staffs WHERE id = ANY($1::int[])`, [sisIds]);
        }

        await this.deleteTasksByStaff(manager, userId);
        await this.deleteUserTasksForStaff(manager, userId);
        await this.deleteReportFaultsForUser(manager, 'staff_id', userId);
        await this.deleteStaffThreads(manager, userId);

        const dailyJobRows: Array<{ id: number }> = await manager.query(
          `SELECT id FROM public.user_daily_jobs WHERE staff_id = $1`,
          [userId],
        );
        const jobIds = dailyJobRows.map((r) => +r.id).filter((id) => Number.isFinite(id));
        if (jobIds.length) {
          await manager.query(
            `DELETE FROM public.user_daily_job_items WHERE user_daily_job_id = ANY($1::int[])`,
            [jobIds],
          );
          await manager.query(`DELETE FROM public.user_daily_jobs WHERE id = ANY($1::int[])`, [jobIds]);
        }

        try {
          await manager.query(
            `UPDATE public.report_templates SET assigned_staff_id = NULL WHERE assigned_staff_id = $1`,
            [userId],
          );
        } catch {
          /* optional column */
        }

        await this.purgeUserCoreRecords(manager, userId);
      });

      this.logger.info(`Staff user ${userId} permanently deleted by admin ${userInfo.userId}`);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(`hardDeleteStaff ${userId}: ${(error as Error).message}`);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  private async hardDeleteAdmin(userInfo: IUserInfo, userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return errorCode.NOT_FOUND;
    }
    if (+user.type !== userType.ADMIN) {
      return { ...errorCode.VALIDATION_ERROR, message: 'User is not an admin account' };
    }
    if (userId === 1 || user.username === 'admin') {
      return { ...errorCode.VALIDATION_ERROR, message: 'Cannot delete the primary admin account' };
    }

    try {
      await this.userRepository.manager.transaction(async (manager) => {
        await manager.query(`DELETE FROM public.ticket_answers WHERE user_id = $1`, [userId]);
        await this.purgeUserCoreRecords(manager, userId);
      });

      this.logger.info(`Admin user ${userId} permanently deleted by admin ${userInfo.userId}`);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(`hardDeleteAdmin ${userId}: ${(error as Error).message}`);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async delete(userInfo: IUserInfo, userId: number) {
    const info = await this.userRepository.findOne({ where: { id: userId } });
    if (!info) {
      return errorCode.NOT_FOUND;
    }
    if (+info.type === userType.CUSTOMER) {
      return this.hardDeleteCustomer(userInfo, userId);
    }
    if (+info.type === userType.STAFF) {
      return this.hardDeleteStaff(userInfo, userId);
    }
    if (+info.type === userType.ADMIN) {
      return this.hardDeleteAdmin(userInfo, userId);
    }
    return { ...errorCode.VALIDATION_ERROR, message: 'Unknown user type' };
  }

}
