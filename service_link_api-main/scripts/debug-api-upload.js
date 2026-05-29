/**
 * Debug multipart upload + optional createCustomerReports against a running API.
 *
 * From repo root (service_link_api-main):
 *   node scripts/debug-api-upload.js
 *
 * Env (optional):
 *   API_BASE              default http://localhost:5301
 *   DEBUG_JWT             Bearer token (same as admin id_token) for protected tests
 *   DEBUG_PROBE_REPORTS=1 POST /v1/user-tasks/createCustomerReports with DEBUG_* ids
 *   DEBUG_SITE_ID         number (required with probe)
 *   DEBUG_CUSTOMER_ID     number
 *   DEBUG_REPORT_TEMPLATE_ID number
 */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = (process.env.API_BASE || 'http://localhost:5301').replace(/\/+$/, '');
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function mask(s) {
  if (!s || s.length < 8) return s ? '***' : '(empty)';
  return `${String(s).slice(0, 4)}…${String(s).slice(-2)}`;
}

async function postMultipart(url, token) {
  const form = new FormData();
  form.append('file', new Blob([PNG_1x1], { type: 'image/png' }), 'debug-upload.png');

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: form });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

async function postJson(url, token, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

async function main() {
  console.log('--- debug-api-upload ---');
  console.log('API_BASE:', API_BASE);
  const upS3 = String(process.env.UPLOAD_USE_S3 || '').toLowerCase();
  console.log('UPLOAD_USE_S3:', upS3 || '(unset)');
  console.log('S3_BUCKET:', process.env.S3_BUCKET || '(unset)');
  console.log('S3_URL:', process.env.S3_URL || '(unset)');
  console.log('S3_ACCESS_KEY:', mask(process.env.S3_ACCESS_KEY));

  const uploadUrl = `${API_BASE}/v1/uploadFile`;
  console.log('\n[1] POST', uploadUrl, '(multipart, field=file, debug-upload.png)');
  const r1 = await postMultipart(uploadUrl, process.env.DEBUG_JWT);
  console.log('status:', r1.status, 'ok:', r1.ok);
  console.log('body:', JSON.stringify(r1.body, null, 2));

  if (r1.body?.code === 1 && r1.body?.data) {
    console.log('\nUpload OK. data (URL or path):', r1.body.data);
  } else {
    console.log('\nUpload did not return code=1. Check API logs, S3 ACL/credentials, and UPLOAD_USE_S3.');
  }

  const probe = String(process.env.DEBUG_PROBE_REPORTS || '').toLowerCase();
  if (probe === '1' || probe === 'true' || probe === 'yes') {
    const token = process.env.DEBUG_JWT;
    if (!token) {
      console.log('\n[2] Skipping createCustomerReports: set DEBUG_JWT to a valid admin Bearer token.');
      return;
    }
    const siteId = Number(process.env.DEBUG_SITE_ID);
    const customerId = Number(process.env.DEBUG_CUSTOMER_ID);
    const reportTemplateId = Number(process.env.DEBUG_REPORT_TEMPLATE_ID);
    if (!Number.isFinite(siteId) || siteId <= 0 || !Number.isFinite(customerId) || customerId <= 0 || !Number.isFinite(reportTemplateId) || reportTemplateId <= 0) {
      console.log('\n[2] Skipping createCustomerReports: set DEBUG_SITE_ID, DEBUG_CUSTOMER_ID, DEBUG_REPORT_TEMPLATE_ID to positive numbers from your DB.');
      return;
    }
    const now = new Date().toISOString();
    const payload = {
      taskName: 'debug-api-upload',
      description: 'created by scripts/debug-api-upload.js',
      siteId,
      siteName: 'debug-site',
      siteLocation: '',
      siteAddress: '',
      staffId: 0,
      serviceId: '',
      serviceName: '',
      customerName: 'debug',
      companyName: '',
      customerId,
      startTime: now,
      endTime: now,
      checkIn: now,
      completed: now,
      status: 1,
      reportTemplateId,
      notifiesStaff: 1,
      items: [{ name: 'Note', type: 'TEXT', order: 1, value: 'debug' }],
    };
    const reportUrl = `${API_BASE}/v1/user-tasks/createCustomerReports`;
    console.log('\n[2] POST', reportUrl);
    const r2 = await postJson(reportUrl, token, payload);
    console.log('status:', r2.status, 'ok:', r2.ok);
    console.log('body:', JSON.stringify(r2.body, null, 2));
  } else {
    console.log('\n[2] Skipped (set DEBUG_PROBE_REPORTS=1 and DEBUG_JWT + DEBUG_* ids to test createCustomerReports).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
