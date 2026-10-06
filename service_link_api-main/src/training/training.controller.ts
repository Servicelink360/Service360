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
  @Get('my-certificates')
  async myCertificates(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.listMyCertificates(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('modules/:id/resume')
  async saveResume(
    @Res() res,
    @Param('id') id: string,
    @Body() body: { currentTopicId?: number; quizDraft?: Record<string, string> },
    @Request() req,
  ) {
    return customHttpCode(res, await this.trainingService.saveResume(req.user, +id, body || {}));
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
  @Get('admin/certificate-templates')
  async adminListCertificateTemplates(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminListCertificateTemplates(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/certificate-templates')
  async adminSaveCertificateTemplate(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminSaveCertificateTemplate(req.user, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/certificate-templates/:id')
  async adminDeleteCertificateTemplate(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminDeleteCertificateTemplate(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/certificates/issued')
  async adminListIssuedCertificates(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminListIssuedCertificates(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/certificates/deleted')
  async adminListDeletedCertificates(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminListDeletedCertificates(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/certificates/:id/restore')
  async adminRestoreCertificate(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminRestoreCertificate(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/certificates/:id/permanent')
  async adminPurgeCertificate(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminPurgeCertificate(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/certificates')
  async adminListCertificates(@Res() res, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminListCertificates(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/certificates')
  async adminSaveCertificate(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminSaveCertificate(req.user, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/certificates/:id')
  async adminDeleteCertificate(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminDeleteCertificate(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/modules')
  async adminModules(@Res() res, @Query('deleted') deleted: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminListModules(req.user, deleted === '1'),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/modules/:id')
  async adminDeleteModule(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminDeleteModule(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/modules/:id/restore')
  async adminRestoreModule(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.trainingService.adminRestoreModule(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/modules')
  async adminCreateModule(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminCreateModule(req.user, body || {}),
    );
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
  @Get('admin/modules/:id/topics')
  async adminTopics(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminGetTopics(req.user, +id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/modules/:id/topics')
  async adminCreateTopic(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminCreateTopic(req.user, +id, body || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/topics/:id/move')
  async adminMoveTopic(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    const direction = body?.direction === 'down' ? 'down' : 'up';
    return customHttpCode(
      res,
      await this.trainingService.adminMoveTopic(req.user, +id, direction),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/topics/:id')
  async adminUpdateTopic(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminUpdateTopic(req.user, +id, body || {}),
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
  @Post('admin/progress/reset')
  async adminResetProgress(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(
      res,
      await this.trainingService.adminResetProgress(req.user, body || {}),
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
  @Patch('admin/assignments/:id')
  async adminUpdateAssignment(
    @Res() res,
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.trainingService.adminUpdateAssignment(req.user, +id, body || {}),
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
