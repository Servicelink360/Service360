# Deploy from GitHub (push → AWS)

Repo: **https://github.com/Servicelink360/Service360**

Workflow: **Actions → Deploy from GitHub**

---

## One-time AWS setup (manual, before GitHub works)

Do these once in AWS Console (Sydney `ap-southeast-2`):

### 1. EC2 server

- Ubuntu 22.04, `t3.small`
- Security group: ports **22**, **5301**
- [Elastic IP](https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2#Addresses:) attached → your **test IP**, e.g. `3.104.x.x`

### 2. SSH key for GitHub

On EC2, ensure user `ubuntu` can use Docker:

```bash
sudo usermod -aG docker ubuntu
```

On your PC, you need the **private key** (`.pem`) for that instance.

### 3. RDS PostgreSQL

- Engine: PostgreSQL 16
- DB name: `service360`
- Note **endpoint** and **password**

### 4. S3 bucket (admin UI)

- Create bucket, enable **Static website hosting**
- Bucket policy: public read on objects (test only)

### 5. IAM user for GitHub

Create IAM user with policies: `AmazonEC2ReadOnlyAccess` (optional), `AmazonS3FullAccess`, plus custom or use **AdministratorAccess** for test.

Create **access key** for Actions.

---

## GitHub secrets (required)

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | `...` |
| `AWS_REGION` | `ap-southeast-2` |
| `EC2_HOST` | Elastic IP, e.g. `3.104.215.45` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full contents of `.pem` file |
| `RDS_HOST` | `xxx.ap-southeast-2.rds.amazonaws.com` |
| `RDS_PASSWORD` | RDS master password |
| `API_URL` | `http://3.104.215.45:5301/` |
| `ADMIN_S3_BUCKET` | `service360-test-admin-123456789` |

---

## How to deploy

### Automatic (every push to `main`)

```bash
git add .
git commit -m "your change"
git push origin main
```

GitHub builds admin → S3 and SSH to EC2 → `git pull` + Docker.

### Manual (pick a step)

**Actions → Deploy from GitHub → Run workflow**

| Step option | Does |
|-------------|------|
| `all` | API + admin |
| `api-only` | EC2 Docker only |
| `admin-only` | S3 only |
| `restore-database` | Load `29__05_2026.sql` to RDS |

Check **restore database** only when you want to reload the dump.

---

## First database load

1. Actions → **Deploy from GitHub** → Run workflow  
2. Step: `restore-database`  
3. Or: `all` + check **restore database**

---

## Verify

- API: open `API_URL` in browser  
- Admin: `http://<bucket>.s3-website-ap-southeast-2.amazonaws.com`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| SSH failed | Check `EC2_HOST`, `EC2_SSH_KEY`, port 22 open |
| API 502 / no response | Port **5301** open; on EC2: `sudo docker ps` |
| Admin blank / wrong API | `API_URL` secret must match Elastic IP + `/` at end |
| DB connection error | `RDS_HOST` / `RDS_PASSWORD`; RDS SG allows EC2 SG on 5432 |
