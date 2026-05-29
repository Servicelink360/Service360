# Service360 AWS deploy — one step at a time

**Deploy from GitHub:** see **[GITHUB-DEPLOY.md](./GITHUB-DEPLOY.md)** (push to `main` → Actions deploys).

Region: **ap-southeast-2** (Sydney)

| Step | What | Status |
|------|------|--------|
| 1 | AWS resources + GitHub secrets | ⬜ |
| 2 | RDS PostgreSQL (`create-rds-test.ps1` or console) | ⬜ |
| 3 | Restore `29__05_2026.sql` | ⬜ |
| 4 | EC2 Elastic IP + port 5301 | ⬜ |
| 5 | GitHub Action: api-only (or push main) | ⬜ |
| 6 | GitHub Action: admin-only (or push main) | ⬜ |
