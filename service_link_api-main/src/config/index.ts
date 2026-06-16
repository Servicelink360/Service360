import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const envPath = join(root, '.env');
const localPath = join(root, '.env.local');

if (existsSync(envPath)) {
  Object.assign(process.env, dotenv.parse(readFileSync(envPath)));
}
if (existsSync(localPath)) {
  Object.assign(process.env, dotenv.parse(readFileSync(localPath)));
}
export default {
    VERSION: '1.0.1',
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
    JWT_REFRESH_SECRET_KEY: process.env.JWT_REFRESH_SECRET_KEY,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
    PASSWORD_SALT: process.env.PASSWORD_SALT,
    
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_ACCCESS: process.env.S3_SECRET_ACCCESS,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_URL: process.env.S3_URL,

    /** Brevo transactional API key (SMTP & API → API keys). */
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    /** @deprecated Use BREVO_API_KEY; kept for backward-compatible env files. */
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_FROM: process.env.MAIL_FROM,
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,

    REDIS_IP: process.env.REDIS_IP,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,


    GHTK_API: process.env.GHTK_API,
    GHTK_TOKEN: process.env.GHTK_TOKEN,
    TINHGIA_API: process.env.TINHGIA_API,
    MAIL_SECURE: process.env.MAIL_SECURE,
    BASE_UPLOAD_URL: process.env.BASE_UPLOAD_URL,

    APP_URL: process.env.APP_URL,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
}