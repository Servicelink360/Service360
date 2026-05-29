import { HttpStatus } from "@nestjs/common";
import * as path from "path";
import { shouldUploadReportPdfsToS3, uploadBufferToS3 } from "../upload/s3-upload.helper";
import { getPublicRoot } from "../paths";
import { Repository } from "typeorm";
import config from "../config";
import { errorCode } from "../constants/errorCode";
import { redisKey } from "../constants/redisKey";
import { IErrorData } from "../interfaces/IErrorData";
import { User } from "../users/entities/user.entity";
import * as moment from 'moment';
import { PDFDocument, rgb } from 'pdf-lib'
import { userType } from '../constants/user';
const sharp = require('sharp');

/** Footer / [REPORT_BY]: staff name for field submissions; generic label for admin-portal submissions. */
const REPORT_PDF_ADMIN_SUBMITTED_LABEL = 'Admin';

function isAdminSubmittedReport(row: any): boolean {
    const creatorType = row?.createdUser?.type != null ? +row.createdUser.type : 0;
    if (creatorType === userType.ADMIN) return true;
    const createdBy = row?.createdBy != null ? +row.createdBy : 0;
    const staffId = row?.staffId != null ? +row.staffId : 0;
    return createdBy > 0 && staffId > 0 && createdBy !== staffId;
}

function getReportPdfSubmittedByLabel(row: any): string {
    if (isAdminSubmittedReport(row)) return REPORT_PDF_ADMIN_SUBMITTED_LABEL;
    const staffName = String(row?.staff?.fullName || row?.staff?.username || '').trim();
    if (staffName) return staffName;
    return String(row?.user?.fullName || row?.user?.username || '').trim();
}

const puppeteer = require('puppeteer');
const AWS = require("aws-sdk");
const fs = require('fs');
const axios = require('axios')
function Chr4(): string {
    return Math.random().toString(16).slice(-4);
}

function makeOTP() {
    let text = "";
    const possible = "0123456789";

    for (let i = 0; i < 6; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
async function uploadImageToS3(base64: string): Promise<string> {
    if (!base64 || typeof base64 !== 'string') return "";

    if (base64.startsWith('http://') || base64.startsWith('https://')) {
        return base64;
    }

    const AwsAccessKeyId = config.S3_ACCESS_KEY;
    const AwsSecretAccessKey = config.S3_SECRET_ACCCESS;
    const AWSBucket = config.S3_BUCKET;
    const SPACE_URL = config.S3_URL;
    const spacesEndpoint = new AWS.Endpoint(SPACE_URL);
    const s3 = new AWS.S3({
        endpoint: spacesEndpoint,
        accessKeyId: AwsAccessKeyId,
        secretAccessKey: AwsSecretAccessKey,
    });
    console.log('AwsAccessKeyId', {
        endpoint: spacesEndpoint,
        accessKeyId: AwsAccessKeyId,
        secretAccessKey: AwsSecretAccessKey,
    })
    // 👉 Extract MIME type
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 string");
    }

    const mimeType = matches[1]; // e.g., image/png or application/pdf
    const base64Data = matches[2];

    const binaryData = Buffer.from(base64Data, "base64");

    // Determine file extension
    const extensionMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
    };
    const extension = extensionMap[mimeType] || 'bin';

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const filename = `upload_${dateStr}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;

    // Upload to S3
    await s3.putObject({
        Bucket: AWSBucket,
        Key: filename,
        Body: binaryData,
        // ACL: "public-read",
        ContentEncoding: 'base64',
        ContentType: mimeType,
    }).promise(); // sử dụng .promise() để await dễ hơn

    return `https://${AWSBucket}.${SPACE_URL}/${filename}`;
}

