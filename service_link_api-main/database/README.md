# Database migrations

Manual SQL lives here when `DATABASE_SYNC=false` (TypeORM does not auto-alter tables).

## Dashboard unread counts (New Reports / Faults Reports)

**File:** `migrations/001_dashboard_unread_reports.sql`

Adds:

| Object | Purpose |
|--------|---------|
| `user_tasks.admin_opened_at` | Unread staff custom reports for admin |
| `report_faults.admin_opened_at` | Unread staff fault reports for admin |
| `schema_patches_applied` | One-time patch tracking |
| Baseline update | Marks all *existing* rows as read so badges start at **0** |
| Partial indexes | Faster dashboard count queries |

### Apply manually (psql)

```bash
psql -h localhost -p 5432 -U postgres -d service360 -f database/migrations/001_dashboard_unread_reports.sql
```

### Apply via npm (uses `.env`)

```bash
npm run db:dashboard-unread
```

### Automatic apply on API start

The API also runs the same changes in `PostgresSchemaPatchService` when the server boots.

After applying, **restart the API** and refresh the admin dashboard.

## Sites duplicate cleanup

**File:** `migrations/006_sites_dedupe_unique_id.sql`

Fixes job sites that were inserted 3× per id (513 rows, 171 real sites). Removes extra copies, adds `PRIMARY KEY` on `sites.id`, and resets the id sequence.

### Inspect (dry-run)

```bash
node scripts/inspect-sites-duplicates.js
node scripts/dedupe-sites.js
```

### Apply

```bash
node scripts/dedupe-sites.js --apply --record-patch
```

Safe to re-run after cleanup: no-op when duplicates are gone and the primary key exists.

## Report template ↔ services mapping

**File:** `migrations/026_report_template_departments.sql` (creates `report_template_departments`; renamed by 027 if applied)

Join table used when admins assign which services may use each report template in New Report.

### Apply via npm (uses `.env`)

```bash
npm run db:report-template-services
```

The API also creates this table on startup via `PostgresSchemaPatchService` (restart the API after pulling).

## Rename departments → services

**File:** `migrations/027_rename_departments_to_services.sql`

Renames `departments` → `services`, `department_id` → `service_id`, `report_template_departments` → `report_template_services`, and related constraints.

### Apply via npm (uses `.env`)

```bash
npm run db:rename-departments-to-services
```

The API applies this automatically on startup when the legacy `departments` table still exists.

## Full duplicate-id cleanup (site_items, staff, user_tasks, report_faults, …)

**Script:** `scripts/dedupe-duplicate-ids.js`  
**Root cause:** See `docs/DATABASE_CORRUPTION_ROOT_CAUSE.md`

```bash
npm run db:check
npm run db:dedupe-all:apply
```

Do **not** re-import `c:/app_pc/data/4.sql` or `5.sql` into a populated database (they COPY rows without primary keys).

Tables whose names end with `2` (e.g. `users2`) are legacy import staging — excluded from `db:unique-keys` / `db:check` PK warnings.
