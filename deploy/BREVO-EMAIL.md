# Brevo transactional email (Service360 API)

## Setup

1. [Brevo](https://www.brevo.com/) → **SMTP & API** → **API keys** → create a key (Transactional permission).
2. **Senders** → verify `mail@service360.com.au` (or your `MAIL_FROM` domain).
3. Set in `service_link_api-main/.env.prod` (local and EC2):

```env
MAIL_FROM=mail@service360.com.au
MAIL_FROM_NAME=Service360
BREVO_API_KEY=xkeysib-your-key-here
APP_URL=https://service360.com.au
SUPPORT_EMAIL=support@service360.com.au
```

4. Sync to EC2 (after `BREVO_API_KEY` is filled in local `.env.prod`):

```powershell
.\deploy\scripts\sync-mail-env-ec2.ps1
```

5. Verify on server:

```bash
sudo docker exec deploy-api-1 sh /tmp/verify-mail-env.sh
sudo docker exec deploy-api-1 sh /tmp/verify-brevo.sh
```

## Deploy

API code uses Brevo REST (`POST /v3/smtp/email`) via `axios` — no SendGrid package. Normal deploy:

```cmd
deploy\PUSH-CHANGED.cmd -Target api
```

## Migrated from SendGrid

- Remove `MAIL_PASSWORD` (SendGrid `SG.*` keys) from `.env.prod`.
- Use `BREVO_API_KEY` only.