export const generatePresignedUrl = async (filename: string, mimeType: string) => {
    const fileKey = `uploads/${Date.now()}_${filename}`;

    const AwsAccessKeyId = config.S3_ACCESS_KEY;
    const AwsSecretAccessKey = config.S3_SECRET_ACCCESS;
    const AWSBucket = config.S3_BUCKET;
    const SPACE_URL = config.S3_URL;
    const spacesEndpoint = new AWS.Endpoint(SPACE_URL);
    const s3 = new AWS.S3({
        endpoint: spacesEndpoint,
        accessKeyId: AwsAccessKeyId,
        secretAccessKey: AwsSecretAccessKey,
    });
    const params = {
        Bucket: AWSBucket,
        Key: fileKey,
        Expires: 60, // 60s
        ContentType: mimeType,
        ACL: 'public-read' // hoặc bỏ nếu bucket không cho ACL
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
        uploadUrl,
        fileUrl: `https://${AWSBucket}.${SPACE_URL}/${fileKey}`
    };
};

function customHttpCode(res, result: IErrorData) {
    if (result.code !== errorCode.SUCCESS.code) {
        return res.status(HttpStatus.BAD_REQUEST).send(result);
    }
    // else if (!result.data) {
    //     return res.status(HttpStatus.NO_CONTENT).send(result);
    // }
    return res.status(HttpStatus.OK).send(result);
}

function IsEmptyOrUndefined(str) {
    return (!str || str.length === 0);
}

function Chr6(): string {
    return Math.random().toString(16).slice(-6);
}

async function synUserInfoToRedisV2(user: User, userRepository: Repository<User>, redis: any) {
    try {
        user.password = undefined;
        await redis.hset(redisKey.USERS, user.id, JSON.stringify(user));
    } catch (error) {
        console.log("error", error);
        this.logger.error(error);
        return errorCode.EXCEPTION;
    }
}

const editFileName = (
    req: Request,
    file: any,
    callback
) => {
    const name = file.originalname.split('.')[0].replace(/ +/g, '_');
    const fileExtName = path.extname(file.originalname);
    const randomName = Array(4)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
    callback(null, `${name}-${randomName}${fileExtName}`);
};

