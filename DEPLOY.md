# Deploy — read this first

**Changed code only. Never full rebuild on EC2.**

```cmd
deploy\PUSH-CHANGED.cmd
```

- Builds API and/or admin on your PC (or GitHub Actions on push)
- Copies only `dist/` or `build/` to EC2 (~30 sec)
- Server: `ec2-apply-artifacts.sh` — no docker build, no git pull

Full docs: [deploy/GITHUB-FAST-DEPLOY.md](deploy/GITHUB-FAST-DEPLOY.md)

Do **not** use `ec2-deploy.sh` or `docker compose build` on the server (OOM).
