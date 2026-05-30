# Fast deploy (git push → live in ~5–12 min, EC2 update ~30 sec)

Builds run on **GitHub Actions** (not on your small EC2). Only compiled files are copied to the server.

## One-time setup (5 min)

GitHub → **Servicelink360/Service360** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|--------|
| `EC2_HOST` | `13.55.122.55` |
| `EC2_SSH_KEY` | Paste entire `.pem` file contents |
| `API_URL` | `http://13.55.122.55:5301/` (or `https://api.service360.com.au/` after SSL) |

## How it works

| You change | GitHub builds | EC2 time |
|------------|---------------|----------|
| API only | ~3 min | ~30 sec copy + restart |
| Admin only | ~8 min | ~30 sec copy |
| Both | parallel jobs | ~30 sec each |

Push to `main` → **Actions** tab shows progress. No SSH needed.

## Manual deploy

Actions → **Fast deploy to EC2** → **Run workflow** → choose `api`, `admin`, or `both`.

## On the server (first time only)

Ensure `ec2-apply-artifacts.sh` exists:

```bash
sudo git -C /opt/app pull
sudo chmod +x /opt/app/deploy/ec2-apply-artifacts.sh
```

Containers must be named `deploy-api-1` and `deploy-admin-1` (default docker compose).
