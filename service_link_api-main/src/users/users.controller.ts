import { Request, Body, Controller, Get, UseGuards, Post, Put, Query, Param, Res, Patch, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IUserInfo } from 'src/interfaces/IUserInfo';
import { ChangePasswordAdminDto, ChangePasswordDto } from './dto/change-password.dto';
import { ChangeProfileDto } from './dto/change-profile.dto';
import { UsersService } from './users.service';
import { customHttpCode } from 'src/helpers/util'
import { GetUsersDto } from './dto/get-users.dto';
import { IErrorData } from 'src/interfaces/IErrorData';
import { userType } from '../constants/user';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateCustomerNotificationDto } from './dto/update-customer-notification.dto';
@Controller({
    path: 'users',
    version: ['1'],
})
export class UsersController {
    constructor(private readonly userService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags("Users")
    @Get("profile")
    async profile(@Res() res, @Request() req) {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.profile(user.userId));
    }
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags("Users")
    @Put("changeProfile")
    async changeProfile(@Res() res, @Request() req, @Body() body: ChangeProfileDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.changeProfile(user.userId, body));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put("changePassword")
    @ApiTags("Users")
    async changePassword(@Res() res, @Request() req, @Body() body: ChangePasswordDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.changePassword(user, body));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags("Users")
    @Put("notificationSettings")
    async updateNotificationSettings(
        @Res() res,
        @Request() req,
        @Body() body: UpdateCustomerNotificationDto,
    ): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.updateCustomerNotificationSettings(user.userId, body));
    }



    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post("createUser")
    @ApiTags("Users")
    async createUser(@Res() res, @Request() req, @Body() body: CreateUserDto): Promise<IErrorData> {
        return customHttpCode(res, await this.userService.create(req.user as IUserInfo, body, userType.STAFF));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get()
    @ApiTags("Admins")
    async getAll(@Res() res, @Request() req, @Query() body: GetUsersDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        // if (+user.type !== userType.ADMIN) throw new UnauthorizedException();
        return customHttpCode(res, await this.userService.getAll(user, body));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post()
    @ApiTags("Admins")
    async create(@Res() res, @Request() req, @Body() body: CreateUserDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        // if (+user.type !== userType.ADMIN) throw new UnauthorizedException();
        return customHttpCode(res, await this.userService.create(user, body, userType.ADMIN));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Patch(":id")
    @ApiTags("Admins")
    async update(@Res() res, @Request() req, @Param('id') id: string, @Body() body: UpdateUserDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        // if (+user.type !== userType.ADMIN) throw new UnauthorizedException();
        return customHttpCode(res, await this.userService.update(user, +id, body));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put("changeStatus/:userId")
    @ApiTags("Admins")
    async changeStatus(@Res() res, @Request() req, @Param("userId") userId: number, @Body() body: ChangeStatusDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        // if (+user.type !== userType.ADMIN) throw new UnauthorizedException();
        return customHttpCode(res, await this.userService.changeStatus(+userId, +body.status));
    }


    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put("resetPassword")
    @ApiTags("Admins")
    async resetPassword(@Res() res, @Request() req, @Body() body: ChangePasswordAdminDto): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        // if (+user.type !== userType.ADMIN) throw new UnauthorizedException();
        return customHttpCode(res, await this.userService.changePasswordAdmin(body));
    }

    @Get("tryPassword")
    @ApiOperation({ summary: "Chỉ dành cho admin reset tài khoản " })
    async tryPassword(@Res() res, @Request() req): Promise<IErrorData> {
        return customHttpCode(res, await this.userService.tryPassword("123456"));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post("updateUserRole")
    @ApiTags("Users")
    async updateUserRole(@Res() res, @Request() req, @Body() body: UpdateUserRoleDto): Promise<IErrorData> {
        return customHttpCode(res, await this.userService.updateUserRole(body));
    }


    @Post("sendEmail")
    @ApiTags("Users")
    async sendEmail(@Res() res, @Request() req): Promise<IErrorData> {
        return customHttpCode(res, await this.userService.sendEmail());
    }


    @Delete(":id")
    @ApiTags("Users")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    async delete(@Res() res, @Request() req, @Param('id') id: string): Promise<IErrorData> {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.delete(user, +id));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post(':id/duplicate-customer')
    @ApiTags('Admins')
    async duplicateCustomer(@Res() res, @Request() req, @Param('id') id: string) {
        const user: IUserInfo = req.user;
        return customHttpCode(res, await this.userService.duplicateCustomer(user, +id));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post(':id/repair-customer')
    @ApiTags('Admins')
    async repairCustomer(@Res() res, @Param('id') id: string) {
        return customHttpCode(res, await this.userService.repairCustomerAccount(+id));
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('sync-customer-profiles')
    @ApiTags('Admins')
    async syncAllCustomers(@Res() res) {
        return customHttpCode(res, await this.userService.syncAllCustomerProfiles());
    }

}


