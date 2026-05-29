# Database duplicate-row corruption (root cause)

## Symptoms

- Job sites list slow or staff column sort appears broken.
- Same `id` appears **2–3 times** in `sites`, `site_items`, `site_item_staffs`, etc.
- Joins multiply rows (e.g. 3×3 = 9 rows for one staff assignment).

## Root cause (confirmed)

1. **Schema from legacy pg_dump had no PRIMARY KEY** on several core tables (`sites`, `site_items`, `site_item_staffs`, `site_item_staff_shifts`, …). See `c:/app_pc/data/4.sql` and `c:/app_pc/data/5.sql`: they `CREATE TABLE` and `COPY` data but never `ADD CONSTRAINT … PRIMARY KEY` for those tables.

2. **The same dump data was loaded multiple times** (typically **3×**). With no primary key, PostgreSQL accepts repeated `COPY` rows with the same `id`.

3. **Shadow tables from the same dumps** (`user_tasks1`, `user_task_reports1`, `report_fault_answers1`) were created with primary-key index names (`user_tasks_pkey`, etc.) that belong on the real tables. Adding a PK to `user_tasks` then fails with `relation "user_tasks_pkey" already exists`.

4. **TypeORM entities use `@PrimaryGeneratedColumn()`**, but the live DB was not created by `DATABASE_SYNC=true`; it was restored from SQL dumps. ORM assumptions (unique `id`) did not match the database.

**Out of scope:** tables whose names end with `2` (e.g. `users2`) are legacy dump/import staging — integrity scripts and API patches do not add PK/UNIQUE to them. Safe to `DROP` when you no longer need `import-user-from-users2.js`:

```bash
npm run db:list-droppable      # what can go
npm run db:drop-legacy-sql     # review DROP statements, then run in psql
```

## What did *not* cause it

- Normal `sitesRepository.save()` on a table **with** a primary key would fail on duplicate `id`.
- `initialSeed.ts` only touches users (empty array).
- `import-user-from-users2.js` remaps user ids; it does not triple-insert site rows.

## Prevention

1. **Never re-run** `data/4.sql` or `data/5.sql` `COPY` sections on a database that already has data.
2. After restore, always run:
   ```bash
   node scripts/dedupe-duplicate-ids.js --apply --record-patch
   ```
3. Keep `DATABASE_SYNC=false` in production; use migrations + patches instead of full dumps.
4. API startup runs `PostgresSchemaPatchService.ensureCoreTablePrimaryKeys()` and `ensureBusinessUniqueConstraints()` (idempotent).
5. Run once per environment:
   ```bash
   npm run db:unique-keys:apply
   ```
   This adds PRIMARY KEY on `id` and UNIQUE on natural keys (`site_id+department_id+customer_id`, `site_item_id+staff_id`, etc.) so PostgreSQL rejects duplicate inserts.

## Repair (one-time per environment)

```bash
cd service_link_api-main
node scripts/check-db-corruption.js
node scripts/dedupe-duplicate-ids.js --apply --record-patch
node scripts/check-db-corruption-deep.js
```

`sites` was cleaned earlier with `scripts/dedupe-sites.js`; the script above handles related tables.