const imageFileFilter = (
    req: Request,
    file: any,
    callback
) => {
    if (!file.originalname.toLowerCase().match(/\.(webp|jpg|jpeg|png|gif|txt|log|doc|docx|pdf|dmp|erl|dat|evtx|dll|ini|mp4|avif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};

export const fileFilter = (
    req: Request,
    file: any,
    callback
) => {
    if (!file.originalname.toLowerCase().match(/\.(xlsx|xls)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};


function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function convertToSlug(slug: string) {
    slug = slug.replace(/^\s+|\s+$/g, "");
    slug = slug.toLowerCase();
    slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
    slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
    slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
    slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
    slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
    slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
    slug = slug.replace(/đ/gi, 'd');
    /* eslint-disable */
    slug = slug.replace(/\`|\~|\!|\@|\#|\||\$|\%|\^|\&|\*|\(|\)|\+|\=|\,|\.|\/|\?|\>|\<|\'|\"|\:|\;|_/gi, '');

    slug = slug.replace(/ /gi, "-");

    slug = slug.replace(/\-\-\-\-\-/gi, '-');
    slug = slug.replace(/\-\-\-\-/gi, '-');
    slug = slug.replace(/\-\-\-/gi, '-');
    slug = slug.replace(/\-\-/gi, '-');
    slug = '@' + slug + '@';
    slug = slug.replace(/\@\-|\-\@|\@/gi, '');
    return slug;
}

function convertNumber(number) {
    if (!isNaN(number)) {
        // return parseFloat(number).toFixed(2).replace(/./g, function (c, i, a) {
        //     return i && c !== "," && (a.length - i) % 3 === 0 ? "," + c : c;
        // });
        return "" + parseFloat(number).toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
    } else {
        return 0;
    }
}

// null 값 처리
function fGetParm(val) {
    if (val == null) val = '';
    return val;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
/** Load image bytes from URL, data URI, or local path under project `public/`. */
async function loadImageBufferForPdf(src: string): Promise<Buffer> {
    const s = String(src || '').trim();
    if (!s) throw new Error('empty image src');

    const dataMatch = s.match(/^data:image\/[^;]+;base64,(.+)$/i);
    if (dataMatch) {
        return Buffer.from(dataMatch[1], 'base64');
    }

    if (/^https?:\/\//i.test(s)) {
        const response = await axios.get(s, {
            responseType: 'arraybuffer',
            timeout: 45_000,
            maxContentLength: 25 * 1024 * 1024,
            validateStatus: (st) => st >= 200 && st < 400,
        });
        return Buffer.from(response.data);
    }

    const cwd = process.cwd();
    const publicRoot = getPublicRoot();
    const rel = s.replace(/^\/+/, '');
    const candidates: string[] = [];
    if (/^public[/\\]/i.test(rel)) candidates.push(path.join(cwd, rel));
    candidates.push(path.join(publicRoot, rel.replace(/^public[/\\]/i, '')));
    candidates.push(path.join(cwd, rel));
    const pubPart = s.split(/public[/\\]/i)[1];
    if (pubPart) {
        candidates.push(path.join(cwd, 'public', pubPart.replace(/^[/\\]+/, '')));
        candidates.push(path.join(publicRoot, pubPart.replace(/^[/\\]+/, '')));
    }
    const base = String(config.BASE_UPLOAD_URL || '').replace(/\/+$/, '');
    if (base && s.startsWith(base)) {
        const trimmed = s.slice(base.length).replace(/^\/+/, '');
        candidates.push(path.join(cwd, trimmed));
        candidates.push(path.join(cwd, 'public', trimmed.replace(/^public[/\\]/i, '')));
        candidates.push(path.join(publicRoot, trimmed.replace(/^public[/\\]/i, '')));
    }

    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p)) return await fs.promises.readFile(p);
        } catch {
            /* try next */
        }
    }
    throw new Error(`Image not found: ${s.slice(0, 160)}`);
}

async function imageBufferToJpegDataUri(buf: Buffer): Promise<string> {
    const metadata = await sharp(buf).metadata();
    const w = metadata.width || 0;
    const h = metadata.height || 0;
    const shouldCompress = w > 1000 || h > 1000;
    const shouldCompress2 = w > 500 || h > 500;
    const out = await sharp(buf)
        .jpeg({
            quality: shouldCompress ? 30 : shouldCompress2 ? 50 : 85,
            mozjpeg: true,
        })
        .toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
}

function escapeHtml(unsafe: unknown): string {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(unsafe: string): string {
    return String(unsafe ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

function joinPublicUrl(base: string, relativePath: string): string {
    const b = String(base || '').replace(/\/+$/, '');
    const p = String(relativePath || '').replace(/^\/+/g, '');
    if (!b) return p.startsWith('/') ? p : `/${p}`;
    return `${b}/${p}`;
}

function stripHtmlTags(s: unknown): string {
    return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeReportFieldType(t: unknown): string {
    const u = String(t ?? '').trim().toUpperCase().replace(/\s+/g, '_');
    if (u === 'RESIZEALE_TEXTBOX' || u === 'RESIZABLE_TEXTBOX') return 'TEXTAREA';
    if (u === 'PHOTO' || u === 'PHOTOS' || u === 'IMAGE') return 'IMAGES';
    return u;
}

function parseReportMediaList(v: unknown): string[] {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
    const s = String(v).trim();
    if (!s || s === '[]') return [];
    try {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p.map(String).map((x) => x.trim()).filter(Boolean);
        if (typeof p === 'string' && p.trim()) return [p.trim()];
    } catch {
        if (/^https?:\/\//i.test(s) || s.startsWith('/') || /^data:image\//i.test(s)) return [s];
        return s.split(/[,|;\n\r]+/).map((x) => x.trim()).filter(Boolean);
    }
    return [];
}

function resolveReportPdfTemplatePath(): string {
    const envPath = process.env.REPORT_PDF_TEMPLATE_PATH?.trim();
    if (envPath && fs.existsSync(envPath)) return path.normalize(envPath);

    const cwd = process.cwd();
    const candidates = [
        path.join(cwd, 'template.html'),
        path.join(__dirname, '..', '..', 'template.html'),
        path.join(__dirname, '..', '..', '..', 'template.html'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return path.normalize(p);
    }
    throw new Error(
        `Report PDF template not found. Set REPORT_PDF_TEMPLATE_PATH or add template.html (tried: ${candidates.join(', ')})`,
    );
}

/** Embed logo in PDF HTML so Puppeteer does not need external HTTP (avoids broken images). */
async function resolveReportPdfLogoDataUri(): Promise<string> {
    const envPath = process.env.REPORT_PDF_LOGO_PATH?.trim();
    if (envPath) {
        try {
            const buf = await fs.promises.readFile(envPath);
            return await imageBufferToDataUriForPdf(buf);
        } catch (e) {
            console.warn('[report-pdf] REPORT_PDF_LOGO_PATH read failed', e);
        }
    }

    const envUrl = process.env.REPORT_PDF_LOGO_URL?.trim();
    if (envUrl) {
        try {
            const buf = await loadImageBufferForPdf(envUrl);
            return await imageBufferToDataUriForPdf(buf);
        } catch (e) {
            console.warn('[report-pdf] REPORT_PDF_LOGO_URL fetch failed', e);
        }
    }

    const publicRoot = getPublicRoot();
    const logoCandidates = [
        path.join(publicRoot, 'assets', 'servicelink-logo.png'),
        path.join(process.cwd(), 'public', 'assets', 'servicelink-logo.png'),
        path.join(publicRoot, 'upload', 'files', 'logo-a8a4.png'),
    ];
    for (const p of logoCandidates) {
        try {
            if (p && fs.existsSync(p)) {
                const buf = await fs.promises.readFile(p);
                return await imageBufferToDataUriForPdf(buf);
            }
        } catch {
            /* try next */
        }
    }

    console.warn('[report-pdf] No logo file found; PDF header logo will be omitted.');
    return '';
}

async function imageBufferToDataUriForPdf(buf: Buffer): Promise<string> {
    const metadata = await sharp(buf).metadata();
    const format = String(metadata.format || 'png').toLowerCase();
    if (format === 'jpeg' || format === 'jpg') {
        return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
    if (format === 'png') {
        return `data:image/png;base64,${buf.toString('base64')}`;
    }
    const out = await sharp(buf).png().toBuffer();
    return `data:image/png;base64,${out.toString('base64')}`;
}

function formatTableForPdf(val: unknown): string {
    try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (!Array.isArray(parsed) || parsed.length === 0) return escapeHtml(String(val ?? ''));

        if (typeof parsed[0] !== 'object' || parsed[0] === null) {
            let html =
                '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;"><tbody>';
            for (const cell of parsed) {
                html += `<tr><td>${escapeHtml(String(cell ?? ''))}</td></tr>`;
            }
            html += '</tbody></table>';
            return html;
        }

        const keys = Object.keys(parsed[0] as object);
        let html =
            '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;"><thead><tr>';
        for (const k of keys) html += `<th>${escapeHtml(k)}</th>`;
        html += '</tr></thead><tbody>';

        for (const row of parsed) {
            html += '<tr>';
            for (const k of keys) {
                html += `<td>${escapeHtml(String((row as Record<string, unknown>)[k] ?? ''))}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        return html;
    } catch {
        return escapeHtml(String(val ?? ''));
    }
}

function formatJsonPretty(val: unknown): string {
    try {
        const p = typeof val === 'string' ? JSON.parse(val) : val;
        return escapeHtml(JSON.stringify(p, null, 2));
    } catch {
        return escapeHtml(String(val ?? ''));
    }
}

function fieldRow(encName: string, innerHtml: string): string {
    return `
            <div class="row">
                <div class="item40"><div class="name"><span>${encName}</span></div></div>
                <div class="item60"><div class="value">${innerHtml}</div></div>
            </div>`;
}

function formatChecklistForPdf(val: unknown): string {
    try {
        const p = typeof val === 'string' ? JSON.parse(val) : val;
        if (Array.isArray(p)) return escapeHtml(p.map(String).join(', '));
        if (p && typeof p === 'object') return escapeHtml(JSON.stringify(p));
    } catch {
        /* fallthrough */
    }
    return escapeHtml(String(val ?? ''));
}

async function buildImagesBlock(fieldName: string, value: unknown): Promise<string> {
    const urls = parseReportMediaList(value);
    const parts: string[] = [];
    for (const src of urls) {
        try {
            const buf = await loadImageBufferForPdf(src);
            const uri = await imageBufferToJpegDataUri(buf);
            parts.push(`<div class="images-item"><img alt="" src="${escapeAttr(uri)}" /></div>`);
        } catch (e: any) {
            console.warn('PDF: skip image', String(src).slice(0, 200), e?.message || e);
            parts.push(
                `<div class="images-item" style="font-size:12px;color:#888;">${escapeHtml(
                    `[Image unavailable] ${String(src).slice(0, 80)}`,
                )}</div>`,
            );
        }
    }
    return `
          <div class="row"> <div class="item40"><div class="name"> <span>${escapeHtml(fieldName)}</span> </div></div><div class="item60"></div></div>
          <div class="images">${parts.join('')}</div>`;
}

async function renderReportField(row: any, it: any, opts: { hasNoteHeader: boolean }): Promise<string> {
    const rawType = it?.type;
    const type = normalizeReportFieldType(rawType);
    const name = String(it?.name ?? '');
    const encName = escapeHtml(name);
    const val = it?.value;

    if (opts.hasNoteHeader && name === 'Note') return '';

    if (type === 'YES_NO') {
        const yn = String(val ?? '').toUpperCase();
        const isYes = yn === 'YES' || yn === 'TRUE' || yn === '1';
        return fieldRow(
            encName,
            `<span><span class="label ${isYes ? 'yes' : 'no'}"></span>${escapeHtml(String(val ?? ''))}</span>`,
        );
    }

    if (rawType === '[SITE_NAME]' || type === '[SITE_NAME]') {
        return fieldRow(encName, `<span>${escapeHtml(row?.siteName ?? '')}</span>`);
    }

    if (rawType === '[SITE_ADDRESS]' || type === '[SITE_ADDRESS]') {
        return fieldRow(encName, `<span>${escapeHtml(row?.siteAddress ?? '')}</span>`);
    }

    if (rawType === '[REPORT_BY]' || type === '[REPORT_BY]') {
        return fieldRow(encName, `<span>${escapeHtml(getReportPdfSubmittedByLabel(row))}</span>`);
    }

    if ((rawType === '[CUSTOMER_NAME]' || type === '[CUSTOMER_NAME]') && row?.customer?.customerInfo?.companyName) {
        return fieldRow(encName, `<span>${escapeHtml(row.customer.customerInfo.companyName)}</span>`);
    }

    if (rawType === '[REPORT_DATE]' || type === '[REPORT_DATE]') {
        return fieldRow(encName, `<span>${escapeHtml(moment().format('DD MMM YYYY h:mm:ss a'))}</span>`);
    }

    if (rawType === '[REPORT_TIME]' || type === '[REPORT_TIME]') {
        return fieldRow(encName, `<span>${escapeHtml(moment().format('h:mm:ss a'))}</span>`);
    }

    if (type === 'TEXT' && name !== 'Note' && val) {
        return fieldRow(encName, `<span>${escapeHtml(val)}</span>`);
    }

    if ((type === 'TEXTAREA' || type === 'TEXT_AREA') && val) {
        return fieldRow(encName, `<span style="white-space:pre-wrap;">${escapeHtml(val)}</span>`);
    }

    if (type === 'RICH_TEXT' && val) {
        const plain = stripHtmlTags(val);
        return fieldRow(encName, `<span style="white-space:pre-wrap;">${escapeHtml(plain)}</span>`);
    }

    if ((type === 'DATE' || type === 'DATE_PICKER') && val) {
        return fieldRow(encName, `<span>${escapeHtml(val)}</span>`);
    }

    if (type === 'DATETIME' && val) {
        return fieldRow(encName, `<span>${escapeHtml(moment(val).format('DD MMM YYYY h:mm a'))}</span>`);
    }

    if (type === 'TIME' && val && String(val) !== 'Invalid date') {
        return fieldRow(encName, `<span>${escapeHtml(val)}</span>`);
    }

    if (type === 'SELECT' || type === 'DROPDOWN') {
        return fieldRow(encName, `<span>${escapeHtml(val ?? '')}</span>`);
    }

    if (type === 'NUMBER' || type === 'PERCENTAGE' || type === 'CURRENCY' || type === 'INTEGER' || type === 'DECIMAL') {
        if (val === '' || val == null) return fieldRow(encName, `<span></span>`);
        return fieldRow(encName, `<span>${escapeHtml(val)}</span>`);
    }

    if (type === 'CHECKLIST' && val) {
        return fieldRow(encName, `<span>${formatChecklistForPdf(val)}</span>`);
    }

    if (type === 'TABLE' && val) {
        return fieldRow(encName, formatTableForPdf(val));
    }

    if (type === 'GPS' || type === 'LOCATION' || type === 'GEO') {
        if (!val) return fieldRow(encName, `<span></span>`);
        let text = String(val);
        try {
            const o = JSON.parse(String(val));
            if (o && typeof o === 'object') text = JSON.stringify(o);
        } catch {
            /* keep string */
        }
        return fieldRow(encName, `<span style="white-space:pre-wrap;">${escapeHtml(text)}</span>`);
    }

    if (type === 'SIGNATURE' && val) {
        const s = String(val).trim();
        if (/^data:image\//i.test(s) || /^https?:\/\//i.test(s)) {
            try {
                const buf = await loadImageBufferForPdf(s);
                const uri = await imageBufferToJpegDataUri(buf);
                return fieldRow(
                    encName,
                    `<span><img alt="" style="max-width:220px;max-height:120px;" src="${escapeAttr(uri)}" /></span>`,
                );
            } catch {
                return fieldRow(encName, `<span>${escapeHtml(s.slice(0, 200))}</span>`);
            }
        }
        return fieldRow(encName, `<span style="white-space:pre-wrap;">${escapeHtml(s)}</span>`);
    }

    if (type === 'IMAGES' || type === 'FILE' || type === 'FILES') {
        return await buildImagesBlock(name, val);
    }

    if (type === 'VIDEOS' || type === 'VIDEO' || type === 'AUDIO') {
        const urls = parseReportMediaList(val);
        let links = '';
        for (const file of urls) {
            const href = escapeAttr(file);
            links += `<div class="images-item"><a href="${href}">${escapeHtml(file)}</a></div>`;
        }
        return `
          <div class="row"> <div class="item40"><div class="name"> <span>${encName}</span> </div></div><div class="item60"></div></div>
          <div class="images">${links}</div>`;
    }

    if (val !== '' && val != null && String(val).trim() !== '') {
        if (typeof val === 'object') {
            return fieldRow(
                encName,
                `<pre style="margin:0;font-size:12px;white-space:pre-wrap;">${formatJsonPretty(val)}</pre>`,
            );
        }
        return fieldRow(encName, `<span style="white-space:pre-wrap;">${escapeHtml(val)}</span>`);
    }

    return '';
}

async function convertHtmlToPdf(row: any, rItems: any, rowNumber: number) {
    const templatePath = resolveReportPdfTemplatePath();
    let html = fs.readFileSync(templatePath, 'utf8');
    console.log('1. convert to pdf', { templatePath, items: rItems?.length });

    const legacyLogoUrl = 'http://3.104.215.45:8001/public/upload/files/logo-a8a4.png';
    const logoDataUri = await resolveReportPdfLogoDataUri();
    if (logoDataUri) {
        if (html.includes('{{LOGO_URL}}')) {
            html = html.replace(/\{\{LOGO_URL\}\}/g, escapeAttr(logoDataUri));
        }
        html = html.split(legacyLogoUrl).join(escapeAttr(logoDataUri));
    } else if (html.includes('{{LOGO_URL}}')) {
        html = html.replace(
            /<img class="logo"[^>]*\/>/i,
            '<!-- report logo not configured -->',
        );
    }

    let content = ``;
    const newItems = Array.isArray(rItems) ? rItems : [];
    if (newItems.length > 0) {
        const checkNote = newItems.find((c: any) => c.name === 'Note');
        if (checkNote) {
            content += `
            <div class="row">
                <div class="item100"><b>${escapeHtml(checkNote.value)}</b></div>
            </div>`;
        }
        for (const it of newItems) {
            content += await renderReportField(row, it, { hasNoteHeader: !!checkNote });
        }
    }

    const title = row?.reportTemplate?.name ?? 'Report';
    html = html.replace('{{TITLE}}', escapeHtml(title));
    html = html.replace('{{CUR_DATE}}', escapeHtml(moment().format('DD MMM YYYY')));
    html = html.replace('{{CONTENT}}', content);

    const isWindows = process.platform === 'win32';
    const execPath =
        process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
        process.env.CHROME_PATH?.trim() ||
        (!isWindows ? '/usr/bin/chromium' : undefined);

    let browser: any;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            ignoreDefaultArgs: ['--disable-extensions'],
            ...(execPath ? { executablePath: execPath } : {}),
            args: [
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu=False',
                '--window-size=1600,900',
                '--start-maximized',
            ],
            timeout: 30_000,
            protocolTimeout: 60_000,
        });
    } catch (e) {
        console.error('Puppeteer launch failed', e);
        throw e;
    }

    await sleep(500);
    const page = await browser.newPage();
    console.log('2 convert to pdf');
    await page.setContent(html, { waitUntil: 'load', timeout: 120_000 });

    // Same basename pattern as S3 (`report_<timestamp>.pdf`) so stored URLs stay consistent.
    const reportPdfFileName = `report_${Date.now()}.pdf`;
    const relativePdfPath = path.join('public', 'pdf', reportPdfFileName).replace(/\\/g, '/');
    const localPdfPath = path.join(getPublicRoot(), 'pdf', reportPdfFileName);

    await fs.promises.mkdir(path.dirname(localPdfPath), { recursive: true });

    console.log('3 convert to pdf');
    try {
        await page.pdf({
            path: localPdfPath,
            format: 'A4',
            displayHeaderFooter: true,
            printBackground: false,
            preferCSSPageSize: false,
            margin: { top: '30px', bottom: '30px' },
        });
    } finally {
        await browser.close().catch(() => undefined);
    }

    const documentAsBytes = await fs.promises.readFile(localPdfPath);
    const pdfDoc = await PDFDocument.load(documentAsBytes);
    const numberOfPages = pdfDoc.getPages().length;
    const submittedByLabel = getReportPdfSubmittedByLabel(row);
    const submittedAt = row?.updatedAt || row?.createdAt;
    const submittedStamp = submittedAt
        ? moment(submittedAt).format('DD MMM YYYY @ HH:mm:ss')
        : moment().format('DD MMM YYYY @ HH:mm:ss');
    for (let i = 0; i < numberOfPages; i++) {
        const pg = pdfDoc.getPages()[i];
        if (pg) {
            const pageSize = pg.getSize();
            const bottomX = pageSize.width - 70;
            pg.drawText(`Page ${i + 1}`, { x: bottomX, y: 18, size: 9 });
            pg.drawText(title, { x: 30, y: 36, size: 9 });
            pg.drawText(`Submitted by: ${submittedByLabel} @ ${submittedStamp}`, {
                x: 30,
                y: 18,
                size: 9,
            });
            pg.drawText(`Submitted Id: ${rowNumber} Your Partner in Facilities www.servicelink.net.au`, {
                x: 30,
                y: 8,
                size: 9,
            });
            pg.drawLine({
                start: { x: 10, y: 30 },
                end: { x: pageSize.width - 10, y: 32 },
                thickness: 2,
                color: rgb(0.21, 0.66, 0),
                opacity: 0.75,
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    const finalBuffer = Buffer.from(pdfBytes);

    if (shouldUploadReportPdfsToS3()) {
        try {
            const url = await uploadBufferToS3(
                finalBuffer,
                reportPdfFileName,
                'application/pdf',
                reportPdfFileName,
            );
            await fs.promises.unlink(localPdfPath).catch(() => undefined);
            return url;
        } catch (e) {
            console.error('PDF S3 upload failed', e);
            await fs.promises.unlink(localPdfPath).catch(() => undefined);
            throw e instanceof Error ? e : new Error(String(e));
        }
    }

    await fs.promises.writeFile(localPdfPath, finalBuffer);
    return joinPublicUrl(config.BASE_UPLOAD_URL || '', relativePdfPath);
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;

    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
}


export {
    Chr4,
    uploadImageToS3,
    IsEmptyOrUndefined,
    customHttpCode,
    Chr6,
    editFileName,
    imageFileFilter,
    synUserInfoToRedisV2,
    removeAccents,
    makeOTP,
    convertToSlug,
    convertNumber,
    fGetParm,
    convertHtmlToPdf
}