import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userStatus, userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';

function canHost(user: IUserInfo) {
  const type = +user?.type;
  return type === userType.ADMIN || type === userType.STAFF;
}

function isAdmin(user: IUserInfo) {
  return +user?.type === userType.ADMIN;
}

function cleanIds(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  const ids = raw
    .map((item) => +item)
    .filter((item) => Number.isInteger(item) && item > 0);
  return Array.from(new Set(ids)).slice(0, 100);
}

@Injectable()
export class MeetingsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(user: IUserInfo) {
    if (!canHost(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff and admin only' };
    }
    await this.expireUnattendedMeetings();
    const open = await this.dataSource.query(
      `SELECT id
       FROM public.meetings
       WHERE ended_at IS NULL AND host_user_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [+user.userId],
    );
    if (open?.[0]?.id) {
      return { ...errorCode.SUCCESS, data: { id: open[0].id } };
    }
    const rows = await this.dataSource.query(
      `INSERT INTO public.meetings (room_name, host_user_id)
       VALUES ('svc360-new-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), $1)
       RETURNING id`,
      [+user.userId],
    );
    const id = rows?.[0]?.id;
    if (!id) return { ...errorCode.EXCEPTION, message: 'Could not start the meeting' };
    await this.dataSource.query(
      `UPDATE public.meetings SET room_name = $2 WHERE id = $1`,
      [id, this.roomNameFor(id)],
    );
    return { ...errorCode.SUCCESS, data: { id } };
  }

  async people(user: IUserInfo, idRaw: unknown) {
    if (!isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const meetingId = +idRaw;
    const rows = await this.dataSource.query(
      `SELECT u.id,
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.username, u.email) AS name,
              COALESCE(u.email, '') AS email,
              u.type,
              CASE
                WHEN $1::int > 0 AND EXISTS (
                  SELECT 1 FROM public.meeting_invites i
                  WHERE i.meeting_id = $1 AND i.user_id = u.id
                ) THEN true
                ELSE false
              END AS invited
       FROM public.users u
       WHERE u.type IN ($2, $3)
         AND u.status IS DISTINCT FROM $4
       ORDER BY u.type DESC, name
       LIMIT 500`,
      [
        Number.isInteger(meetingId) ? meetingId : 0,
        userType.STAFF,
        userType.CUSTOMER,
        userStatus.DELETE,
      ],
    );
    return { ...errorCode.SUCCESS, data: rows };
  }

  async inbox(user: IUserInfo) {
    await this.expireUnattendedMeetings();
    const rows = await this.dataSource.query(
      `SELECT m.id,
              COALESCE(NULLIF(TRIM(h.full_name), ''), h.username, 'Admin') AS "hostName",
              (m.host_user_id = $1) AS mine
       FROM public.meetings m
       LEFT JOIN public.users h ON h.id = m.host_user_id
       WHERE m.ended_at IS NULL
         AND (
           m.host_user_id = $1
           OR EXISTS (
             SELECT 1 FROM public.meeting_invites i
             WHERE i.meeting_id = m.id AND i.user_id = $1
           )
         )
       ORDER BY m.id DESC
       LIMIT 1`,
      [+user.userId],
    );
    return { ...errorCode.SUCCESS, data: rows };
  }

  async invite(user: IUserInfo, body: { id?: unknown; userIds?: unknown }) {
    if (!isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    const id = +body?.id;
    if (!Number.isInteger(id) || id < 1) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a meeting' };
    }
    const userIds = cleanIds(body?.userIds);
    if (!userIds.length) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose staff or clients from the list' };
    }
    const meetings = await this.dataSource.query(
      `SELECT id FROM public.meetings WHERE id = $1 AND ended_at IS NULL`,
      [id],
    );
    if (!meetings?.length) return { ...errorCode.NOT_FOUND, message: 'Meeting not found' };
    const rows = await this.dataSource.query(
      `INSERT INTO public.meeting_invites (meeting_id, user_id, invited_by)
       SELECT $1, u.id, $2
       FROM public.users u
       WHERE u.id = ANY($3::int[])
         AND u.type IN ($4, $5)
         AND u.status IS DISTINCT FROM $6
       ON CONFLICT (meeting_id, user_id) DO NOTHING
       RETURNING user_id AS "userId"`,
      [id, +user.userId, userIds, userType.STAFF, userType.CUSTOMER, userStatus.DELETE],
    );
    if (!rows?.length) {
      return { ...errorCode.SUCCESS, message: 'Those people were already invited', data: { sent: 0 } };
    }
    return { ...errorCode.SUCCESS, message: 'Invitation sent', data: { sent: rows.length } };
  }

  async join(user: IUserInfo, idRaw: unknown) {
    const id = +idRaw;
    if (!Number.isInteger(id) || id < 1) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a meeting' };
    }
    const rows = await this.dataSource.query(
      `SELECT m.id,
              m.room_name AS "roomName",
              m.host_user_id AS "hostUserId",
              COALESCE(NULLIF(TRIM(h.full_name), ''), h.username, 'Admin') AS "hostName",
              EXISTS (
                SELECT 1 FROM public.meeting_invites i
                WHERE i.meeting_id = m.id AND i.user_id = $2
              ) AS invited
       FROM public.meetings m
       LEFT JOIN public.users h ON h.id = m.host_user_id
       WHERE m.id = $1 AND m.ended_at IS NULL`,
      [id, +user.userId],
    );
    const meeting = rows?.[0];
    if (!meeting) return { ...errorCode.NOT_FOUND, message: 'Meeting not found' };
    const host = +meeting.hostUserId === +user.userId;
    if (!host && !meeting.invited) {
      return { ...errorCode.EXCEPTION, message: 'This meeting needs an invitation' };
    }
    try {
      await this.markJoined(meeting.id, +user.userId);
      const roomName = await this.ensureRoomName(meeting.id, meeting.roomName);
      const token = await this.mintToken(user, roomName);
      return {
        ...errorCode.SUCCESS,
        data: {
          id: meeting.id,
          url: this.liveKitUrl(),
          token,
          host,
          hostName: meeting.hostName,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not join the meeting';
      return { ...errorCode.EXCEPTION, message };
    }
  }

  async clearAll(user: IUserInfo) {
    if (!isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    await this.dataSource.query(`DELETE FROM public.meeting_attendance`);
    await this.dataSource.query(`DELETE FROM public.meeting_invites`);
    await this.dataSource.query(`DELETE FROM public.meetings`);
    return { ...errorCode.SUCCESS, message: 'All meetings cleared' };
  }

  async end(user: IUserInfo, idRaw: unknown) {
    const id = +idRaw;
    if (!Number.isInteger(id) || id < 1) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a meeting' };
    }
    const rows = await this.dataSource.query(
      `UPDATE public.meetings
       SET ended_at = NOW()
       WHERE id = $1 AND host_user_id = $2 AND ended_at IS NULL
       RETURNING id`,
      [id, +user.userId],
    );
    if (!rows?.length) {
      return { ...errorCode.EXCEPTION, message: 'Only the host can end this meeting' };
    }
    await this.closeAttendance(id);
    return { ...errorCode.SUCCESS, message: 'Meeting ended', data: { id } };
  }

  async leave(user: IUserInfo, idRaw: unknown) {
    const id = +idRaw;
    if (!Number.isInteger(id) || id < 1) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a meeting' };
    }
    await this.dataSource.query(
      `UPDATE public.meeting_attendance
       SET left_at = NOW()
       WHERE meeting_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, +user.userId],
    );
    return { ...errorCode.SUCCESS, data: { id } };
  }

  async history(user: IUserInfo) {
    if (!isAdmin(user)) {
      return { ...errorCode.EXCEPTION, message: 'Admin only' };
    }
    await this.closeFinishedAttendance();
    const meetings = await this.dataSource.query(
      `SELECT m.id,
              m.created_at AS "startedAt",
              m.ended_at AS "endedAt",
              COALESCE(NULLIF(TRIM(h.full_name), ''), h.username, 'Admin') AS "hostName"
       FROM public.meetings m
       LEFT JOIN public.users h ON h.id = m.host_user_id
       ORDER BY m.id DESC
       LIMIT 80`,
    );
    const ids = (meetings || []).map((row) => +row.id).filter((id) => id > 0);
    const people = ids.length
      ? await this.dataSource.query(
          `SELECT a.meeting_id AS "meetingId",
                  a.user_id AS "userId",
                  COALESCE(NULLIF(TRIM(u.full_name), ''), u.username, u.email, 'User') AS name,
                  CASE u.type
                    WHEN $2 THEN 'Admin'
                    WHEN $3 THEN 'Staff'
                    WHEN $4 THEN 'Client'
                    ELSE ''
                  END AS role,
                  a.joined_at AS "joinedAt",
                  a.left_at AS "leftAt"
           FROM public.meeting_attendance a
           LEFT JOIN public.users u ON u.id = a.user_id
           WHERE a.meeting_id = ANY($1::int[])
           ORDER BY a.joined_at ASC, a.id ASC`,
          [ids, userType.ADMIN, userType.STAFF, userType.CUSTOMER],
        )
      : [];
    const attended = new Map<number, unknown[]>();
    for (const person of people || []) {
      const meetingId = +person.meetingId;
      const list = attended.get(meetingId) || [];
      list.push({
        userId: person.userId,
        name: person.name,
        role: person.role,
        joinedAt: person.joinedAt,
        leftAt: person.leftAt,
      });
      attended.set(meetingId, list);
    }
    return {
      ...errorCode.SUCCESS,
      data: (meetings || []).map((meeting) => ({
        id: meeting.id,
        hostName: meeting.hostName,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        attended: attended.get(+meeting.id) || [],
      })),
    };
  }

  private async expireUnattendedMeetings() {
    await this.dataSource.query(
      `UPDATE public.meetings m
       SET ended_at = NOW()
       WHERE m.ended_at IS NULL
         AND m.created_at < NOW() - INTERVAL '1 hour'
         AND NOT EXISTS (
           SELECT 1
           FROM public.meeting_attendance a
           WHERE a.meeting_id = m.id
             AND a.left_at IS NULL
         )`,
    );
    await this.closeFinishedAttendance();
  }

  private roomNameFor(id: number) {
    return `svc360-m-${id}`;
  }

  private async ensureRoomName(id: number, current: unknown) {
    const wanted = this.roomNameFor(id);
    const name = String(current || '').trim();
    if (name === wanted) return wanted;
    await this.dataSource.query(
      `UPDATE public.meetings SET room_name = $2 WHERE id = $1`,
      [id, wanted],
    );
    return wanted;
  }

  private async markJoined(meetingId: number, userId: number) {
    await this.dataSource.query(
      `UPDATE public.meeting_attendance
       SET left_at = NOW()
       WHERE meeting_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [meetingId, userId],
    );
    await this.dataSource.query(
      `INSERT INTO public.meeting_attendance (meeting_id, user_id)
       VALUES ($1, $2)`,
      [meetingId, userId],
    );
  }

  private async closeAttendance(meetingId: number) {
    await this.dataSource.query(
      `UPDATE public.meeting_attendance
       SET left_at = NOW()
       WHERE meeting_id = $1 AND left_at IS NULL`,
      [meetingId],
    );
  }

  private async closeFinishedAttendance() {
    await this.dataSource.query(
      `UPDATE public.meeting_attendance a
       SET left_at = m.ended_at
       FROM public.meetings m
       WHERE a.meeting_id = m.id
         AND a.left_at IS NULL
         AND m.ended_at IS NOT NULL`,
    );
  }

  private liveKitUrl() {
    const url = String(process.env.LIVEKIT_URL || '').trim();
    if (!/^wss?:\/\//i.test(url)) {
      throw new Error('Meetings are not ready on this server yet');
    }
    return url;
  }

  private async mintToken(user: IUserInfo, roomName: string) {
    const apiKey = String(process.env.LIVEKIT_API_KEY || '').trim();
    const apiSecret = String(process.env.LIVEKIT_API_SECRET || '').trim();
    if (!apiKey || !apiSecret) {
      throw new Error('Meetings are not ready on this server yet');
    }
    const name = String(user.fullName || user.username || 'Service360').trim().slice(0, 80);
    return sign(
      {
        name,
        video: {
          roomJoin: true,
          room: roomName,
          canPublish: true,
          canSubscribe: true,
        },
      },
      apiSecret,
      {
        algorithm: 'HS256',
        issuer: apiKey,
        subject: `u${user.userId}-${Date.now().toString(36)}`,
        expiresIn: '6h',
      },
    );
  }
}
