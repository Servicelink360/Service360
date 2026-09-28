import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { User } from '../users/entities/user.entity';
import { TrainingModule } from './entities/training-module.entity';
import { TrainingTopic } from './entities/training-topic.entity';
import { TrainingQuestion } from './entities/training-question.entity';
import { TrainingProgress } from './entities/training-progress.entity';
import { TrainingQuizAttempt } from './entities/training-quiz-attempt.entity';
import { TrainingAssignment } from './entities/training-assignment.entity';
import { generateTrainingCertificatePdf } from './training-certificate';

const DEFAULT_PASS_PERCENT = 80;

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @InjectRepository(TrainingModule)
    private readonly modulesRepo: Repository<TrainingModule>,
    @InjectRepository(TrainingTopic)
    private readonly topicsRepo: Repository<TrainingTopic>,
    @InjectRepository(TrainingQuestion)
    private readonly questionsRepo: Repository<TrainingQuestion>,
    @InjectRepository(TrainingProgress)
    private readonly progressRepo: Repository<TrainingProgress>,
    @InjectRepository(TrainingQuizAttempt)
    private readonly attemptsRepo: Repository<TrainingQuizAttempt>,
    @InjectRepository(TrainingAssignment)
    private readonly assignmentsRepo: Repository<TrainingAssignment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private isAdmin(user: IUserInfo) {
    return +user.type === userType.ADMIN;
  }

  private staffOrAdmin(user: IUserInfo) {
    const t = +user.type;
    return t === userType.STAFF || t === userType.ADMIN;
  }

  private async staffSiteIds(staffId: number): Promise<number[]> {
    const rows = await this.modulesRepo.manager.query(
      `SELECT DISTINCT si.site_id AS "siteId"
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       WHERE sis.staff_id = $1 AND si.site_id IS NOT NULL`,
      [staffId],
    );
    return (rows || []).map((r: any) => +r.siteId).filter((n: number) => Number.isFinite(n));
  }

  /** Staff only see and complete training modules an admin assigned to them. */
  private async staffMayTakeModule(user: IUserInfo, module: TrainingModule): Promise<boolean> {
    if (+user.type !== userType.STAFF) return true;
    if (String(module.moduleKind || 'TRAINING').toUpperCase() === 'INDUCTION') return true;
    const siteIds = await this.staffSiteIds(+user.userId);
    const rows = await this.assignmentsRepo.find({ where: { moduleId: module.id } });
    return rows.some((a) => {
      if (a.staffId && +a.staffId === +user.userId) return true;
      if (!a.staffId && a.siteId && siteIds.includes(+a.siteId)) return true;
      if (!a.staffId && !a.siteId) return true;
      return false;
    });
  }

  private effectiveStatus(progress: TrainingProgress | undefined | null, module: TrainingModule) {
    if (!progress) return 'not_started';
    if (progress.status === 'passed' && progress.expiresAt) {
      if (new Date(progress.expiresAt).getTime() < Date.now()) {
        return 'expired';
      }
    }
    return progress.status || 'not_started';
  }

  private async syncExpiredStatus(progress: TrainingProgress, module: TrainingModule) {
    const status = this.effectiveStatus(progress, module);
    if (status === 'expired' && progress.status !== 'expired') {
      progress.status = 'expired';
      await this.progressRepo.save(progress);
    }
    return status;
  }

  private passPercentFor(module: TrainingModule) {
    return module.passPercent > 0 ? module.passPercent : DEFAULT_PASS_PERCENT;
  }

  async listModules(
    user: IUserInfo,
    opts?: { kind?: string },
  ) {
    if (!this.staffOrAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
    }
    const kind = String(opts?.kind || 'TRAINING').toUpperCase();
    const isStaff = +user.type === userType.STAFF;
    const siteIds = isStaff ? await this.staffSiteIds(+user.userId) : [];

    const qb = this.modulesRepo
      .createQueryBuilder('m')
      .where('m.status = 1')
      .andWhere('UPPER(m.module_kind) = :kind', { kind })
      .orderBy('m.sort_order', 'ASC')
      .addOrderBy('m.id', 'ASC');

    if (isStaff && kind === 'INDUCTION') {
      if (!siteIds.length) {
        return {
          ...errorCode.SUCCESS,
          data: { modules: [], summary: { total: 0, passed: 0, inProgress: 0, overdue: 0, expired: 0 } },
        };
      }
      qb.andWhere('(m.site_id IS NULL OR m.site_id IN (:...siteIds))', { siteIds });
    }

    const modules = await qb.getMany();
    const progressRows = await this.progressRepo.find({
      where: { userId: +user.userId },
    });
    const byModule = new Map(progressRows.map((p) => [+p.moduleId, p]));

    const assignments = await this.assignmentsRepo
      .createQueryBuilder('a')
      .where('a.module_id IN (:...ids)', {
        ids: modules.length ? modules.map((m) => m.id) : [0],
      })
      .getMany();

    const topicCounts = await this.topicsRepo
      .createQueryBuilder('t')
      .select('t.module_id', 'moduleId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.module_id')
      .getRawMany();
    const topicCountMap = new Map(
      topicCounts.map((r) => [+r.moduleId, +r.count]),
    );

    const data = [];
    for (const m of modules) {
      const p = byModule.get(+m.id);
      if (p) await this.syncExpiredStatus(p, m);
      const status = this.effectiveStatus(p, m);
      const topicTotal = topicCountMap.get(+m.id) || 0;
      const doneTopics = Array.isArray(p?.completedTopicIds)
        ? p!.completedTopicIds.length
        : 0;

      const myAssignments = assignments.filter((a) => {
        if (+a.moduleId !== +m.id) return false;
        if (!isStaff) return true;
        if (a.staffId && +a.staffId === +user.userId) return true;
        if (!a.staffId && a.siteId && siteIds.includes(+a.siteId)) return true;
        if (!a.staffId && !a.siteId) return true;
        return false;
      });
      const dueAt = myAssignments
        .map((a) => a.dueAt)
        .filter(Boolean)
        .sort((a, b) => +new Date(a!) - +new Date(b!))[0] || null;
      const overdue =
        !!dueAt &&
        status !== 'passed' &&
        new Date(dueAt).getTime() < Date.now();

      data.push({
        id: m.id,
        code: m.code,
        title: m.title,
        description: m.description,
        durationMins: m.durationMins,
        sortOrder: m.sortOrder,
        moduleKind: m.moduleKind,
        siteId: m.siteId,
        siteName: m.siteName,
        validityDays: m.validityDays,
        passPercent: this.passPercentFor(m),
        topicCount: topicTotal,
        assignment: dueAt
          ? { dueAt, overdue, notes: myAssignments[0]?.notes || null }
          : myAssignments[0]
            ? { dueAt: null, overdue: false, notes: myAssignments[0].notes }
            : null,
        progress: {
          status,
          completedTopics: doneTopics,
          topicTotal,
          quizAttempts: p?.quizAttempts || 0,
          bestScore: p?.bestScore ?? null,
          bestTotal: p?.bestTotal ?? null,
          percent:
            topicTotal > 0 ? Math.round((doneTopics / topicTotal) * 100) : 0,
          passedAt: p?.passedAt || null,
          expiresAt: p?.expiresAt || null,
          certificateUrl: p?.certificateUrl || null,
          certificateCode: p?.certificateCode || null,
        },
      });
    }

    const visible =
      isStaff && kind === 'TRAINING' ? data.filter((d) => d.assignment) : data;

    return {
      ...errorCode.SUCCESS,
      data: {
        modules: visible,
        summary: {
          total: visible.length,
          passed: visible.filter((d) => d.progress.status === 'passed').length,
          inProgress: visible.filter((d) =>
            ['in_progress', 'topics_done', 'failed'].includes(d.progress.status),
          ).length,
          overdue: visible.filter((d) => d.assignment?.overdue).length,
          expired: visible.filter((d) => d.progress.status === 'expired').length,
        },
      },
    };
  }

  async getModule(user: IUserInfo, moduleId: number) {
    if (!this.staffOrAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
    }
    const module = await this.modulesRepo.findOne({
      where: { id: moduleId, status: 1 },
    });
    if (!module) return errorCode.NOT_FOUND;

    if (+user.type === userType.STAFF && String(module.moduleKind).toUpperCase() === 'INDUCTION' && module.siteId) {
      const siteIds = await this.staffSiteIds(+user.userId);
      if (!siteIds.includes(+module.siteId)) {
        return { ...errorCode.EXCEPTION, message: 'This induction is for another site' };
      }
    }
    if (!(await this.staffMayTakeModule(user, module))) {
      return { ...errorCode.EXCEPTION, message: 'This module is not assigned to you' };
    }

    const topics = await this.topicsRepo.find({
      where: { moduleId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const questions = await this.questionsRepo.find({
      where: { moduleId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const quizQuestions = questions
      .filter((q) => !!q.correctKey)
      .map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        order: q.sortOrder,
      }));

    let progress = await this.progressRepo.findOne({
      where: { userId: +user.userId, moduleId },
    });
    if (!progress) {
      progress = this.progressRepo.create({
        userId: +user.userId,
        moduleId,
        status: 'not_started',
        completedTopicIds: [],
        quizAttempts: 0,
      });
      await this.progressRepo.save(progress);
    }
    const status = await this.syncExpiredStatus(progress, module);

    const completed = new Set(
      (progress.completedTopicIds || []).map((id) => +id),
    );
    const allTopicsDone =
      topics.length > 0 && topics.every((t) => completed.has(+t.id));
    // Expired must re-learn or at least re-test: unlock quiz only after topics done again
    // If expired, clear topic completion requirement: they can retake quiz after reviewing
    const unlockQuiz =
      status === 'passed' ||
      allTopicsDone ||
      (status === 'expired' && allTopicsDone);

    return {
      ...errorCode.SUCCESS,
      data: {
        module: {
          id: module.id,
          code: module.code,
          title: module.title,
          description: module.description,
          durationMins: module.durationMins,
          moduleKind: module.moduleKind,
          siteId: module.siteId,
          siteName: module.siteName,
          validityDays: module.validityDays,
          passPercent: this.passPercentFor(module),
        },
        topics: topics.map((t) => ({
          id: t.id,
          title: t.title,
          body: t.body,
          imageUrl: t.imageUrl || null,
          order: t.sortOrder,
          completed: completed.has(+t.id),
        })),
        quiz: {
          unlocked: unlockQuiz,
          questionCount: quizQuestions.length,
          passPercent: this.passPercentFor(module),
          questions: unlockQuiz ? quizQuestions : [],
        },
        progress: {
          status,
          completedTopicIds: progress.completedTopicIds || [],
          quizAttempts: progress.quizAttempts,
          bestScore: progress.bestScore,
          bestTotal: progress.bestTotal,
          startedAt: progress.startedAt,
          topicsCompletedAt: progress.topicsCompletedAt,
          passedAt: progress.passedAt,
          expiresAt: progress.expiresAt,
          certificateUrl: progress.certificateUrl,
          certificateCode: progress.certificateCode,
        },
      },
    };
  }

  async startModule(user: IUserInfo, moduleId: number) {
    if (!this.staffOrAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
    }
    const module = await this.modulesRepo.findOne({
      where: { id: moduleId, status: 1 },
    });
    if (!module) return errorCode.NOT_FOUND;
    if (!(await this.staffMayTakeModule(user, module))) {
      return { ...errorCode.EXCEPTION, message: 'This module is not assigned to you' };
    }

    let progress = await this.progressRepo.findOne({
      where: { userId: +user.userId, moduleId },
    });
    if (!progress) {
      progress = this.progressRepo.create({
        userId: +user.userId,
        moduleId,
        status: 'in_progress',
        completedTopicIds: [],
        quizAttempts: 0,
        startedAt: new Date(),
      });
    } else if (progress.status === 'not_started' || progress.status === 'expired') {
      // Refresh path: restart learning
      if (progress.status === 'expired') {
        progress.completedTopicIds = [];
        progress.topicsCompletedAt = null;
        progress.certificateUrl = null;
        progress.certificateCode = null;
        progress.passedAt = null;
        progress.expiresAt = null;
      }
      progress.status = 'in_progress';
      progress.startedAt = progress.startedAt || new Date();
    }
    await this.progressRepo.save(progress);
    return { ...errorCode.SUCCESS, data: progress };
  }

  async completeTopic(user: IUserInfo, moduleId: number, topicId: number) {
    if (!this.staffOrAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
    }
    const topic = await this.topicsRepo.findOne({
      where: { id: topicId, moduleId },
    });
    if (!topic) return errorCode.NOT_FOUND;
    const module = await this.modulesRepo.findOne({ where: { id: moduleId } });
    if (!module) return errorCode.NOT_FOUND;
    if (!(await this.staffMayTakeModule(user, module))) {
      return { ...errorCode.EXCEPTION, message: 'This module is not assigned to you' };
    }

    let progress = await this.progressRepo.findOne({
      where: { userId: +user.userId, moduleId },
    });
    if (!progress) {
      progress = this.progressRepo.create({
        userId: +user.userId,
        moduleId,
        status: 'in_progress',
        completedTopicIds: [],
        quizAttempts: 0,
        startedAt: new Date(),
      });
    }
    if (['not_started', 'expired'].includes(progress.status)) {
      if (progress.status === 'expired') {
        progress.completedTopicIds = [];
        progress.certificateUrl = null;
        progress.certificateCode = null;
        progress.passedAt = null;
        progress.expiresAt = null;
      }
      progress.status = 'in_progress';
      progress.startedAt = progress.startedAt || new Date();
    }

    const set = new Set((progress.completedTopicIds || []).map((id) => +id));
    set.add(+topicId);
    progress.completedTopicIds = Array.from(set);

    const allTopics = await this.topicsRepo.find({ where: { moduleId } });
    const allDone = allTopics.every((t) => set.has(+t.id));
    if (allDone && progress.status !== 'passed') {
      progress.status = 'topics_done';
      progress.topicsCompletedAt = progress.topicsCompletedAt || new Date();
    }
    await this.progressRepo.save(progress);
    return {
      ...errorCode.SUCCESS,
      data: {
        progress,
        quizUnlocked: allDone || progress.status === 'passed',
      },
    };
  }

  async submitQuiz(
    user: IUserInfo,
    moduleId: number,
    answers: { questionId: number; answerKey: string }[],
  ) {
    if (!this.staffOrAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff or admin only' };
    }
    const module = await this.modulesRepo.findOne({
      where: { id: moduleId, status: 1 },
    });
    if (!module) return errorCode.NOT_FOUND;
    if (!(await this.staffMayTakeModule(user, module))) {
      return { ...errorCode.EXCEPTION, message: 'This module is not assigned to you' };
    }

    let progress = await this.progressRepo.findOne({
      where: { userId: +user.userId, moduleId },
    });
    if (!progress) {
      return {
        ...errorCode.EXCEPTION,
        message: 'Start the module and complete topics before the quiz',
      };
    }

    const topics = await this.topicsRepo.find({ where: { moduleId } });
    const completed = new Set(
      (progress.completedTopicIds || []).map((id) => +id),
    );
    const allDone = topics.length > 0 && topics.every((t) => completed.has(+t.id));
    if (!allDone && progress.status !== 'passed') {
      return {
        ...errorCode.EXCEPTION,
        message: 'Complete all learning topics before taking the test',
      };
    }

    const questions = await this.questionsRepo.find({
      where: { moduleId },
      order: { sortOrder: 'ASC' },
    });
    const scored = questions.filter((q) => !!q.correctKey);
    if (!scored.length) {
      return { ...errorCode.EXCEPTION, message: 'No quiz questions configured' };
    }

    const answerMap = new Map(
      (answers || []).map((a) => [+a.questionId, String(a.answerKey || '').trim()]),
    );
    const graded = scored.map((q) => {
      const given = (answerMap.get(+q.id) || '').toUpperCase();
      const correct = String(q.correctKey).trim().toUpperCase();
      return {
        questionId: +q.id,
        answerKey: answerMap.get(+q.id) || '',
        correct: given === correct,
        correctKey: q.correctKey,
        prompt: q.prompt,
      };
    });
    const score = graded.filter((g) => g.correct).length;
    const total = graded.length;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const passPct = this.passPercentFor(module);
    const passed = percent >= passPct;

    const attempt = this.attemptsRepo.create({
      userId: +user.userId,
      moduleId,
      score,
      total,
      passed,
      answers: graded.map((g) => ({
        questionId: g.questionId,
        answerKey: g.answerKey,
        correct: g.correct,
      })),
    });
    await this.attemptsRepo.save(attempt);

    progress.quizAttempts = (progress.quizAttempts || 0) + 1;
    if (
      progress.bestScore == null ||
      score > progress.bestScore ||
      (score === progress.bestScore && (progress.bestTotal || 0) < total)
    ) {
      progress.bestScore = score;
      progress.bestTotal = total;
    }

    if (passed) {
      const now = new Date();
      progress.status = 'passed';
      progress.passedAt = now;
      if (module.validityDays && module.validityDays > 0) {
        const exp = new Date(now);
        exp.setDate(exp.getDate() + module.validityDays);
        progress.expiresAt = exp;
      } else {
        progress.expiresAt = null;
      }
      const certCode =
        progress.certificateCode ||
        `S360-${module.code}-${user.userId}-${Date.now().toString(36).toUpperCase()}`;
      progress.certificateCode = certCode;
      try {
        const staff = await this.usersRepo.findOne({ where: { id: +user.userId } });
        const url = await generateTrainingCertificatePdf({
          staffName: staff?.fullName || `Staff #${user.userId}`,
          moduleTitle: module.title,
          moduleCode: module.code,
          score,
          total,
          percent,
          passedAt: now,
          expiresAt: progress.expiresAt,
          certificateCode: certCode,
          kind: module.moduleKind,
        });
        progress.certificateUrl = url;
      } catch (e) {
        this.logger.warn(`certificate pdf failed: ${(e as Error).message}`);
      }
    } else if (progress.status !== 'passed') {
      progress.status = 'failed';
    }
    await this.progressRepo.save(progress);

    return {
      ...errorCode.SUCCESS,
      data: {
        passed,
        score,
        total,
        percent,
        passPercent: passPct,
        attemptId: attempt.id,
        progress,
        certificateUrl: progress.certificateUrl,
        certificateCode: progress.certificateCode,
        results: graded.map((g) => ({
          questionId: g.questionId,
          prompt: g.prompt,
          answerKey: g.answerKey,
          correct: g.correct,
          correctKey: g.correctKey,
        })),
      },
    };
  }

  // ??? Admin: answer keys ???????????????????????????????????????????

  async adminGetQuestions(user: IUserInfo, moduleId: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const module = await this.modulesRepo.findOne({ where: { id: moduleId } });
    if (!module) return errorCode.NOT_FOUND;
    const questions = await this.questionsRepo.find({
      where: { moduleId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const reviewed = questions.filter((q) => q.answerReviewed).length;
    return {
      ...errorCode.SUCCESS,
      data: {
        module: {
          id: module.id,
          code: module.code,
          title: module.title,
          moduleKind: module.moduleKind,
        },
        summary: {
          total: questions.length,
          withAnswer: questions.filter((q) => !!q.correctKey).length,
          reviewed,
          needsReview: questions.filter((q) => !!q.correctKey && !q.answerReviewed).length,
        },
        questions,
      },
    };
  }

  async adminUpdateQuestion(
    user: IUserInfo,
    questionId: number,
    body: { correctKey?: string; answerReviewed?: boolean; prompt?: string },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const q = await this.questionsRepo.findOne({ where: { id: questionId } });
    if (!q) return errorCode.NOT_FOUND;
    if (body.correctKey !== undefined) {
      q.correctKey = String(body.correctKey || '').trim() || null;
    }
    if (body.prompt !== undefined) q.prompt = String(body.prompt);
    if (body.answerReviewed !== undefined) {
      q.answerReviewed = !!body.answerReviewed;
      q.reviewedAt = q.answerReviewed ? new Date() : null;
      q.reviewedBy = q.answerReviewed ? +user.userId : null;
    }
    await this.questionsRepo.save(q);
    return { ...errorCode.SUCCESS, data: q };
  }

  async adminMarkAllReviewed(user: IUserInfo, moduleId: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    await this.questionsRepo
      .createQueryBuilder()
      .update(TrainingQuestion)
      .set({
        answerReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: +user.userId,
      })
      .where('module_id = :moduleId', { moduleId })
      .andWhere("correct_key IS NOT NULL AND TRIM(correct_key) <> ''")
      .execute();
    return this.adminGetQuestions(user, moduleId);
  }

  // ??? Admin: progress dashboard ????????????????????????????????????

  async adminProgressDashboard(user: IUserInfo, moduleId?: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const modules = await this.modulesRepo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC' },
    });
    const filterModules = moduleId
      ? modules.filter((m) => +m.id === +moduleId)
      : modules;

    const progress = await this.progressRepo
      .createQueryBuilder('p')
      .where(moduleId ? 'p.module_id = :moduleId' : '1=1', { moduleId })
      .getMany();

    const assignments = await this.assignmentsRepo.find();
    const staffIds = [
      ...new Set([
        ...progress.map((p) => +p.userId),
        ...assignments.filter((a) => a.staffId).map((a) => +a.staffId!),
      ]),
    ];
    const staff = staffIds.length
      ? await this.usersRepo.find({ where: { id: In(staffIds) } })
      : [];
    const staffMap = new Map(staff.map((s) => [+s.id!, s]));

    const rows = [];
    for (const m of filterModules) {
      const moduleProgress = progress.filter((p) => +p.moduleId === +m.id);
      for (const p of moduleProgress) {
        const status = this.effectiveStatus(p, m);
        const assign = assignments
          .filter((a) => +a.moduleId === +m.id && a.staffId && +a.staffId === +p.userId)
          .sort((a, b) => +new Date(a.dueAt || 0) - +new Date(b.dueAt || 0))[0];
        if (!assign) continue;
        const dueAt = assign?.dueAt || null;
        const overdue =
          !!dueAt && status !== 'passed' && new Date(dueAt).getTime() < Date.now();
        const u = staffMap.get(+p.userId);
        if (!u || +u.type !== userType.STAFF) continue;
        rows.push({
          moduleId: m.id,
          moduleCode: m.code,
          moduleTitle: m.title,
          moduleKind: m.moduleKind,
          siteName: m.siteName,
          staffId: p.userId,
          staffName: u?.fullName || `User #${p.userId}`,
          status,
          bestScore: p.bestScore,
          bestTotal: p.bestTotal,
          quizAttempts: p.quizAttempts,
          startedAt: p.startedAt,
          passedAt: p.passedAt,
          expiresAt: p.expiresAt,
          certificateUrl: p.certificateUrl,
          certificateCode: p.certificateCode,
          dueAt,
          overdue,
        });
      }
    }

    const summary = {
      modules: filterModules.length,
      learners: new Set(rows.map((r) => r.staffId)).size,
      passed: rows.filter((r) => r.status === 'passed').length,
      overdue: rows.filter((r) => r.overdue).length,
      expired: rows.filter((r) => r.status === 'expired').length,
      inProgress: rows.filter((r) =>
        ['in_progress', 'topics_done', 'failed'].includes(r.status),
      ).length,
    };

    return {
      ...errorCode.SUCCESS,
      data: { summary, rows, modules: filterModules },
    };
  }

  private async clearProgressIfUnassigned(staffId: number | null | undefined, moduleId: number) {
    const userId = +staffId;
    const modId = +moduleId;
    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(modId) || modId <= 0) return;
    const stillAssigned = await this.assignmentsRepo.count({
      where: { staffId: userId, moduleId: modId },
    });
    if (stillAssigned > 0) return;
    await this.attemptsRepo.delete({ userId, moduleId: modId });
    await this.progressRepo.delete({ userId, moduleId: modId });
  }

  async adminResetProgress(
    user: IUserInfo,
    body: { staffId?: number; moduleId?: number },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const staffId = +body.staffId;
    const moduleId = +body.moduleId;
    if (!Number.isFinite(staffId) || staffId <= 0 || !Number.isFinite(moduleId) || moduleId <= 0) {
      return { ...errorCode.EXCEPTION, message: 'Choose a staff member and module' };
    }
    await this.attemptsRepo.delete({ userId: staffId, moduleId });
    await this.progressRepo.delete({ userId: staffId, moduleId });
    return errorCode.SUCCESS;
  }

  // ??? Admin: assignments ???????????????????????????????????????????

  async adminListAssignments(user: IUserInfo, moduleId?: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC');
    if (moduleId) qb.where('a.module_id = :moduleId', { moduleId });
    const rows = await qb.getMany();
    const moduleIds = [...new Set(rows.map((r) => +r.moduleId))];
    const modules = moduleIds.length
      ? await this.modulesRepo.find({ where: { id: In(moduleIds) } })
      : [];
    const modMap = new Map(modules.map((m) => [+m.id, m]));
    const staffIds = rows.filter((r) => r.staffId).map((r) => +r.staffId!);
    const staff = staffIds.length
      ? await this.usersRepo.find({ where: { id: In(staffIds) } })
      : [];
    const staffMap = new Map(staff.map((s) => [+s.id!, s]));
    const topicCounts = moduleIds.length
      ? await this.topicsRepo
          .createQueryBuilder('t')
          .select('t.module_id', 'moduleId')
          .addSelect('COUNT(*)', 'count')
          .where('t.module_id IN (:...moduleIds)', { moduleIds })
          .groupBy('t.module_id')
          .getRawMany()
      : [];
    const topicCountMap = new Map(topicCounts.map((r) => [+r.moduleId, +r.count]));
    const progressRows = staffIds.length
      ? await this.progressRepo.find({ where: { userId: In([...new Set(staffIds)]) } })
      : [];

    return {
      ...errorCode.SUCCESS,
      data: rows.map((a) => {
        const module = modMap.get(+a.moduleId);
        const progress = a.staffId
          ? progressRows.find(
              (p) => +p.userId === +a.staffId! && +p.moduleId === +a.moduleId,
            )
          : undefined;
        const topicTotal = topicCountMap.get(+a.moduleId) || 0;
        const completedTopics = Array.isArray(progress?.completedTopicIds)
          ? progress!.completedTopicIds.length
          : 0;
        const progressStatus = module
          ? this.effectiveStatus(progress, module)
          : progress?.status || 'not_started';
        const progressPercent =
          progressStatus === 'passed'
            ? 100
            : topicTotal > 0
              ? Math.round((completedTopics / topicTotal) * 100)
              : 0;
        return {
          ...a,
          moduleTitle: module?.title,
          moduleCode: module?.code,
          staffName: a.staffId ? staffMap.get(+a.staffId)?.fullName : 'All staff',
          overdue:
            !!a.dueAt &&
            new Date(a.dueAt).getTime() < Date.now(),
          progressStatus,
          completedTopics,
          topicTotal,
          progressPercent,
          startedAt: progress?.startedAt || null,
          finishedAt:
            progress?.passedAt ||
            (completedTopics > 0 && completedTopics >= topicTotal
              ? progress?.topicsCompletedAt || null
              : null),
        };
      }),
    };
  }

  async adminCreateAssignment(
    user: IUserInfo,
    body: {
      moduleId?: number;
      moduleIds?: number[];
      staffId?: number | null;
      siteId?: number | null;
      siteName?: string | null;
      dueAt?: string | null;
      notes?: string | null;
    },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    if (!body.staffId) {
      return { ...errorCode.EXCEPTION, message: 'Choose a staff member' };
    }
    const moduleIds = [
      ...new Set(
        (Array.isArray(body.moduleIds) && body.moduleIds.length
          ? body.moduleIds
          : [body.moduleId]
        )
          .map((id) => +id)
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    if (!moduleIds.length) {
      return { ...errorCode.EXCEPTION, message: 'Choose at least one module' };
    }
    const modules = await this.modulesRepo.find({ where: { id: In(moduleIds) } });
    const byId = new Map(modules.map((m) => [+m.id, m]));
    for (const id of moduleIds) {
      const module = byId.get(id);
      if (!module) return errorCode.NOT_FOUND;
      if (
        +module.status !== 1 ||
        String(module.moduleKind || 'TRAINING').toUpperCase() !== 'TRAINING'
      ) {
        return { ...errorCode.EXCEPTION, message: 'Choose an active training module' };
      }
    }
    const existing = await this.assignmentsRepo.find({
      where: { staffId: +body.staffId },
    });
    const already = new Set(existing.map((a) => +a.moduleId));
    const freshIds = moduleIds.filter((id) => !already.has(id));
    if (!freshIds.length) {
      return {
        ...errorCode.EXCEPTION,
        message: 'Those modules are already assigned to this staff member',
      };
    }
    const rows = freshIds.map((moduleId) =>
      this.assignmentsRepo.create({
        moduleId,
        staffId: +body.staffId,
        siteId: body.siteId ? +body.siteId : null,
        siteName: body.siteName || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes || null,
        assignedBy: +user.userId,
      }),
    );
    const saved = await this.assignmentsRepo.save(rows);
    return { ...errorCode.SUCCESS, data: saved };
  }

  async adminUpdateAssignment(
    user: IUserInfo,
    id: number,
    body: {
      moduleId?: number;
      moduleIds?: number[];
      staffId?: number | null;
      siteId?: number | null;
      siteName?: string | null;
      dueAt?: string | null;
      notes?: string | null;
    },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const anchor = await this.assignmentsRepo.findOne({ where: { id } });
    if (!anchor) return errorCode.NOT_FOUND;
    if (!body.staffId) {
      return { ...errorCode.EXCEPTION, message: 'Choose a staff member' };
    }
    const moduleIds = [
      ...new Set(
        (Array.isArray(body.moduleIds) && body.moduleIds.length
          ? body.moduleIds
          : [body.moduleId]
        )
          .map((moduleId) => +moduleId)
          .filter((moduleId) => Number.isFinite(moduleId) && moduleId > 0),
      ),
    ];
    if (!moduleIds.length) {
      return { ...errorCode.EXCEPTION, message: 'Choose at least one module' };
    }
    const modules = await this.modulesRepo.find({ where: { id: In(moduleIds) } });
    const byId = new Map(modules.map((m) => [+m.id, m]));
    for (const moduleId of moduleIds) {
      const module = byId.get(moduleId);
      if (!module) return errorCode.NOT_FOUND;
      if (
        +module.status !== 1 ||
        String(module.moduleKind || 'TRAINING').toUpperCase() !== 'TRAINING'
      ) {
        return { ...errorCode.EXCEPTION, message: 'Choose an active training module' };
      }
    }

    const originalStaffId = +anchor.staffId;
    const newStaffId = +body.staffId;
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    const notes = body.notes || null;
    const selected = new Set(moduleIds);
    const existing = await this.assignmentsRepo.find({
      where: { staffId: originalStaffId },
    });
    const onTarget =
      newStaffId === originalStaffId
        ? existing
        : await this.assignmentsRepo.find({ where: { staffId: newStaffId } });
    const byModule = new Map(onTarget.map((row) => [+row.moduleId, row]));

    for (const row of existing) {
      if (!selected.has(+row.moduleId)) {
        await this.assignmentsRepo.delete({ id: row.id });
        if (byModule.get(+row.moduleId)?.id === row.id) byModule.delete(+row.moduleId);
        await this.clearProgressIfUnassigned(originalStaffId, +row.moduleId);
        continue;
      }
      const other = byModule.get(+row.moduleId);
      if (other && other.id !== row.id) {
        other.dueAt = dueAt;
        other.notes = notes;
        other.siteId = body.siteId ? +body.siteId : null;
        other.siteName = body.siteName || null;
        await this.assignmentsRepo.save(other);
        await this.assignmentsRepo.delete({ id: row.id });
        await this.clearProgressIfUnassigned(originalStaffId, +row.moduleId);
        continue;
      }
      row.staffId = newStaffId;
      row.siteId = body.siteId ? +body.siteId : null;
      row.siteName = body.siteName || null;
      row.dueAt = dueAt;
      row.notes = notes;
      byModule.set(+row.moduleId, await this.assignmentsRepo.save(row));
      if (newStaffId !== originalStaffId) {
        await this.clearProgressIfUnassigned(originalStaffId, +row.moduleId);
      }
    }

    for (const moduleId of moduleIds) {
      if (byModule.has(moduleId)) continue;
      const created = await this.assignmentsRepo.save(
        this.assignmentsRepo.create({
          moduleId,
          staffId: newStaffId,
          siteId: body.siteId ? +body.siteId : null,
          siteName: body.siteName || null,
          dueAt,
          notes,
          assignedBy: +user.userId,
        }),
      );
      byModule.set(moduleId, created);
    }
    return errorCode.SUCCESS;
  }

  async adminDeleteAssignment(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const row = await this.assignmentsRepo.findOne({ where: { id } });
    if (!row) return errorCode.NOT_FOUND;
    await this.assignmentsRepo.delete({ id });
    await this.clearProgressIfUnassigned(row.staffId, +row.moduleId);
    return errorCode.SUCCESS;
  }

  // ??? Admin: module settings (validity, kind, site induction) ??????

  async adminCreateModule(
    user: IUserInfo,
    body: {
      code?: string;
      title?: string;
      description?: string;
      moduleKind?: string;
      siteId?: number | null;
      siteName?: string | null;
      validityDays?: number | null;
      passPercent?: number;
    },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const code = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-');
    const title = String(body.title || '').trim();
    if (!code || !title) {
      return { ...errorCode.EXCEPTION, message: 'Code and title are required' };
    }
    const existing = await this.modulesRepo.findOne({ where: { code } });
    if (existing) {
      return { ...errorCode.EXCEPTION, message: 'That module code is already used' };
    }
    const last = await this.modulesRepo
      .createQueryBuilder('m')
      .select('MAX(m.sort_order)', 'max')
      .getRawOne();
    const saved = await this.modulesRepo.save(
      this.modulesRepo.create({
        code: code.slice(0, 40),
        title: title.slice(0, 255),
        description: String(body.description || '').trim(),
        durationMins: 20,
        sortOrder: (+last?.max || 0) + 1,
        status: 1,
        moduleKind:
          String(body.moduleKind || 'TRAINING').toUpperCase() === 'INDUCTION'
            ? 'INDUCTION'
            : 'TRAINING',
        siteId: body.siteId ? +body.siteId : null,
        siteName: body.siteName || null,
        validityDays:
          body.validityDays == null || Number.isNaN(+body.validityDays)
            ? 365
            : +body.validityDays,
        passPercent: +body.passPercent || 80,
      }),
    );
    await this.topicsRepo.save(
      this.topicsRepo.create({
        moduleId: saved.id,
        title: 'Welcome',
        body: 'Add the learning topics for this module.',
        sortOrder: 1,
      }),
    );
    return { ...errorCode.SUCCESS, data: saved };
  }

  async adminUpdateModule(
    user: IUserInfo,
    moduleId: number,
    body: {
      validityDays?: number | null;
      passPercent?: number;
      moduleKind?: string;
      siteId?: number | null;
      siteName?: string | null;
      title?: string;
      description?: string;
      status?: number;
    },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const module = await this.modulesRepo.findOne({ where: { id: moduleId } });
    if (!module) return errorCode.NOT_FOUND;
    if (body.validityDays !== undefined) {
      module.validityDays =
        body.validityDays == null || Number.isNaN(+body.validityDays)
          ? null
          : +body.validityDays;
    }
    if (body.passPercent !== undefined) module.passPercent = +body.passPercent || 80;
    if (body.moduleKind !== undefined) {
      module.moduleKind =
        String(body.moduleKind).toUpperCase() === 'INDUCTION'
          ? 'INDUCTION'
          : 'TRAINING';
    }
    if (body.siteId !== undefined) module.siteId = body.siteId ? +body.siteId : null;
    if (body.siteName !== undefined) module.siteName = body.siteName || null;
    if (body.title !== undefined) module.title = body.title;
    if (body.description !== undefined) module.description = body.description;
    if (body.status !== undefined) module.status = +body.status;
    await this.modulesRepo.save(module);
    return { ...errorCode.SUCCESS, data: module };
  }

  async adminGetTopics(user: IUserInfo, moduleId: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const module = await this.modulesRepo.findOne({ where: { id: moduleId } });
    if (!module) return errorCode.NOT_FOUND;
    const topics = await this.topicsRepo.find({
      where: { moduleId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return {
      ...errorCode.SUCCESS,
      data: {
        module: {
          id: module.id,
          code: module.code,
          title: module.title,
        },
        topics: topics.map((t) => ({
          id: t.id,
          title: t.title,
          body: t.body,
          imageUrl: t.imageUrl || null,
          order: t.sortOrder,
        })),
      },
    };
  }

  async adminUpdateTopic(
    user: IUserInfo,
    topicId: number,
    body: { title?: string; body?: string; imageUrl?: string | null; sortOrder?: number },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const topic = await this.topicsRepo.findOne({ where: { id: topicId } });
    if (!topic) return errorCode.NOT_FOUND;
    if (body.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) {
        return { ...errorCode.EXCEPTION, message: 'Title is required' };
      }
      topic.title = title.slice(0, 255);
    }
    if (body.body !== undefined) {
      topic.body = String(body.body || '');
    }
    if (body.imageUrl !== undefined) {
      const url = body.imageUrl == null ? null : String(body.imageUrl).trim();
      topic.imageUrl = url || null;
    }
    if (body.sortOrder !== undefined && Number.isFinite(+body.sortOrder)) {
      topic.sortOrder = +body.sortOrder;
    }
    await this.topicsRepo.save(topic);
    return {
      ...errorCode.SUCCESS,
      data: {
        id: topic.id,
        title: topic.title,
        body: topic.body,
        imageUrl: topic.imageUrl || null,
        order: topic.sortOrder,
      },
    };
  }

  /** One-time defaults for Gateway cartoon illustrations (site-relative public paths). */
  async ensureDefaultGatewayImages(): Promise<void> {
    try {
      const gateway = await this.modulesRepo.findOne({ where: { code: 'GATEWAY' } });
      if (!gateway) return;
      const defaults: Record<number, string> = {
        1: '/images/training/gateway/whs-responsibilities.png',
        2: '/images/training/gateway/risk-management.png',
        3: '/images/training/gateway/issue-resolution.png',
        4: '/images/training/gateway/your-responsibility.png',
        5: '/images/training/gateway/workplace-hazards.png',
        6: '/images/training/gateway/manual-handling-awareness.png',
        7: '/images/training/gateway/safe-lifting.png',
        8: '/images/training/gateway/ergonomics.png',
        9: '/images/training/gateway/workplace-stress.png',
        10: '/images/training/gateway/stress-tips.png',
        11: '/images/training/gateway/discrimination.png',
        12: '/images/training/gateway/discrimination-law.png',
        13: '/images/training/gateway/sexual-harassment.png',
        14: '/images/training/gateway/sexual-harassment-law.png',
        15: '/images/training/gateway/workplace-harassment.png',
        16: '/images/training/gateway/respond-harassment.png',
        17: '/images/training/gateway/bullying.png',
        18: '/images/training/gateway/not-bullying.png',
        19: '/images/training/gateway/module-complete.png',
      };
      const topics = await this.topicsRepo.find({
        where: { moduleId: gateway.id },
        order: { sortOrder: 'ASC' },
      });
      // Only seed defaults on first setup (no topic images yet). Never overwrite admin edits.
      if (topics.some((t) => !!t.imageUrl)) return;
      const updates = topics.filter((t) => defaults[t.sortOrder]);
      for (const t of updates) {
        t.imageUrl = defaults[t.sortOrder];
      }
      if (updates.length) {
        await this.topicsRepo.save(updates);
        this.logger.log(`training: set default Gateway images on ${updates.length} topics`);
      }
    } catch (e) {
      this.logger.warn(`ensureDefaultGatewayImages: ${(e as Error).message}`);
    }
  }

  async adminCreateSiteInduction(
    user: IUserInfo,
    body: { siteId: number; siteName: string; title?: string; sourceModuleId?: number },
  ) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const siteId = +body.siteId;
    if (!siteId) {
      return { ...errorCode.EXCEPTION, message: 'siteId required' };
    }
    const code = `IND-SITE-${siteId}`;
    const existing = await this.modulesRepo.findOne({ where: { code } });
    if (existing) {
      return { ...errorCode.SUCCESS, data: existing, message: 'Already exists' };
    }

    let source: TrainingModule | null = null;
    if (body.sourceModuleId) {
      source = await this.modulesRepo.findOne({
        where: { id: +body.sourceModuleId },
      });
    }
    if (!source) {
      source = await this.modulesRepo.findOne({
        where: { code: 'GATEWAY' },
      });
    }

    const saved = await this.modulesRepo.save(
      this.modulesRepo.create({
        code,
        title: body.title || `${body.siteName} � Site Induction`,
        description:
          source?.description ||
          `Site-specific induction for ${body.siteName}. Complete learning topics, then pass the assessment.`,
        durationMins: source?.durationMins || 30,
        sortOrder: 1000 + siteId,
        status: 1,
        moduleKind: 'INDUCTION',
        siteId,
        siteName: body.siteName,
        validityDays: source?.validityDays ?? 365,
        passPercent: source?.passPercent || 80,
        sourceFile: source?.sourceFile || null,
      }),
    );

    if (source) {
      const topics = await this.topicsRepo.find({
        where: { moduleId: source.id },
        order: { sortOrder: 'ASC' },
      });
      if (topics.length) {
        await this.topicsRepo.save(
          topics.map((t) =>
            this.topicsRepo.create({
              moduleId: saved.id,
              title: t.title,
              body: t.body,
              imageUrl: t.imageUrl || null,
              sortOrder: t.sortOrder,
            }),
          ),
        );
      }
      const questions = await this.questionsRepo.find({
        where: { moduleId: source.id },
        order: { sortOrder: 'ASC' },
      });
      if (questions.length) {
        await this.questionsRepo.save(
          questions.map((q) =>
            this.questionsRepo.create({
              moduleId: saved.id,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              correctKey: q.correctKey,
              answerReviewed: false,
              sortOrder: q.sortOrder,
            }),
          ),
        );
      }
    } else {
      await this.topicsRepo.save(
        this.topicsRepo.create({
          moduleId: saved.id,
          title: 'Welcome to site',
          body: `Complete this induction before working at ${body.siteName}. Your supervisor will confirm site-specific hazards, emergency exits, amenities, and reporting contacts.`,
          sortOrder: 1,
        }),
      );
      await this.questionsRepo.save(
        this.questionsRepo.create({
          moduleId: saved.id,
          type: 'TRUE_FALSE',
          prompt: `I understand the site-specific induction requirements for ${body.siteName}.`,
          options: [
            { key: 'TRUE', text: 'True' },
            { key: 'FALSE', text: 'False' },
          ],
          correctKey: 'TRUE',
          answerReviewed: true,
          reviewedAt: new Date(),
          reviewedBy: +user.userId,
          sortOrder: 1,
        }),
      );
    }

    return { ...errorCode.SUCCESS, data: saved };
  }

  async adminListModules(user: IUserInfo) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const modules = await this.modulesRepo.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const qStats = await this.questionsRepo
      .createQueryBuilder('q')
      .select('q.module_id', 'moduleId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN q.correct_key IS NOT NULL AND TRIM(q.correct_key) <> '' THEN 1 ELSE 0 END)`,
        'withAnswer',
      )
      .addSelect(
        `SUM(CASE WHEN q.answer_reviewed = true THEN 1 ELSE 0 END)`,
        'reviewed',
      )
      .groupBy('q.module_id')
      .getRawMany();
    const map = new Map(qStats.map((r) => [+r.moduleId, r]));
    return {
      ...errorCode.SUCCESS,
      data: modules.map((m) => {
        const s = map.get(+m.id);
        return {
          ...m,
          questionTotal: s ? +s.total : 0,
          questionWithAnswer: s ? +s.withAnswer : 0,
          questionReviewed: s ? +s.reviewed : 0,
        };
      }),
    };
  }

  async seedFromJsonIfEmpty(): Promise<void> {
    const count = await this.modulesRepo.count();
    if (count > 0) {
      this.logger.log(`training modules already present (${count})`);
      return;
    }
    const payload = this.loadSeedJson();
    if (!payload?.modules?.length) {
      this.logger.warn('training seed JSON missing or empty');
      return;
    }
    for (const mod of payload.modules) {
      const saved = await this.modulesRepo.save(
        this.modulesRepo.create({
          code: mod.code,
          title: mod.title,
          description: mod.description || '',
          durationMins: mod.durationMins || 30,
          sortOrder: mod.sortOrder ?? 0,
          status: 1,
          sourceFile: mod.sourceFile || null,
          moduleKind: 'TRAINING',
          validityDays: 365,
          passPercent: 80,
        }),
      );
      const topics = (mod.topics || []).map((t: any, i: number) =>
        this.topicsRepo.create({
          moduleId: saved.id,
          title: t.title,
          body: t.body,
          sortOrder: t.order ?? i + 1,
        }),
      );
      if (topics.length) await this.topicsRepo.save(topics);

      const questions = (mod.questions || [])
        .filter((q: any) => q.correctKey)
        .map((q: any, i: number) =>
          this.questionsRepo.create({
            moduleId: saved.id,
            type: q.type || 'MCQ',
            prompt: q.prompt,
            options: q.options || [],
            correctKey: q.correctKey,
            answerReviewed: false,
            sortOrder: q.order ?? i + 1,
          }),
        );
      if (questions.length) await this.questionsRepo.save(questions);
    }
    this.logger.log(`Seeded ${payload.modules.length} training modules`);
  }

  /**
   * Keep the crew catalogue, hide unrelated job modules,
   * and add cleaner, gardener, and roof and gutter training once.
   */
  async ensureCrewTrainingCatalogue(): Promise<void> {
    const hideCodes = ['M7', 'M8', 'M11', 'M13', 'M15', 'M16', 'M17'];
    const keepCodes = [
      'GATEWAY', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'CLEAN', 'GARDEN', 'ROOF',
    ];
    await this.modulesRepo
      .createQueryBuilder()
      .update()
      .set({ status: 0 })
      .where('code IN (:...codes)', { codes: hideCodes })
      .execute();
    await this.modulesRepo
      .createQueryBuilder()
      .update()
      .set({ status: 1 })
      .where('code IN (:...codes)', { codes: keepCodes })
      .execute();

    const catalogue: {
      code: string;
      title: string;
      description: string;
      durationMins: number;
      sortOrder: number;
      topics: { title: string; body: string }[];
      questions: { prompt: string; options: { key: string; text: string }[]; correctKey: string }[];
    }[] = [
      {
        code: 'CLEAN',
        title: 'Cleaner Safety',
        description:
          'Safety for cleaners: chemicals, wet floors, manual handling, sharps, electrical equipment, and working alone.',
        durationMins: 20,
        sortOrder: 30,
        topics: [
          {
            title: 'Welcome to cleaner safety',
            body: 'This module is for people who clean buildings, amenities, and work sites. Complete the generic Gateway training as well. This module covers the hazards you meet most often on a cleaning job.',
          },
          {
            title: 'Chemicals and safety data sheets',
            body: 'Use only the cleaning products supplied for the job. Read the label and the safety data sheet before you use a chemical. Wear the gloves and eye protection the sheet asks for. Never mix chemicals, especially bleach and anything acidic. Store chemicals upright, closed, and away from food. If you are splashed, follow the first-aid instructions on the sheet and tell your supervisor.',
          },
          {
            title: 'Wet floors, slips and trips',
            body: 'Wet floors are the most common cleaner injury. Put out warning signs before you mop, and leave them until the floor is dry. Keep leads, hoses, and buckets out of walkways. Mop towards an exit so you are not walking back over wet floor. Report torn mats, loose tiles, and poor lighting.',
          },
          {
            title: 'Manual handling and safe lifting',
            body: 'Buckets, bins, and vacuums are heavy when full. Do not fill a bucket more than you can carry comfortably. Bend your knees, keep the load close, and do not twist. Use a trolley for rubbish and linen. Ask for help with anything awkward, and empty bins before they overflow.',
          },
          {
            title: 'Sharps and biological waste',
            body: 'Do not pick up needles, glass, or unknown waste with bare hands. Use tongs or a dustpan and place sharps in a sharps container, never in a plastic rubbish bag. Wash your hands after cleaning toilets and amenities. Report blood or body-fluid spills and follow the site cleanup method. Cover cuts before you start work.',
          },
          {
            title: 'Electrical equipment',
            body: 'Check vacuums, polishers, and leads before you plug them in. Do not use equipment with a cut lead, cracked plug, or missing guard. Keep electrical equipment away from water unless it is rated for wet use. Unplug it before you change a bag or pad. Tell your supervisor and tag out anything that smells, sparks, or trips a safety switch.',
          },
          {
            title: 'Working alone on a site',
            body: 'If you are the only person on site, tell your supervisor when you arrive and when you leave. Keep your phone charged. Know the site exits and who to call in an emergency. Do not enter a locked or poorly lit area if you feel unsafe. Stop work and call if a person on site is threatening.',
          },
          {
            title: 'If you are injured',
            body: 'Stop work, get first aid, and tell your supervisor the same day, including near misses. Do not keep working through a back, wrist, or chemical injury. Note what you were doing and which product or area was involved.',
          },
          {
            title: 'Completion of Learning Section',
            body: 'You have covered the main hazards for cleaning work. Pass the short quiz to finish this module. On every job, look for wet floors, chemicals, sharps, and damaged equipment before you start.',
          },
        ],
        questions: [
          {
            prompt: 'When can you mix two cleaning chemicals together?',
            options: [
              { key: 'a', text: 'Whenever it cleans better' },
              { key: 'b', text: 'Never, unless the safety data sheet says that mix is safe' },
              { key: 'c', text: 'Only bleach and toilet cleaner' },
              { key: 'd', text: 'If you are wearing gloves' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'When should wet-floor signs be taken away?',
            options: [
              { key: 'a', text: 'As soon as you finish mopping' },
              { key: 'b', text: 'When the floor is dry' },
              { key: 'c', text: 'At the end of the shift only' },
              { key: 'd', text: 'They are optional' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'What do you do with a needle found while cleaning?',
            options: [
              { key: 'a', text: 'Put it in a plastic rubbish bag' },
              { key: 'b', text: 'Pick it up with your hands and wrap it' },
              { key: 'c', text: 'Use tongs or a dustpan and place it in a sharps container' },
              { key: 'd', text: 'Flush it down the toilet' },
            ],
            correctKey: 'c',
          },
          {
            prompt: 'A vacuum lead is cut. What should you do?',
            options: [
              { key: 'a', text: 'Tape it and keep using it' },
              { key: 'b', text: 'Stop using it, unplug it, and report it' },
              { key: 'c', text: 'Use it only on a dry floor' },
              { key: 'd', text: 'Hide it so the next shift can decide' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'You are working alone and feel unsafe. What should you do?',
            options: [
              { key: 'a', text: 'Finish the job quickly' },
              { key: 'b', text: 'Stop work and contact your supervisor' },
              { key: 'c', text: 'Wait until the next day to mention it' },
              { key: 'd', text: 'Only leave if someone tells you to' },
            ],
            correctKey: 'b',
          },
        ],
      },
      {
        code: 'GARDEN',
        title: 'Gardener Safety',
        description:
          'Safety for gardeners: sun and heat, manual handling, outdoor slips, sprays, and hand tools and mowers.',
        durationMins: 20,
        sortOrder: 31,
        topics: [
          {
            title: 'Welcome to gardener safety',
            body: 'This module is for people who maintain gardens, lawns, and outdoor areas. Complete the generic Gateway training as well. Outdoor work adds sun, uneven ground, tools, and sprays.',
          },
          {
            title: 'Sun, heat and outdoor work',
            body: 'Wear a hat, sunglasses, long sleeves where you can, and sunscreen. Drink water through the shift, not only when you feel thirsty. Take shade breaks in hot weather. Stop and tell your supervisor if you feel dizzy, sick, or confused. Cold and wet weather needs layers and footwear with grip.',
          },
          {
            title: 'Manual handling in the garden',
            body: 'Soil, green waste, and equipment are heavy when wet. Move smaller loads and use a barrow. Keep your back straight and the load close. Do not yank stuck hoses or lift above shoulder height if you can lower the job instead.',
          },
          {
            title: 'Slips, trips and uneven ground',
            body: 'Watch for wet grass, moss, hoses, and holes. Wear boots with grip. Do not run a mower or blower while walking backwards towards an edge. Coil hoses and leads out of paths when you finish.',
          },
          {
            title: 'Chemicals, sprays and fertilisers',
            body: 'Only use products you have been shown how to use. Read the label and safety data sheet. Wear the gloves, mask, and eye protection listed. Spray when the wind is light so the product does not drift onto people, food, or stormwater. Wash your hands before you eat.',
          },
          {
            title: 'Hand tools and mowers',
            body: 'Check blades, guards, and leads before you start. Keep hands and feet clear of blades. Stop the machine and wait until it is still before you clear a jam. Do not remove a guard. Wear hearing and eye protection for mowers, blowers, and line trimmers. Refuel only when the engine is off and cool.',
          },
          {
            title: 'Bites, stings and first aid',
            body: 'Look before you reach into shrubs, drains, and leaf piles. If you are stung or bitten, stop work and use the site first-aid steps. Tell your supervisor the same day if you feel unwell. Know if you have an allergy and carry the treatment you have been given.',
          },
          {
            title: 'Completion of Learning Section',
            body: 'You have covered sun, handling, slips, chemicals, and powered garden tools. Pass the short quiz to finish. Check the weather, your boots, and the guards on tools before you start.',
          },
        ],
        questions: [
          {
            prompt: 'What is the best way to reduce heat illness outdoors?',
            options: [
              { key: 'a', text: 'Work faster so you finish sooner' },
              { key: 'b', text: 'Water, shade breaks, hat, and light clothing' },
              { key: 'c', text: 'Drink only when you feel very thirsty' },
              { key: 'd', text: 'Remove your shirt to cool down' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'When can you clear a jammed mower blade?',
            options: [
              { key: 'a', text: 'While the engine is idling' },
              { key: 'b', text: 'After the machine is stopped and the blade is still' },
              { key: 'c', text: 'If you wear gloves and keep it running' },
              { key: 'd', text: 'By tipping it while it is running' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'Spray drift is most likely when:',
            options: [
              { key: 'a', text: 'The air is still and you follow the label' },
              { key: 'b', text: 'It is windy' },
              { key: 'c', text: 'You wear gloves' },
              { key: 'd', text: 'The product is in a closed container' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'A heavy bag of soil is easier to move safely by:',
            options: [
              { key: 'a', text: 'Carrying two bags at once' },
              { key: 'b', text: 'Using a barrow or splitting the load' },
              { key: 'c', text: 'Twisting quickly to save steps' },
              { key: 'd', text: 'Lifting it above your head' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'You are stung and feel unwell. What should you do?',
            options: [
              { key: 'a', text: 'Keep working and mention it next week' },
              { key: 'b', text: 'Stop, follow first aid, and tell your supervisor' },
              { key: 'c', text: 'Rub the sting with fertiliser' },
              { key: 'd', text: 'Ignore it if you cannot see a mark' },
            ],
            correctKey: 'b',
          },
        ],
      },
      {
        code: 'ROOF',
        title: 'Roof and Gutter Cleaner Safety',
        description:
          'Safety for roof and gutter cleaning: ladders, heights, weather, manual handling, and power lines.',
        durationMins: 25,
        sortOrder: 32,
        topics: [
          {
            title: 'Welcome to roof and gutter safety',
            body: 'Cleaning roofs and gutters is higher risk than ground cleaning. Complete the generic Gateway training as well. Do not start if you have not been shown the ladder and height method for that site.',
          },
          {
            title: 'Ladders',
            body: 'Use an industrial ladder that is long enough. Set it on firm, level ground at about a one-in-four angle. Secure the top. Keep three points of contact and do not overreach. Do not stand on the top rungs. A second person should foot the ladder where the ground is soft or the job is exposed. Inspect the ladder before use and do not use a bent or cracked one.',
          },
          {
            title: 'Working at heights',
            body: 'Stay on the ladder or an approved platform. Do not walk on fragile roofs, skylights, or polycarbonate sheets. If the job needs a harness or edge protection, do not start until that is in place and you have been trained to use it. Keep tools in a belt or bucket so you are not carrying them in one hand while you climb.',
          },
          {
            title: 'Weather and outdoor work',
            body: 'Do not work on a wet, icy, or very windy roof. Stop if rain starts or the surface becomes slippery. In heat, use sun protection and water, and come down for breaks. Lightning means you get down immediately.',
          },
          {
            title: 'Manual handling of debris',
            body: 'Wet leaves and silt are heavy. Clear gutters in small loads. Do not lean out with a full bucket. Lower debris with a bucket and rope or carry small amounts. Do not throw waste where people are walking below.',
          },
          {
            title: 'Power lines',
            body: 'Look up before you raise a ladder or pole. Keep well clear of overhead power lines. Do not touch a gutter or tool that is near a line. If you are unsure of the distance, stop and ask your supervisor. Never try to move a fallen line.',
          },
          {
            title: 'Slips on wet roofs and gutters',
            body: 'Moss, bird droppings, and wet metal are slippery. Wear boots with grip. Do not rush. If you cannot keep a stable stance, come down and report that the job needs another method.',
          },
          {
            title: 'If you are injured',
            body: 'A fall, even a short one, must be reported the same day. Do not climb back up if you are dizzy or in pain. Get first aid and tell your supervisor what happened, including near misses such as a ladder slip.',
          },
          {
            title: 'Completion of Learning Section',
            body: 'You have covered ladders, heights, weather, debris, and power lines. Pass the short quiz to finish. If the setup does not look safe, do not start.',
          },
        ],
        questions: [
          {
            prompt: 'When is it acceptable to stand on the top rung of a ladder?',
            options: [
              { key: 'a', text: 'If someone is footing it' },
              { key: 'b', text: 'Never' },
              { key: 'c', text: 'Only for a few seconds' },
              { key: 'd', text: 'If the gutter is just out of reach' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'A roof looks fragile or has skylights. What should you do?',
            options: [
              { key: 'a', text: 'Walk around the skylights carefully' },
              { key: 'b', text: 'Do not walk on it; use the approved method or stop' },
              { key: 'c', text: 'Go up only if you are light' },
              { key: 'd', text: 'Lay a towel over the sheet and walk on that' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'Overhead power lines are close to the gutter. You should:',
            options: [
              { key: 'a', text: 'Use a metal pole if you are careful' },
              { key: 'b', text: 'Stop and keep clear until your supervisor confirms it is safe' },
              { key: 'c', text: 'Work only in the morning' },
              { key: 'd', text: 'Touch the line with a wooden stick to test it' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'Rain starts while you are on a ladder. What should you do?',
            options: [
              { key: 'a', text: 'Finish the gutter quickly' },
              { key: 'b', text: 'Come down; wet roofs and ladders are slippery' },
              { key: 'c', text: 'Take your boots off for better feel' },
              { key: 'd', text: 'Keep going if the wind is light' },
            ],
            correctKey: 'b',
          },
          {
            prompt: 'How should wet gutter debris be brought down?',
            options: [
              { key: 'a', text: 'Thrown to the ground near the path' },
              { key: 'b', text: 'In small loads, lowered so people below are clear' },
              { key: 'c', text: 'Carried in both hands while you climb' },
              { key: 'd', text: 'Left on the roof for the rain to wash off' },
            ],
            correctKey: 'b',
          },
        ],
      },
    ];

    for (const mod of catalogue) {
      const existing = await this.modulesRepo.findOne({ where: { code: mod.code } });
      if (existing) continue;
      const saved = await this.modulesRepo.save(
        this.modulesRepo.create({
          code: mod.code,
          title: mod.title,
          description: mod.description,
          durationMins: mod.durationMins,
          sortOrder: mod.sortOrder,
          status: 1,
          moduleKind: 'TRAINING',
          validityDays: 365,
          passPercent: 80,
        }),
      );
      await this.topicsRepo.save(
        mod.topics.map((t, i) =>
          this.topicsRepo.create({
            moduleId: saved.id,
            title: t.title,
            body: t.body,
            sortOrder: i + 1,
          }),
        ),
      );
      await this.questionsRepo.save(
        mod.questions.map((q, i) =>
          this.questionsRepo.create({
            moduleId: saved.id,
            type: 'MCQ',
            prompt: q.prompt,
            options: q.options,
            correctKey: q.correctKey,
            answerReviewed: true,
            sortOrder: i + 1,
          }),
        ),
      );
      this.logger.log(`training: added module ${mod.code}`);
    }
  }

  async applyContentRevisions(): Promise<void> {
    const data = this.loadTrainingDataFile('content-revisions.json');
    if (!data) return;
    let updated = 0;
    for (const mod of data.modules || []) {
      const patch: { durationMins?: number; description?: string } = {};
      if (mod.durationMins) patch.durationMins = mod.durationMins;
      if (mod.description) patch.description = mod.description;
      if (Object.keys(patch).length) {
        await this.modulesRepo.update({ code: mod.code }, patch);
      }
    }
    const applyTopic = async (topic: {
      code: string;
      title?: string;
      sortOrder?: number;
      body?: string;
      imageUrl?: string;
    }) => {
      const mod = await this.modulesRepo.findOne({ where: { code: topic.code } });
      if (!mod) return;
      let row = topic.sortOrder
        ? await this.topicsRepo.findOne({
            where: { moduleId: mod.id, sortOrder: topic.sortOrder },
          })
        : null;
      if (!row && topic.title) {
        row = await this.topicsRepo.findOne({
          where: { moduleId: mod.id, title: topic.title },
        });
      }
      if (!row) return;
      let changed = false;
      if (topic.body && row.body.length < topic.body.length && row.body.trim() !== topic.body.trim()) {
        row.body = topic.body;
        changed = true;
      }
      if (topic.imageUrl && !row.imageUrl) {
        row.imageUrl = topic.imageUrl;
        changed = true;
      }
      if (changed) {
        await this.topicsRepo.save(row);
        updated += 1;
      }
    };
    for (const topic of data.topics || []) await applyTopic(topic);
    for (const topic of data.insertTopics || []) {
      const mod = await this.modulesRepo.findOne({ where: { code: topic.code } });
      if (!mod || !topic.title) continue;
      const existing = await this.topicsRepo.findOne({
        where: { moduleId: mod.id, title: topic.title },
      });
      if (existing) {
        await applyTopic(topic);
        continue;
      }
      await this.topicsRepo.save(
        this.topicsRepo.create({
          moduleId: mod.id,
          title: topic.title,
          body: topic.body,
          imageUrl: topic.imageUrl || null,
          sortOrder: topic.sortOrder || 0,
        }),
      );
      updated += 1;
    }
    if (updated) this.logger.log(`training: revised ${updated} topics`);
  }

  async assignMissingTopicImages(): Promise<void> {
    const data = this.loadTrainingDataFile('content-revisions.json');
    const rules: { test: string; src: string }[] = data?.imageRules || [];
    if (!rules.length) return;
    const topics = await this.topicsRepo.find();
    const pending = topics.filter((t) => !t.imageUrl);
    for (const topic of pending) {
      const title = String(topic.title || '');
      const hit = rules.find((rule) => new RegExp(rule.test, 'i').test(title));
      if (hit) topic.imageUrl = hit.src;
    }
    const changed = pending.filter((t) => !!t.imageUrl);
    if (changed.length) {
      await this.topicsRepo.save(changed);
      this.logger.log(`training: set images on ${changed.length} topics`);
    }
  }

  private loadTrainingDataFile(name: string): any {
    const candidates = [
      path.join(__dirname, 'data', name),
      path.join(__dirname, '..', '..', 'training', 'data', name),
      path.join(process.cwd(), 'dist', 'training', 'data', name),
      path.join(process.cwd(), 'dist', 'src', 'training', 'data', name),
      path.join(process.cwd(), 'src', 'training', 'data', name),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {
        this.logger.warn(`training data read failed ${p}: ${(e as Error).message}`);
      }
    }
    return null;
  }

  private loadSeedJson(): any {
    const candidates = [
      path.join(__dirname, 'data', 'training-modules.json'),
      path.join(__dirname, '..', '..', 'training', 'data', 'training-modules.json'),
      path.join(process.cwd(), 'dist', 'training', 'data', 'training-modules.json'),
      path.join(process.cwd(), 'dist', 'src', 'training', 'data', 'training-modules.json'),
      path.join(process.cwd(), 'src', 'training', 'data', 'training-modules.json'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          this.logger.log(`training seed loaded from ${p}`);
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
      } catch (e) {
        this.logger.warn(`training seed read failed ${p}: ${(e as Error).message}`);
      }
    }
    return null;
  }
}
