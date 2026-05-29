# Amplify build failed — what we fixed

## Causes

1. **`npm run build` used Windows `set`** — fails on Amplify (Linux).
2. **Build phase did not `cd service_link_admin-main`** — build ran in wrong folder.
3. **30 min fail** — usually timeout during `npm install` or stuck build.

## After push to `main`

1. Amplify → **Redeploy this version** (or wait for auto-build).
2. **App settings → Environment variables** (required for login):

   | Name | Example |
   |------|---------|
   | `REACT_APP_ORDER_API_URL` | `http://54.206.147.215:5301/` or App Runner URL |

3. Build should finish in **~10–20 minutes** (not 30+ fail).

## If it still fails

Open failed build → **View logs** → find first red `ERROR` line and share that line only.
