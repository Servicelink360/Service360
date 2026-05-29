import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import config from './../config';
import { errorCode } from 'src/constants/errorCode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, } from 'typeorm';
import { ForgotPassword2Dto, ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Logger } from 'winston';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { redisKey } from '../constants/redisKey';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { RequestSignUpDto } from './dto/request-sign-up.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password-password.dto';
@Injectable()
export class AuthService {
  constructor(

    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,

    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,

    @Inject('winston') private readonly logger: Logger,

    @InjectRedis() private readonly redis: Redis,
  ) { }
  async validateUser(username: string, password: string, type: number, version: string) {
    return await this.usersService.validateUser(username, password, +type, version)
  }

  async signIn(user: User) {
    try {
      const payload = {
        username: user.username,
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        type: user.type,
        roleIds: user?.roles?.map((r, i) => r.roleId) || [],
        companyId: user.customerInfo?.companyId ?? null,
      };
      const accessToken = this.jwtService.sign(payload, { expiresIn: config.JWT_EXPIRES_IN, secret: config.JWT_SECRET_KEY } as JwtSignOptions);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: config.JWT_REFRESH_EXPIRES_IN, secret: config.JWT_REFRESH_SECRET_KEY } as JwtSignOptions);
      const cUser = { ...user }
      cUser.password = undefined;
      const result = {
        accessToken,
        refreshToken,
        user: cUser,
      };
      await this.userRepository.update(user.id, {
        lastLogin: new Date(),
        lastVersion: user.lastVersion,
      });
      const pipeline = this.redis.pipeline();
      pipeline.set(redisKey.USER_REFESH_TOKEN + ":" + refreshToken, JSON.stringify(result))
      pipeline.expire(redisKey.USER_REFESH_TOKEN + ":" + refreshToken, parseFloat(config.JWT_REFRESH_EXPIRES_IN.replace("s", "")))
      pipeline.set(redisKey.USER_LAST_TOKEN + ":" + user.id, accessToken)
      pipeline.set(redisKey.USER_TOKEN + ":" + accessToken, JSON.stringify(user))
      pipeline.expire(redisKey.USER_TOKEN + ":" + accessToken, parseFloat(config.JWT_EXPIRES_IN.replace("s", "")))
      pipeline.hset(redisKey.USERS, user.id, JSON.stringify(user));
      await pipeline.exec();
      return { ...errorCode.SUCCESS, data: result };
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async token(refreshToken: string) {
    try {
      const result = await this.redis.get(redisKey.USER_REFESH_TOKEN + ":" + refreshToken);
      if (result) {
        const data = JSON.parse(result);
        const payload = {
          username: data.email,
          sub: data.id,
          email: data.email,
          fullName: data.fullName,
          type: data.type,
          roleIds: data?.roles.map((r, i) => r.roleId),
          positionId:data.positionId,
        };
        const accessToken = this.jwtService.sign(payload, { expiresIn: config.JWT_EXPIRES_IN, secret: config.JWT_SECRET_KEY } as JwtSignOptions);
        const pipeline = this.redis.pipeline();
        pipeline.set(redisKey.USER_LAST_TOKEN + ":" + data.user.id, accessToken)
        pipeline.set(redisKey.USER_TOKEN + ":" + accessToken, JSON.stringify(data))
        pipeline.expire(redisKey.USER_TOKEN + ":" + accessToken, parseFloat(config.JWT_EXPIRES_IN.replace("s", "")))
        await pipeline.exec();
        const newData = { ...data };
        newData.accessToken = accessToken;
        newData.time = new Date();
        const t = new Date();
        t.setSeconds(t.getSeconds() + parseFloat(config.JWT_EXPIRES_IN.replace("s", "")));
        newData.time = new Date();
        newData.expired = new Date(t);
        return { ...errorCode.SUCCESS, data: newData };
      }
      return errorCode.NOT_FOUND;
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async forgotPassword(body: ForgotPassword2Dto) {
    try {
      return await this.usersService.forgotPassword(body)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async forgotPasswordAdmin(body: ForgotPasswordDto) {
    try {
      return await this.usersService.forgotPasswordAdmin(body)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async verifyOTPForgotPassword(body: VerifyForgotPasswordDto) {
    try {
      return await this.usersService.verifyOTPForgotPassword(body)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async resetPassword(body: ResetPasswordDto) {
    try {
      return await this.usersService.resetPassword(body)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }


  async checkUsername(username: string) {
    try {
      return await this.usersService.checkUsername(username)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async checkEmail(email: string) {
    try {
      return await this.usersService.checkEmail(email)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async verifyEmail(token: string) {
    return await this.usersService.verifyEmail(token);
  }

  async requestSignUp(body: RequestSignUpDto, ipAddress: string) {
    try {
      return await this.usersService.requestSignUp(body, ipAddress)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async signUp(body: SignUpDto) {
    try {
      return await this.usersService.signUp(body)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async confirmSignUp(body: VerifyTokenDto) {
    try {
      return await this.usersService.confirmSignUp(body.confirmToken)
    } catch (error) {
      console.log(error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }
}

