import { Controller, Request, Post, UseGuards, Get, Body, Query, Res, Ip } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ForgotPassword2Dto, ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { errorCode } from 'src/constants/errorCode';
import { CheckEmailQueryDto } from './dto/check-email.dto';
import { CheckUsernameQueryDto } from './dto/check-username.dto';

import { customHttpCode } from 'src/helpers/util';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { GetTokenDto } from './dto/get-token.dto';
import { RequestSignUpDto } from './dto/request-sign-up.dto';
import { VerifyForgotPasswordDto } from './dto/verify-forgot-password-password.dto';
@ApiTags("Auth")
@Controller({
  path: 'auth',
  version: ['1'],
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @UseGuards(LocalAuthGuard)
  @Post('signIn')
  @ApiOperation({ summary: 'Username or Email' })
  async signIn(@Res() res, @Request() req, @Body() body: LoginDto) {
    if (!req.user.id) { return errorCode.NOT_FOUND; }
    return customHttpCode(res, await this.authService.signIn(req.user))
  }

  @Post("token")
  async token(@Res() res, @Body() body: GetTokenDto) {
    return customHttpCode(res, await this.authService.token(body.refresh_token))
  }

  @Get("checkUsername")
  @ApiOperation({ summary: '' })
  async checkUsername(@Res() res, @Query() params: CheckUsernameQueryDto) {
    return customHttpCode(res, await this.authService.checkUsername(params.username))
  }

  @Get("checkEmail")
  @ApiOperation({ summary: '' })
  async checkEmail(@Res() res, @Query() params: CheckEmailQueryDto) {
    return customHttpCode(res, await this.authService.checkEmail(params.email))
  }
  @ApiExcludeEndpoint()
  @Post("forgotPasswordAdmin")
  @ApiOperation({ summary: '' })
  async forgotPasswordAdmin(@Res() res, @Body() body: ForgotPasswordDto) {
    return customHttpCode(res, await this.authService.forgotPasswordAdmin(body))
  }
  @ApiExcludeEndpoint()
  @Post("forgotPassword")
  @ApiOperation({ summary: '' })
  async forgotPassword(@Res() res, @Body() body: ForgotPassword2Dto) {
    return customHttpCode(res, await this.authService.forgotPassword(body))
  }

  @ApiExcludeEndpoint()
  @Post("verifyOTPForgotPassword")
  @ApiOperation({ summary: '' })
  async verifyOTPForgotPassword(@Res() res, @Body() body: VerifyForgotPasswordDto) {
    return customHttpCode(res, await this.authService.verifyOTPForgotPassword(body))
  }
  @ApiExcludeEndpoint()
  @Post("resetPassword")
  @ApiOperation({ summary: '' })
  async resetPassword(@Res() res, @Body() body: ResetPasswordDto) {
    return customHttpCode(res, await this.authService.resetPassword(body))
  }
  @ApiExcludeEndpoint()
  @Post("verifyEmail")
  async verifyEmail(@Res() res, @Query('code') code: string) {
    return customHttpCode(res, await this.authService.verifyEmail(code));
  }
  @ApiExcludeEndpoint()
  @Post('requestSignUp')
  async requestSignUp(@Res() res, @Request() req, @Body() body: RequestSignUpDto, @Ip() ip) {
    return customHttpCode(res, await this.authService.requestSignUp(body, ip))
  }
  @ApiExcludeEndpoint()
  @Post('signUp')
  async signUp(@Res() res, @Body() body: SignUpDto) {
    return customHttpCode(res, await this.authService.signUp(body))
  }
  @ApiExcludeEndpoint()
  @Post("confirmSignUp")
  @ApiOperation({ summary: "Click đường dẫn trong Email và gọi API này xác nhận," })
  async confirmSignUp(@Res() res, @Body() body: VerifyTokenDto) {
    return customHttpCode(res, await this.authService.confirmSignUp(body));
  }

}