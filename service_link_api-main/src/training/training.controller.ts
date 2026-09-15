import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { TrainingService } from './training.service';

@ApiTags('Training')
@Controller({
  path: 'training',
  version: ['1'],
})
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('modules')
  async listModules(
    @Res() res,
    @Request() req,
    @Query('kind') kind?: string,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.trainingService.listModules(user, { kind }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('modules/:id')
  async getModule(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.trainingService.getModule(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('modules/:id/start')
  async start(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.trainingService.startModule(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('modules/:id/topics/:topicId/complete')
  async completeTopic(
    @Res() res,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.trainingService.completeTopic(user, +id, +topicId),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('modules/:id/quiz/submit')
  async submitQuiz(
    @Res() res,
    @Param('id') id: string,
    @Body() body: { answers?: { questionId: number; answerKey: string }[] },
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.trainingService.submitQuiz(user, +id, body?.answers || []),
    );
  }

  // Admin
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/modules')
  async adminModules(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminListModules(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/modules/:id')
  async adminUpdateModule(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminUpdateModule(req.user, +id, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/modules/:id/questions')
  async adminQuestions(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminGetQuestions(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/questions/:id')
  async adminUpdateQuestion(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminUpdateQuestion(req.user, +id, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/modules/:id/questions/mark-reviewed')
  async adminMarkReviewed(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminMarkAllReviewed(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/progress')
  async adminProgress(
    @Res() res,
    @Request() req,
    @Query('moduleId') moduleId?: string,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminProgressDashboard(
        req.user,
        moduleId ? +moduleId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/assignments')
  async adminAssignments(
    @Res() res,
    @Request() req,
    @Query('moduleId') moduleId?: string,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminListAssignments(
        req.user,
        moduleId ? +moduleId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/assignments')
  async adminCreateAssignment(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminCreateAssignment(req.user, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/assignments/:id')
  async adminDeleteAssignment(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminDeleteAssignment(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/site-inductions')
  async adminCreateSiteInduction(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminCreateSiteInduction(req.user, body || {}),
    );
  }
}
