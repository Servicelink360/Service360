import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { User } from '../users/entities/user.entity';
import { ToolboxAttendance } from './entities/toolbox-attendance.entity';
import { ToolboxSignoff } from './entities/toolbox-signoff.entity';
import { ToolboxSession } from './entities/toolbox-session.entity';
import { ToolboxTalk } from './entities/toolbox-talk.entity';
import { generateToolboxRecordPdf } from './toolbox-record-pdf';
import { TOOLBOX_SEEDS } from './toolbox-talks.seed';

@Injectable()
export class ToolboxService {
  private readonly logger = new Logger(ToolboxService.name);

  constructor(
    @InjectRepository(ToolboxTalk)
    private readonly talksRepo: Repository<ToolboxTalk>,
    @InjectRepository(ToolboxSession)
    private readonly sessionsRepo: Repository<ToolboxSession>,
    @InjectRepository(ToolboxAttendance)
    private readonly attendanceRepo: Repository<ToolboxAttendance>,
    @InjectRepository(ToolboxSignoff)
    private readonly signoffRepo: Repository<ToolboxSignoff>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private isAdmin(user: IUserInfo) {
    return +user.type === userType.ADMIN;
  }

  private isStaffOrAdmin(user: IUserInfo) {
    const t = +user.type;
    return t === userType.STAFF || t === userType.ADMIN;
  }

  async ensureSeedTalks(): Promise<void> {
    for (const seed of TOOLBOX_SEEDS) {
      const existing = await this.talksRepo.findOne({ where: { code: seed.code } });
      if (!existing) {
        await this.talksRepo.save(
          this.talksRepo.create({
            code: seed.code,
            title: seed.title,
            brief: seed.brief,
            points: seed.points,
            durationMins: seed.durationMins,
            sortOrder: seed.sortOrder,
            imageUrl: seed.imageUrl || null,
            status: 1,
          }),
        );
        this.logger.log(`toolbox: added talk ${seed.code}`);
        continue;
      }
      let changed = false;
      if ((existing.brief || '').length < seed.brief.length) {
        existing.title = seed.title;
        existing.brief = seed.brief;
        existing.points = seed.points;
        existing.durationMins = seed.durationMins;
        changed = true;
      }
      if (!existing.imageUrl && seed.imageUrl) {
        existing.imageUrl = seed.imageUrl;
        changed = true;
      }
      if (changed) {
        await this.talksRepo.save(existing);
        this.logger.log(`toolbox: updated talk ${seed.code}`);
      }
    }
  }

  async listTalks(user: IUserInfo) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const rows = await this.talksRepo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    const mine = await this.signoffRepo.find({ where: { staffId: +user.userId, deletedAt: IsNull() } });
    const signedByTalk = new Map(mine.map((row) => [+row.talkId, row]));
    const data = rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      brief: row.brief,
      durationMins: row.durationMins,
      imageUrl: row.imageUrl,
      status: row.status,
      signedAt: signedByTalk.get(+row.id)?.signedAt || null,
      signatureName: signedByTalk.get(+row.id)?.signatureName || '',
      signoffId: signedByTalk.get(+row.id)?.id || null,
      minutes: signedByTalk.get(+row.id)?.minutes || '',
      formTitle: signedByTalk.get(+row.id)?.formTitle || '',
      printedName: signedByTalk.get(+row.id)?.printedName || '',
    }));
    return { ...errorCode.SUCCESS, data };
  }

  async adminListTalks(user: IUserInfo) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const rows = await this.talksRepo.find({ order: { sortOrder: 'ASC', title: 'ASC' } });
    const counts = await this.signoffRepo
      .createQueryBuilder('s')
      .select('s.talk_id', 'talkId')
      .addSelect('COUNT(*)', 'count')
      .where('s.deleted_at IS NULL')
      .groupBy('s.talk_id')
      .getRawMany();
    const countByTalk = new Map(counts.map((row) => [+(row.talkId ?? row.talkid), +row.count || 0]));
    return {
      ...errorCode.SUCCESS,
      data: rows.map((row) => ({ ...row, signoffCount: countByTalk.get(+row.id) || 0 })),
    };
  }

  async signTalk(user: IUserInfo, talkId: number, signatureName: string) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const name = String(signatureName || '').trim();
    if (!name) return { ...errorCode.VALIDATION_ERROR, message: 'Enter your name to sign' };
    const talk = await this.talksRepo.findOne({ where: { id: talkId, status: 1 } });
    if (!talk) return { ...errorCode.NOT_FOUND, message: 'Talk not found' };
    const now = new Date();
    let signoff = await this.signoffRepo.findOne({
      where: { talkId, staffId: +user.userId },
    });
    if (!signoff) {
      signoff = this.signoffRepo.create({
        talkId,
        staffId: +user.userId,
        signatureName: name,
        signedAt: now,
        minutes: talk.brief,
      });
    } else if (signoff.deletedAt) {
      signoff.deletedAt = null;
      signoff.signedAt = now;
      signoff.signatureName = name;
      if (!signoff.minutes) signoff.minutes = talk.brief;
    } else if (!signoff.signedAt) {
      signoff.signedAt = now;
      signoff.signatureName = name;
      if (!signoff.minutes) signoff.minutes = talk.brief;
    }
    await this.signoffRepo.save(signoff);
    const sessions = await this.sessionsRepo.find({ where: { talkId } });
    if (sessions.length) {
      const rows = await this.attendanceRepo.find({
        where: { staffId: +user.userId, sessionId: In(sessions.map((session) => session.id)) },
      });
      for (const row of rows) {
        if (!row.acknowledgedAt) row.acknowledgedAt = now;
        if (!row.signatureName) row.signatureName = name;
      }
      if (rows.length) await this.attendanceRepo.save(rows);
    }
    return {
      ...errorCode.SUCCESS,
      data: { signedAt: signoff.signedAt, signatureName: signoff.signatureName },
    };
  }

  private async uniqueCode(title: string) {
    const base = String(title || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 20) || 'TALK';
    let code = base;
    let n = 2;
    while (await this.talksRepo.findOne({ where: { code } })) {
      code = `${base.slice(0, 16)}${n}`;
      n += 1;
    }
    return code;
  }

  async adminCreateTalk(
    user: IUserInfo,
    body: { title?: string; brief?: string; points?: string[]; durationMins?: number },
  ) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const title = String(body.title || '').trim();
    const brief = String(body.brief || '').trim();
    if (!title || !brief) return { ...errorCode.VALIDATION_ERROR, message: 'Enter a title and a brief' };
    const max = await this.talksRepo
      .createQueryBuilder('t')
      .select('MAX(t.sortOrder)', 'max')
      .getRawOne();
    const talk = await this.talksRepo.save(
      this.talksRepo.create({
        code: await this.uniqueCode(title),
        title,
        brief,
        points: Array.isArray(body.points) ? body.points.map((p) => String(p).trim()).filter(Boolean) : [],
        durationMins: Number.isFinite(+body.durationMins) ? +body.durationMins : 10,
        sortOrder: (+max?.max || 0) + 1,
        status: 1,
      }),
    );
    return { ...errorCode.SUCCESS, data: talk };
  }

  async adminDeleteTalk(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const used = await this.sessionsRepo.count({ where: { talkId: id } });
    if (used) {
      return { ...errorCode.CAN_NOT_DELETE, message: 'This talk has sessions. Delete those sessions first.' };
    }
    await this.talksRepo.delete({ id });
    return { ...errorCode.SUCCESS, data: true };
  }

  async adminUpdateTalk(
    user: IUserInfo,
    id: number,
    body: { title?: string; brief?: string; points?: string[]; durationMins?: number; status?: number },
  ) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const talk = await this.talksRepo.findOne({ where: { id } });
    if (!talk) return { ...errorCode.NOT_FOUND, message: 'Talk not found' };
    if (body.title !== undefined) talk.title = String(body.title).trim() || talk.title;
    if (body.brief !== undefined) talk.brief = String(body.brief);
    if (Array.isArray(body.points)) {
      talk.points = body.points.map((p) => String(p).trim()).filter(Boolean);
    }
    if (body.durationMins !== undefined && Number.isFinite(+body.durationMins)) {
      talk.durationMins = +body.durationMins;
    }
    if (body.status !== undefined) talk.status = +body.status === 0 ? 0 : 1;
    await this.talksRepo.save(talk);
    return { ...errorCode.SUCCESS, data: talk };
  }

  async createSession(
    user: IUserInfo,
    body: {
      talkId?: number;
      siteId?: number | null;
      siteName?: string | null;
      deliveredAt?: string;
      notes?: string;
      minutes?: string;
      staffIds?: number[];
    },
  ) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const talk = await this.talksRepo.findOne({ where: { id: +body.talkId, status: 1 } });
    if (!talk) return { ...errorCode.NOT_FOUND, message: 'Talk not found' };
    const staffIds = Array.from(
      new Set((body.staffIds || []).map((id) => +id).filter((id) => Number.isFinite(id) && id > 0)),
    );
    if (!staffIds.length) return { ...errorCode.VALIDATION_ERROR, message: 'Choose at least one person' };
    const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : new Date();
    if (Number.isNaN(deliveredAt.getTime())) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Enter a valid date' };
    }
    const session = await this.sessionsRepo.save(
      this.sessionsRepo.create({
        talkId: talk.id,
        siteId: body.siteId ? +body.siteId : null,
        siteName: body.siteName ? String(body.siteName).trim() : null,
        deliveredBy: +user.userId || null,
        deliveredAt,
        notes: body.notes ? String(body.notes).trim() : null,
        minutes: body.minutes != null && String(body.minutes).trim() ? String(body.minutes) : talk.brief,
      }),
    );
    await this.attendanceRepo.save(
      staffIds.map((staffId) =>
        this.attendanceRepo.create({ sessionId: session.id, staffId, acknowledgedAt: null }),
      ),
    );
    return { ...errorCode.SUCCESS, data: { id: session.id } };
  }

  async updateSession(
    user: IUserInfo,
    id: number,
    body: {
      talkId?: number;
      siteId?: number | null;
      siteName?: string | null;
      deliveredAt?: string;
      notes?: string;
      minutes?: string;
      staffIds?: number[];
    },
  ) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    const talk = await this.talksRepo.findOne({ where: { id: +body.talkId, status: 1 } });
    if (!talk) return { ...errorCode.NOT_FOUND, message: 'Talk not found' };
    const staffIds = Array.from(
      new Set((body.staffIds || []).map((staffId) => +staffId).filter((staffId) => Number.isFinite(staffId) && staffId > 0)),
    );
    if (!staffIds.length) return { ...errorCode.VALIDATION_ERROR, message: 'Choose at least one person' };
    const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : session.deliveredAt;
    if (Number.isNaN(deliveredAt.getTime())) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Enter a valid date' };
    }
    session.talkId = talk.id;
    session.siteId = body.siteId ? +body.siteId : null;
    session.siteName = body.siteName ? String(body.siteName).trim() : null;
    session.deliveredAt = deliveredAt;
    session.notes = body.notes ? String(body.notes).trim() : null;
    if (body.minutes !== undefined) session.minutes = String(body.minutes);
    else if (!session.minutes) session.minutes = talk.brief;
    await this.sessionsRepo.save(session);
    const existing = await this.attendanceRepo.find({ where: { sessionId: id } });
    const keep = new Set(staffIds);
    const remove = existing.filter((row) => !keep.has(row.staffId));
    if (remove.length) await this.attendanceRepo.delete(remove.map((row) => row.id));
    const have = new Set(existing.map((row) => row.staffId));
    const add = staffIds.filter((staffId) => !have.has(staffId));
    if (add.length) {
      await this.attendanceRepo.save(
        add.map((staffId) => this.attendanceRepo.create({ sessionId: id, staffId, acknowledgedAt: null })),
      );
    }
    return { ...errorCode.SUCCESS, data: { id } };
  }

  async listSignoffs(user: IUserInfo) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const rows = await this.signoffRepo.find({
      where: { deletedAt: IsNull() },
      order: { signedAt: 'DESC', id: 'DESC' },
    });
    if (!rows.length) return { ...errorCode.SUCCESS, data: [] };
    const talks = await this.talksRepo.find({
      where: { id: In(Array.from(new Set(rows.map((row) => row.talkId)))) },
    });
    const talkById = new Map(talks.map((talk) => [+talk.id, talk]));
    const people = await this.usersRepo.find({
      where: { id: In(Array.from(new Set(rows.map((row) => row.staffId)))) },
    });
    const nameById = new Map(people.map((person) => [+person.id, person.fullName]));
    return {
      ...errorCode.SUCCESS,
      data: rows.map((row) => ({
        id: row.id,
        talkId: row.talkId,
        talkTitle: talkById.get(+row.talkId)?.title || '',
        staffId: row.staffId,
        staffName: nameById.get(+row.staffId) || `Staff #${row.staffId}`,
        signatureName: row.signatureName,
        signedAt: row.signedAt,
        minutes: row.minutes || talkById.get(+row.talkId)?.brief || '',
        formTitle: row.formTitle || '',
        printedName: row.printedName || '',
      })),
    };
  }

  async printSignoff(user: IUserInfo, id: number) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const row = await this.signoffRepo.findOne({ where: { id } });
    if (!row) return { ...errorCode.NOT_FOUND, message: 'Sign-off not found' };
    if (!this.isAdmin(user) && +row.staffId !== +user.userId) {
      return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    }
    const talk = await this.talksRepo.findOne({ where: { id: row.talkId } });
    const person = await this.usersRepo.findOne({ where: { id: row.staffId } });
    try {
      const url = await generateToolboxRecordPdf({
        recordNo: `TB-S${row.id}`,
        kind: 'Single session',
        talkTitle: row.formTitle || talk?.title || 'Toolbox talk',
        deliveredAt: row.signedAt,
        people: [
          {
            name: row.printedName || person?.fullName || `Staff #${row.staffId}`,
            signature: row.signatureName,
            completedAt: row.signedAt,
          },
        ],
        minutes: row.minutes || talk?.brief || '',
      });
      return { ...errorCode.SUCCESS, data: { url } };
    } catch (e) {
      this.logger.warn(`toolbox record pdf failed: ${(e as Error).message}`);
      return { ...errorCode.EXCEPTION, message: 'Could not create the PDF' };
    }
  }

  async printSession(user: IUserInfo, id: number) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    const talk = await this.talksRepo.findOne({ where: { id: session.talkId } });
    let rows = await this.attendanceRepo.find({ where: { sessionId: id }, order: { id: 'ASC' } });
    if (!this.isAdmin(user)) {
      rows = rows.filter((row) => +row.staffId === +user.userId);
      if (!rows.length) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    }
    const people = rows.length
      ? await this.usersRepo.find({ where: { id: In(rows.map((row) => row.staffId)) } })
      : [];
    const nameById = new Map(people.map((person) => [+person.id, person.fullName]));
    let ledBy = session.ledByName || '';
    if (!ledBy && session.deliveredBy) {
      const leader = await this.usersRepo.findOne({ where: { id: session.deliveredBy } });
      ledBy = leader?.fullName || '';
    }
    try {
      const url = await generateToolboxRecordPdf({
        recordNo: `TB-G${session.id}`,
        kind: rows.length === 1 && !this.isAdmin(user) ? 'Single session' : 'Group session',
        talkTitle: session.formTitle || talk?.title || 'Toolbox talk',
        siteName: session.siteName || '',
        deliveredAt: session.deliveredAt,
        ledBy,
        notes: session.notes || '',
        minutes: session.minutes || talk?.brief || '',
        people: rows.map((row) => ({
          name: row.printedName || nameById.get(+row.staffId) || `Staff #${row.staffId}`,
          signature: row.signatureName || '',
          completedAt: row.acknowledgedAt,
        })),
      });
      return { ...errorCode.SUCCESS, data: { url } };
    } catch (e) {
      this.logger.warn(`toolbox record pdf failed: ${(e as Error).message}`);
      return { ...errorCode.EXCEPTION, message: 'Could not create the PDF' };
    }
  }

  async listSessions(user: IUserInfo) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const sessions = await this.sessionsRepo.find({
      where: { deletedAt: IsNull() },
      order: { deliveredAt: 'DESC', id: 'DESC' },
    });
    if (!sessions.length) return { ...errorCode.SUCCESS, data: [] };
    const talkIds = Array.from(new Set(sessions.map((s) => s.talkId)));
    const talks = await this.talksRepo.find({ where: { id: In(talkIds) } });
    const talkById = new Map(talks.map((t) => [t.id, t]));
    const leaderIds = Array.from(
      new Set(sessions.map((s) => s.deliveredBy).filter((id): id is number => !!id)),
    );
    const leaders = leaderIds.length
      ? await this.usersRepo.find({ where: { id: In(leaderIds) } })
      : [];
    const leaderById = new Map(leaders.map((u) => [u.id, u.fullName]));
    const counts = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.session_id', 'sessionId')
      .addSelect('COUNT(*)', 'present')
      .addSelect('COUNT(a.acknowledged_at)', 'acknowledged')
      .where('a.session_id IN (:...ids)', { ids: sessions.map((s) => s.id) })
      .groupBy('a.session_id')
      .getRawMany();
    const countById = new Map(
      counts.map((row) => [
        +(row.sessionId ?? row.sessionid),
        { present: +row.present || 0, acknowledged: +row.acknowledged || 0 },
      ]),
    );
    const attendance = await this.attendanceRepo.find({
      where: { sessionId: In(sessions.map((session) => session.id)) },
      order: { id: 'ASC' },
    });
    const assignedIds = Array.from(new Set(attendance.map((row) => row.staffId)));
    const assignedPeople = assignedIds.length
      ? await this.usersRepo.find({ where: { id: In(assignedIds) } })
      : [];
    const assignedNameById = new Map(assignedPeople.map((person) => [+person.id, person.fullName]));
    const namesBySession = new Map<number, string[]>();
    for (const row of attendance) {
      const names = namesBySession.get(row.sessionId) || [];
      names.push(assignedNameById.get(+row.staffId) || `Staff #${row.staffId}`);
      namesBySession.set(row.sessionId, names);
    }
    return {
      ...errorCode.SUCCESS,
      data: sessions.map((s) => ({
        id: s.id,
        talkId: s.talkId,
        talkTitle: talkById.get(s.talkId)?.title || '',
        siteId: s.siteId,
        siteName: s.siteName || '',
        deliveredAt: s.deliveredAt,
        deliveredByName: s.deliveredBy ? leaderById.get(s.deliveredBy) || '' : '',
        notes: s.notes || '',
        present: countById.get(s.id)?.present || 0,
        acknowledged: countById.get(s.id)?.acknowledged || 0,
        assignedNames: (namesBySession.get(s.id) || []).join(', '),
      })),
    };
  }

  async getSession(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    const talk = await this.talksRepo.findOne({ where: { id: session.talkId } });
    const rows = await this.attendanceRepo.find({ where: { sessionId: id }, order: { id: 'ASC' } });
    const staffIds = rows.map((r) => r.staffId);
    const people = staffIds.length ? await this.usersRepo.find({ where: { id: In(staffIds) } }) : [];
    const nameById = new Map(people.map((u) => [u.id, u.fullName]));
    let deliveredByName = session.ledByName || '';
    if (!deliveredByName && session.deliveredBy) {
      const leader = await this.usersRepo.findOne({ where: { id: session.deliveredBy } });
      deliveredByName = leader?.fullName || '';
    }
    return {
      ...errorCode.SUCCESS,
      data: {
        id: session.id,
        talkId: session.talkId,
        talkTitle: session.formTitle || talk?.title || '',
        talkCode: talk?.code || '',
        imageUrl: talk?.imageUrl || null,
        brief: talk?.brief || '',
        points: talk?.points || [],
        siteId: session.siteId,
        siteName: session.siteName || '',
        deliveredAt: session.deliveredAt,
        deliveredByName,
        notes: session.notes || '',
        minutes: session.minutes || talk?.brief || '',
        attendance: rows.map((r) => ({
          staffId: r.staffId,
          name: r.printedName || nameById.get(r.staffId) || `Staff #${r.staffId}`,
          signatureName: r.signatureName || '',
          acknowledgedAt: r.acknowledgedAt,
        })),
      },
    };
  }

  async deleteSession(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    session.deletedAt = new Date();
    await this.sessionsRepo.save(session);
    return { ...errorCode.SUCCESS, data: true };
  }

  async restoreSession(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id } });
    if (!session?.deletedAt) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    session.deletedAt = null;
    await this.sessionsRepo.save(session);
    return { ...errorCode.SUCCESS, data: true };
  }

  async purgeSession(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id } });
    if (!session?.deletedAt) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    await this.attendanceRepo.delete({ sessionId: id });
    await this.sessionsRepo.delete({ id });
    return { ...errorCode.SUCCESS, data: true };
  }

  async updateSessionForm(
    user: IUserInfo,
    id: number,
    body: {
      talkTitle?: string;
      siteName?: string;
      deliveredAt?: string;
      ledBy?: string;
      minutes?: string;
      notes?: string;
      people?: { staffId?: number; name?: string; signature?: string; completedAt?: string | null }[];
    },
  ) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const session = await this.sessionsRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    if (body.talkTitle !== undefined) session.formTitle = String(body.talkTitle);
    if (body.siteName !== undefined) session.siteName = String(body.siteName).trim();
    if (body.ledBy !== undefined) session.ledByName = String(body.ledBy).trim();
    if (body.minutes !== undefined) session.minutes = String(body.minutes);
    if (body.notes !== undefined) session.notes = String(body.notes);
    if (body.deliveredAt) {
      const deliveredAt = new Date(body.deliveredAt);
      if (Number.isNaN(deliveredAt.getTime())) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Enter a valid date' };
      }
      session.deliveredAt = deliveredAt;
    }
    await this.sessionsRepo.save(session);
    const rows = await this.attendanceRepo.find({ where: { sessionId: id } });
    const byStaff = new Map(rows.map((row) => [+row.staffId, row]));
    for (const person of body.people || []) {
      const row = byStaff.get(+person.staffId);
      if (!row) continue;
      if (person.name !== undefined) row.printedName = String(person.name).trim();
      if (person.signature !== undefined) row.signatureName = String(person.signature).trim();
      if (person.completedAt) {
        const completedAt = new Date(person.completedAt);
        if (!Number.isNaN(completedAt.getTime())) row.acknowledgedAt = completedAt;
      } else if (person.completedAt === null || person.completedAt === '') {
        row.acknowledgedAt = null;
      }
    }
    if (rows.length) await this.attendanceRepo.save(rows);
    return { ...errorCode.SUCCESS, data: { id } };
  }

  async updateSignoff(
    user: IUserInfo,
    id: number,
    body: {
      signatureName?: string;
      minutes?: string;
      formTitle?: string;
      printedName?: string;
      signedAt?: string;
    },
  ) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const row = await this.signoffRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!row) return { ...errorCode.NOT_FOUND, message: 'Sign-off not found' };
    if (!this.isAdmin(user) && +row.staffId !== +user.userId) {
      return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    }
    const name = body.signatureName != null ? String(body.signatureName).trim() : row.signatureName;
    if (!name) return { ...errorCode.VALIDATION_ERROR, message: 'Enter your name to sign' };
    row.signatureName = name;
    if (body.minutes !== undefined) row.minutes = String(body.minutes);
    if (body.formTitle !== undefined) row.formTitle = String(body.formTitle);
    if (body.printedName !== undefined) row.printedName = String(body.printedName).trim();
    if (body.signedAt) {
      const signedAt = new Date(body.signedAt);
      if (Number.isNaN(signedAt.getTime())) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Enter a valid date' };
      }
      row.signedAt = signedAt;
    }
    await this.signoffRepo.save(row);
    return { ...errorCode.SUCCESS, data: { id: row.id } };
  }

  async deleteSignoff(user: IUserInfo, id: number) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const row = await this.signoffRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!row) return { ...errorCode.NOT_FOUND, message: 'Sign-off not found' };
    if (!this.isAdmin(user) && +row.staffId !== +user.userId) {
      return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    }
    row.deletedAt = new Date();
    await this.signoffRepo.save(row);
    return { ...errorCode.SUCCESS, data: true };
  }

  async restoreSignoff(user: IUserInfo, id: number) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const row = await this.signoffRepo.findOne({ where: { id } });
    if (!row?.deletedAt) return { ...errorCode.NOT_FOUND, message: 'Sign-off not found' };
    if (!this.isAdmin(user) && +row.staffId !== +user.userId) {
      return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    }
    row.deletedAt = null;
    await this.signoffRepo.save(row);
    return { ...errorCode.SUCCESS, data: true };
  }

  async purgeSignoff(user: IUserInfo, id: number) {
    if (!this.isAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const row = await this.signoffRepo.findOne({ where: { id } });
    if (!row?.deletedAt) return { ...errorCode.NOT_FOUND, message: 'Sign-off not found' };
    await this.signoffRepo.delete({ id });
    return { ...errorCode.SUCCESS, data: true };
  }

  async listDeleted(user: IUserInfo) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const signoffs = await this.signoffRepo.find({
      where: this.isAdmin(user) ? { deletedAt: Not(IsNull()) } : { staffId: +user.userId, deletedAt: Not(IsNull()) },
      order: { deletedAt: 'DESC', id: 'DESC' },
    });
    const sessions = this.isAdmin(user)
      ? await this.sessionsRepo.find({
          where: { deletedAt: Not(IsNull()) },
          order: { deletedAt: 'DESC', id: 'DESC' },
        })
      : [];
    const talkIds = Array.from(
      new Set([...signoffs.map((row) => row.talkId), ...sessions.map((row) => row.talkId)]),
    );
    const talks = talkIds.length ? await this.talksRepo.find({ where: { id: In(talkIds) } }) : [];
    const talkById = new Map(talks.map((talk) => [+talk.id, talk]));
    const staffIds = Array.from(new Set(signoffs.map((row) => row.staffId)));
    const people = staffIds.length ? await this.usersRepo.find({ where: { id: In(staffIds) } }) : [];
    const nameById = new Map(people.map((person) => [+person.id, person.fullName]));
    const single = signoffs.map((row) => ({
      key: `single-${row.id}`,
      id: row.id,
      kind: 'single',
      talkTitle: talkById.get(+row.talkId)?.title || '',
      who: nameById.get(+row.staffId) || `Staff #${row.staffId}`,
      when: row.signedAt,
      deletedAt: row.deletedAt,
    }));
    const group = sessions.map((row) => ({
      key: `group-${row.id}`,
      id: row.id,
      kind: 'group',
      talkTitle: talkById.get(+row.talkId)?.title || '',
      who: row.siteName || '',
      when: row.deliveredAt,
      deletedAt: row.deletedAt,
    }));
    const data = [...single, ...group].sort(
      (a, b) => +new Date(b.deletedAt || 0) - +new Date(a.deletedAt || 0),
    );
    return { ...errorCode.SUCCESS, data };
  }

  async myAttendance(user: IUserInfo) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const rows = await this.attendanceRepo.find({
      where: { staffId: +user.userId },
      order: { id: 'DESC' },
    });
    if (!rows.length) return { ...errorCode.SUCCESS, data: [] };
    const sessions = await this.sessionsRepo.find({
      where: { id: In(rows.map((r) => r.sessionId)) },
    });
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const talks = await this.talksRepo.find({
      where: { id: In(Array.from(new Set(sessions.map((s) => s.talkId)))) },
    });
    const talkById = new Map(talks.map((t) => [t.id, t]));
    const data = rows
      .map((row) => {
        const session = sessionById.get(row.sessionId);
        if (!session || session.deletedAt) return null;
        const talk = talkById.get(session.talkId);
        return {
          attendanceId: row.id,
          sessionId: session.id,
          talkId: talk?.id || session.talkId,
          talkTitle: talk?.title || '',
          brief: talk?.brief || '',
          durationMins: talk?.durationMins || 0,
          imageUrl: talk?.imageUrl || null,
          code: talk?.code || '',
          siteName: session.siteName || '',
          deliveredAt: session.deliveredAt,
          acknowledgedAt: row.acknowledgedAt,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => +new Date(b.deliveredAt) - +new Date(a.deliveredAt));
    return { ...errorCode.SUCCESS, data };
  }

  async acknowledge(user: IUserInfo, sessionId: number, signatureName?: string) {
    if (!this.isStaffOrAdmin(user)) return { ...errorCode.EXCEPTION, message: 'Not allowed' };
    const name = String(signatureName || '').trim();
    if (!name) return { ...errorCode.VALIDATION_ERROR, message: 'Enter your name to sign' };
    const row = await this.attendanceRepo.findOne({
      where: { sessionId, staffId: +user.userId },
    });
    if (!row) return { ...errorCode.NOT_FOUND, message: 'You are not on this talk' };
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) return { ...errorCode.NOT_FOUND, message: 'Session not found' };
    const signed = await this.signTalk(user, session.talkId, name);
    if (signed.code !== errorCode.SUCCESS.code) return signed;
    row.acknowledgedAt = row.acknowledgedAt || new Date();
    row.signatureName = row.signatureName || name;
    await this.attendanceRepo.save(row);
    return {
      ...errorCode.SUCCESS,
      data: { acknowledgedAt: row.acknowledgedAt, signatureName: row.signatureName },
    };
  }
}
