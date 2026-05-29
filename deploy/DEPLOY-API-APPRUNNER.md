# Deploy API on AWS App Runner

Repo commit `b6d33a1` adds Dockerfile + RDS SSL cert. Use **Dockerfile** (not `apprunner.yaml` alone).

## Wizard — choose exactly this

### Step 1 — Source
- Repository: **GitHub** → **Servicelink360/Service360** → branch **main**
- **Source directory:** `service_link_api-main`
- Deployment trigger: **Automatic**

### Step 2 — Build settings
- **Configuration source:** **Dockerfile** ← important
- **Port:** `5301`

(Do **not** pick “apprunner.yaml only” unless Dockerfile fails — Dockerfile is the full Nest build.)

### Step 3 — Service settings → Environment variables

Add each row (copy values from `service_link_api-main/.env.prod` on your PC):

```
MODE=PROD
PORT=5301
DATABASE_CONNECTION=postgres
DATABASE_HOST=service360.cv8gj6fczued.ap-southeast-2.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<your-rds-password>
DATABASE_DB_NAME=service360
DATABASE_SYNC=false
DATABASE_SSL=true
BCRYPT_SALT=10
API_PREFIX=v1
JWT_SECRET_KEY=SVLink@2024
JWT_EXPIRES_IN=2592000s
JWT_REFRESH_SECRET_KEY=SVLink@2024
JWT_REFRESH_EXPIRES_IN=2592000s
PASSWORD_SALT=SVLinkSALT@2024
REDIS_PORT=6379
UPLOAD_USE_S3=true
S3_ACCESS_KEY=<from .env.prod>
S3_SECRET_ACCCESS=<from .env.prod>
S3_BUCKET=service360basket
S3_URL=s3.ap-southeast-2.amazonaws.com
```

**After App Runner is created**, edit and add:
```
BASE_UPLOAD_URL=https://YOUR-SERVICE-URL.awsapprunner.com/
```

### Step 4 — Redis (required — fix `localhost`)

`REDIS_IP=localhost` in `.env.prod` **does not work** on App Runner.

1. Go to https://upstash.com → create **Redis** (region ap-southeast-2 if possible)
2. Copy **Endpoint** host (e.g. `xxx-xxxx.upstash.io`)
3. Add env vars:
```
REDIS_IP=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
```

### Step 5 — Networking (RDS)

- **Custom VPC connector** → VPC **`vpc-e533d383`** (same as RDS)
- Pick **2 subnets** in that VPC
- Create / select security group for connector

**Then RDS security group:**
- Inbound rule: **PostgreSQL 5432** from **App Runner connector security group**

Without this, API starts but DB login fails.

### Step 6 — Create & wait
Status **Running** (first deploy ~10–15 min).

Copy service URL → `https://xxxxxxxx.ap-southeast-2.awsapprunner.com`

### Step 7 — Amplify admin
Amplify → Environment variables:
```
REACT_APP_ORDER_API_URL=https://xxxxxxxx.ap-southeast-2.awsapprunner.com/
```
Redeploy Amplify.

### Step 8 — Test
- Browser: `https://xxxxxxxx.ap-southeast-2.awsapprunner.com/api` (or prod swagger path)
- Admin: your Amplify URL → login

---

## Easier alternative (includes Redis)

Skip App Runner Redis setup — run on EC2 with Docker:

```cmd
aws configure
c:\app_pc\deploy\RUN-DEPLOY-API.cmd
```

Uses `docker-compose.aws-test.yml` (API + Redis + `.env.prod`).
