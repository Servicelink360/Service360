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

    return {
      ...errorCode.SUCCESS,
      data: {
        modules: data,
        summary: {
          total: data.length,
          passed: data.filter((d) => d.progress.status === 'passed').length,
          inProgress: data.filter((d) =>
            ['in_progress', 'topics_done', 'failed'].includes(d.progress.status),
          ).length,
          overdue: data.filter((d) => d.assignment?.overdue).length,
          expired: data.filter((d) => d.progress.status === 'expired').length,
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
          .filter((a) => +a.moduleId === +m.id && (!a.staffId || +a.staffId === +p.userId))
          .sort((a, b) => +new Date(a.dueAt || 0) - +new Date(b.dueAt || 0))[0];
        const dueAt = assign?.dueAt || null;
        const overdue =
          !!dueAt && status !== 'passed' && new Date(dueAt).getTime() < Date.now();
        const u = staffMap.get(+p.userId);
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

    return {
      ...errorCode.SUCCESS,
      data: rows.map((a) => ({
        ...a,
        moduleTitle: modMap.get(+a.moduleId)?.title,
        moduleCode: modMap.get(+a.moduleId)?.code,
        staffName: a.staffId ? staffMap.get(+a.staffId)?.fullName : 'All staff',
        overdue:
          !!a.dueAt &&
          new Date(a.dueAt).getTime() < Date.now(),
      })),
    };
  }

  async adminCreateAssignment(
    user: IUserInfo,
    body: {
      moduleId: number;
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
    const module = await this.modulesRepo.findOne({
      where: { id: +body.moduleId },
    });
    if (!module) return errorCode.NOT_FOUND;
    const row = this.assignmentsRepo.create({
      moduleId: +body.moduleId,
      staffId: body.staffId ? +body.staffId : null,
      siteId: body.siteId ? +body.siteId : null,
      siteName: body.siteName || null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      notes: body.notes || null,
      assignedBy: +user.userId,
    });
    await this.assignmentsRepo.save(row);
    return { ...errorCode.SUCCESS, data: row };
  }

  async adminDeleteAssignment(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    await this.assignmentsRepo.delete({ id });
    return errorCode.SUCCESS;
  }

  // ??? Admin: module settings (validity, kind, site induction) ??????

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
