# Service360 AWS test deploy

Database seed: **`deploy/database/29__05_2026.sql`** (from `C:\app_pc\29__05_2026.sql`).

## One-time (local, full auto)

```powershell
cd C:\app_pc
$env:RDS_PASSWORD = "YourStrongPassword123!"
.\deploy\scripts\deploy-all.ps1
```

Creates RDS + EC2 + restores DB + builds admin → S3. Needs [AWS CLI](https://aws.amazon.com/cli/) and [PostgreSQL `psql`](https://www.postgresql.org/download/windows/).

## DB only (existing RDS)

```powershell
$env:RDS_HOST = "your-db.xxxx.ap-southeast-2.rds.amazonaws.com"
$env:RDS_PASSWORD = "..."
.\deploy\scripts\restore-database.ps1
```

Uses `C:\app_pc\29__05_2026.sql` or `deploy/database/29__05_2026.sql`.

## GitHub Actions

Repo → **Settings → Secrets**:

| Secret | Example |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | `ap-southeast-2` |
| `RDS_HOST` | RDS endpoint |
| `RDS_PASSWORD` | DB password |
| `API_URL` | `http://EC2_IP:5301/` |
| `ADMIN_S3_BUCKET` | `service360-test-admin-...` |
| `EC2_HOST` | (optional) EC2 public IP |
| `EC2_SSH_KEY` | (optional) private key PEM |

Run workflow **AWS Test Deploy** (or push to `main`).
