import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
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
    const roomName = `svc360-${randomBytes(9).toString('hex')}`;
    const rows = await this.dataSource.query(
      `INSERT INTO public.meetings (room_name, host_user_id)
       VALUES ($1, $2)
       RETURNING id`,
      [roomName, +user.userId],
    );
    const id = rows?.[0]?.id;
    if (!id) return { ...errorCode.EXCEPTION, message: 'Could not start the meeting' };
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
    const rows = await this.dataSource.query(
      `SELECT m.id,
              COALESCE(NULLIF(TRIM(h.full_name), ''), h.username, 'Admin') AS "hostName"
       FROM public.meeting_invites i
       INNER JOIN public.meetings m ON m.id = i.meeting_id AND m.ended_at IS NULL
       LEFT JOIN public.users h ON h.id = m.host_user_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT 20`,
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
              EXISTS (
                SELECT 1 FROM public.meeting_invites i
                WHERE i.meeting_id = m.id AND i.user_id = $2
              ) AS invited
       FROM public.meetings m
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
      const token = await this.mintToken(user, meeting.roomName);
      return {
        ...errorCode.SUCCESS,
        data: { id: meeting.id, url: this.liveKitUrl(), token },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not join the meeting';
      return { ...errorCode.EXCEPTION, message };
    }
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
        subject: `u${user.userId}`,
        expiresIn: '6h',
      },
    );
  }
}
