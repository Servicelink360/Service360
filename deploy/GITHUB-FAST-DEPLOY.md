# Fast deploy — only changed code

Builds run on **GitHub** or **your PC**. The server only receives compiled files (~30 sec). No full docker rebuild on EC2.

## From your PC (fastest if GitHub secrets not set)

```cmd
deploy\PUSH-CHANGED.cmd
```

Detects whether API or admin changed, builds only that, copies `dist/` or `build/` to EC2.

Force one service:

```cmd
deploy\PUSH-CHANGED.cmd -Target api
deploy\PUSH-CHANGED.cmd -Target admin
```

## From git push (GitHub Actions)

One-time secrets: `EC2_HOST`, `EC2_SSH_KEY`, `API_URL`

| You change | What runs |
|------------|-----------|
| `service_link_api-main/**` only | API job only |
| `service_link_admin-main/**` only | Admin job only |
| Both folders | Both jobs (parallel) |
| Docs / deploy scripts only | **Nothing** (skipped) |

Push to `main` → Actions tab. Manual: **Fast deploy to EC2** → pick `api` / `admin` / `both`.

## What the server does

```bash
# Copies compiled output into running containers + restart (~30 sec)
ec2-apply-artifacts.sh api|admin
```

No `git pull`. No `docker build`. No React compile on EC2.
