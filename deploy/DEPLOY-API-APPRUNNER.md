# Deploy API on AWS App Runner (15 min, console)

RDS is ready. Do this once in AWS Console.

## 1. Open App Runner

https://ap-southeast-2.console.aws.amazon.com/apprunner/home?region=ap-southeast-2#/services/create

## 2. Source

- **Repository type:** Source code repository  
- **Connect to GitHub** → **Service360** → branch **main**  
- **Source directory:** `service_link_api-main`  
- **Deployment:** Automatic  

## 3. Build

- **Configuration file:** Use a configuration file → **Dockerfile** (or `apprunner.yaml`)  
- **Port:** `5301`  

## 4. Environment variables (copy all)

| Key | Value |
|-----|--------|
| `MODE` | `PROD` |
| `PORT` | `5301` |
| `DATABASE_HOST` | `service360.cv8gj6fczued.ap-southeast-2.rds.amazonaws.com` |
| `DATABASE_PORT` | `5432` |
| `DATABASE_USERNAME` | `postgres` |
| `DATABASE_PASSWORD` | *(your RDS password)* |
| `DATABASE_DB_NAME` | `service360` |
| `DATABASE_SYNC` | `false` |
| `DATABASE_SSL` | `true` |
| `REDIS_IP` | *(see Redis below)* |
| `REDIS_PORT` | `6379` |
| `JWT_SECRET_KEY` | *(from .env.prod)* |
| `JWT_REFRESH_SECRET_KEY` | *(from .env.prod)* |
| `PASSWORD_SALT` | *(from .env.prod)* |
| `BASE_UPLOAD_URL` | `https://YOUR-APPRUNNER-URL/` *(update after create)* |

## 5. Redis (required)

App Runner has no Redis. Pick one:

- **Upstash** (free): https://upstash.com → Redis → copy host → `REDIS_IP` = host, add `REDIS_PASSWORD` if set  
- **Or** deploy API on **EC2** with `docker-compose.aws-test.yml` (includes Redis)

## 6. VPC (RDS access)

- **Custom VPC connector** → same VPC as RDS (`vpc-e533d383`)  
- Subnets: private or public subnets in that VPC  
- Security group: allow **outbound** to RDS on **5432**  
- RDS security group: allow **5432** from App Runner connector SG  

## 7. Create & deploy

Wait until status **Running**. Copy URL, e.g. `https://xxxxx.ap-southeast-2.awsapprunner.com`

## 8. Update Amplify admin

Amplify → **Environment variables** → `REACT_APP_ORDER_API_URL` = `https://xxxxx.ap-southeast-2.awsapprunner.com/` → **Redeploy**

## 9. Test

- `https://YOUR-APPRUNNER-URL/`  
- Login via Amplify admin URL  
