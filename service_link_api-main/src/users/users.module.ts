import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserToken } from './entities/user-token.entity';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { AuthModule } from 'src/auth/auth.module';
import { UserRole } from './entities/user-role.entity';
import { HttpModule } from '@nestjs/axios';
import {  UserGroup } from './entities/user-group.entity';
import { Customer } from './entities/customer.entity';
import { CustomerCompany } from './entities/customer-company.entity';
import { Staff } from './entities/staff.entity';
import { SettingsModule } from '../settings/settings.module';
import { UsersCustomerSyncBootstrap } from './users-customer-sync.bootstrap';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken, UserRole, UserGroup, Customer, CustomerCompany, Staff]),
    forwardRef(() => AuthModule),
    forwardRef(() => SettingsModule),
    HttpModule.register({
      timeout: 600000,
      maxRedirects: 5,
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, UsersCustomerSyncBootstrap],
  exports: [UsersService],
})
export class UsersModule { }
