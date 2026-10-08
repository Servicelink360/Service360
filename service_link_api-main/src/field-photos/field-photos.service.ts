import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { errorCode } from '../constants/errorCode';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';

function canUseCamera(user: IUserInfo) {
  const type = +user?.type;
  return type === userType.ADMIN || type === userType.STAFF;
}

function cleanUrl(value: unknown) {
  const url = String(value || '').trim();
  if (url.length < 8 || url.length > 2000) return '';
  if (/\s/.test(url)) return '';
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

@Injectable()
export class FieldPhotosService {
  constructor(private readonly dataSource: DataSource) {}

  async list(user: IUserInfo) {
    if (!canUseCamera(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff and admin only' };
    }
    const admin = +user.type === userType.ADMIN;
    const rows = await this.dataSource.query(
      `SELECT p.id,
              p.file_url AS url,
              COALESCE(p.address, '') AS address,
              p.created_at AS "createdAt",
              p.user_id AS "userId",
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.username, '') AS "takenBy"
       FROM public.field_photos p
       LEFT JOIN public.users u ON u.id = p.user_id
       WHERE ($1::boolean = true OR p.user_id = $2)
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT 200`,
      [admin, +user.userId],
    );
    return { ...errorCode.SUCCESS, data: rows };
  }

  async create(user: IUserInfo, body: { fileUrl?: string; address?: string }) {
    if (!canUseCamera(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff and admin only' };
    }
    const fileUrl = cleanUrl(body?.fileUrl);
    if (!fileUrl) return { ...errorCode.VALIDATION_ERROR, message: 'Photo could not be saved' };
    const address = String(body?.address || '').trim().slice(0, 300);
    const rows = await this.dataSource.query(
      `INSERT INTO public.field_photos (user_id, file_url, address)
       VALUES ($1, $2, $3)
       RETURNING id, file_url AS url, COALESCE(address, '') AS address, created_at AS "createdAt", user_id AS "userId"`,
      [+user.userId, fileUrl, address || null],
    );
    return { ...errorCode.SUCCESS, data: rows?.[0] || null };
  }

  async remove(user: IUserInfo, idRaw: string) {
    if (!canUseCamera(user)) {
      return { ...errorCode.EXCEPTION, message: 'Staff and admin only' };
    }
    const id = +idRaw;
    if (!Number.isInteger(id) || id < 1) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Choose a photo' };
    }
    const admin = +user.type === userType.ADMIN;
    const rows = await this.dataSource.query(
      `DELETE FROM public.field_photos
       WHERE id = $1 AND ($2::boolean = true OR user_id = $3)
       RETURNING id`,
      [id, admin, +user.userId],
    );
    if (!rows?.length) return { ...errorCode.NOT_FOUND, message: 'Photo not found' };
    return { ...errorCode.SUCCESS };
  }
}
