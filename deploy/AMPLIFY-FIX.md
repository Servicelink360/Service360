# Amplify build failed — fixes

## Common causes

1. **CKEditor not built** — `ckeditor5/build/ckeditor.js` is not in git; Amplify must run `npm run build` inside `ckeditor5/` first (see root `amplify.yml`).
2. **`npm run build` used Windows `set`** — use `cross-env` (already in `package.json`).
3. **Warnings fail build** — set `CI=false` in `amplify.yml` / Amplify env.
4. **30 min timeout** — large `npm install`; use build cache or retry.
5. **Wrong app** — use Amplify app **Service360**, branch **`main`** (not old `service_link_admin` / `dev`).

## Environment variables (Amplify console)

| Name | Example |
|------|---------|
| `REACT_APP_ORDER_API_URL` | `http://3.106.200.185:5301/` |
| `REACT_APP_MODE` | `PROD` |
| `CI` | `false` |

## If it still fails

Failed build → **View logs** → copy the **first red `ERROR`** line.

## Admin without Amplify (EC2 fallback)

On EC2 after API is up:

```bash
cd /opt/app/service_link_admin-main/ckeditor5 && npm install && npm run build
cd /opt/app/service_link_admin-main
echo 'REACT_APP_ORDER_API_URL=http://3.106.200.185:5301/' > .env.production.local
echo 'REACT_APP_MODE=PROD' >> .env.production.local
npm install --legacy-peer-deps
npm run build
sudo apt-get install -y nginx
sudo cp -r build/* /var/www/html/
sudo systemctl restart nginx
```

Open `http://YOUR-EC2-IP/` (security group port **80**).
