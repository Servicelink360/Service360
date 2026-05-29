# Simpler AWS test deploy from GitHub

Skip EC2 + SSH + many secrets. Use AWS consoles that connect directly to GitHub.

| Part | AWS service | Why simpler |
|------|-------------|-------------|
| Admin UI | **Amplify Hosting** | Connect GitHub → auto build on every push |
| API | **App Runner** | Connect GitHub → uses `Dockerfile` |
| Database | **RDS** or **Lightsail database** | One wizard, one endpoint |

---

## Part A — Admin (easiest, do this first)

1. Open [AWS Amplify](https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2)
2. **Create new app** → **Host web app** → **GitHub** → authorize → repo **Service360**
3. Branch: `main`
4. Amplify detects `amplify.yml` at repo root
5. **Environment variables** (Amplify → App settings → Environment variables):

   | Name | Value (after API exists) |
   |------|--------------------------|
   | `REACT_APP_ORDER_API_URL` | `https://xxxxx.ap-southeast-2.awsapprunner.com/` |

   (Use your App Runner URL from Part B.)

6. **Save and deploy** → you get a URL like `https://main.xxxxx.amplifyapp.com`

Every `git push` to `main` redeploys the admin automatically.

---

## Part B — API (App Runner)

1. Open [App Runner](https://ap-southeast-2.console.aws.amazon.com/apprunner/home?region=ap-southeast-2)
2. **Create service**
3. **Source**: Repository → GitHub → **Service360** → branch `main`
4. **Source directory**: `service_link_api-main`
5. **Build**: Dockerfile (recommended) or use `apprunner.yaml`
6. **Port**: `5301`
7. **Environment variables** (from your `.env`, RDS endpoint):

   | Name | Value |
   |------|--------|
   | `DATABASE_HOST` | RDS endpoint |
   | `DATABASE_PORT` | `5432` |
   | `DATABASE_USERNAME` | `postgres` |
   | `DATABASE_PASSWORD` | (RDS password) |
   | `DATABASE_DB_NAME` | `service360` |
   | `DATABASE_SYNC` | `false` |
   | `REDIS_IP` | see Redis note below |
   | `JWT_SECRET_KEY` | (from .env) |
   | `BASE_UPLOAD_URL` | App Runner service URL |

8. **Networking** (optional but needed for RDS): Custom VPC → same VPC as RDS
9. **Create & deploy** → copy the `https://….awsapprunner.com` URL

Update Amplify `REACT_APP_ORDER_API_URL` to that URL.

### Redis

App Runner has no built-in Redis. Options:

- **Upstash** (free tier, URL in env) — simplest for test  
- **ElastiCache** in VPC — more setup  

Until Redis works, login may be slow/fail if the app requires Redis.

---

## Part C — Database (one-time)

1. [RDS → Create database](https://ap-southeast-2.console.aws.amazon.com/rds/home?region=ap-southeast-2#databases:) → PostgreSQL → free/low tier  
2. DB name: `service360`  
3. Restore dump from your PC:

```powershell
$env:RDS_HOST = "your-endpoint.ap-southeast-2.rds.amazonaws.com"
$env:RDS_PASSWORD = "your-password"
cd C:\app_pc
.\deploy\scripts\restore-database.ps1
```

Uses `29__05_2026.sql`.

4. RDS security group: allow **5432** from App Runner VPC connector security group.

---

## What you can ignore (old complex path)

- EC2 SSH deploy workflow  
- Many GitHub secrets (`EC2_SSH_KEY`, etc.)  
- Elastic IP on EC2  

Optional: disable workflow **Deploy from GitHub** if you only use Amplify + App Runner.

---

## Order (one at a time)

1. **RDS** + restore SQL  
2. **App Runner** (API) + env vars  
3. **Amplify** (admin) + `REACT_APP_ORDER_API_URL`  
4. Test login in browser
