import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { errorCode } from '../constants/errorCode';
import * as bcrypt from 'bcrypt';
import config from '../config';

@ApiTags('Admin')
@Controller({ path: 'admin', version: ['1'] })
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Post('update-credentials')
  async updateCredentials(@Body() body: { username: string; password: string }) {
    if (!body.username || !body.password) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Username and password are required.' };
    }
    // Find the admin user (type 3)
    const admin = await this.usersService.findAdminUser();
    if (!admin) {
      return { ...errorCode.NOT_FOUND, message: 'Admin user not found.' };
    }
    admin.username = body.username;
    admin.password = await bcrypt.hash(body.password + config.PASSWORD_SALT, parseInt(process.env.BCRYPT_SALT) || 10);
    await this.usersService.saveUser(admin);
    return { ...errorCode.SUCCESS, message: 'Admin credentials updated successfully.' };
  }
}
