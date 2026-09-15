/**
 * Force-seed training modules from JSON (local or via container env).
 * Run: node scripts/seed-training-modules.js
 * FORCE=1 replaces existing modules.
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const ssl =
    String(process.env.DATABASE_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DATABASE_HOST || '').includes('rds.amazonaws.com')
      ? { rejectUnauthorized: false }
      : undefined;
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl,
  });
  await client.connect();

  const jsonPath = path.join(
    __dirname,
    '..',
    'src',
    'training',
    'data',
    'training-modules.json',
  );
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const force = String(process.env.FORCE || '0') === '1';

  const existing = await client.query(`SELECT COUNT(*)::int AS n FROM training_modules`);
  if (existing.rows[0].n > 0 && !force) {
    console.log('training_modules already has', existing.rows[0].n, 'rows (set FORCE=1 to replace)');
    await client.end();
    return;
  }

  await client.query('BEGIN');
  try {
    if (force) {
      await client.query('DELETE FROM training_quiz_attempts');
      await client.query('DELETE FROM training_progress');
      await client.query('DELETE FROM training_questions');
      await client.query('DELETE FROM training_topics');
      await client.query('DELETE FROM training_modules');
    }

    for (const mod of payload.modules || []) {
      const ins = await client.query(
        `INSERT INTO training_modules
          (code, title, description, duration_mins, sort_order, status, source_file, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,1,$6,NOW(),NOW())
         RETURNING id`,
        [
          mod.code,
          mod.title,
          mod.description || '',
          mod.durationMins || 30,
          mod.sortOrder || 0,
          mod.sourceFile || null,
        ],
      );
      const moduleId = ins.rows[0].id;
      for (const t of mod.topics || []) {
        await client.query(
          `INSERT INTO training_topics (module_id, title, body, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [moduleId, t.title, t.body, t.order || 0],
        );
      }
      for (const q of mod.questions || []) {
        if (!q.correctKey) continue;
        await client.query(
          `INSERT INTO training_questions
            (module_id, type, prompt, options, correct_key, sort_order)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
          [
            moduleId,
            q.type || 'MCQ',
            q.prompt,
            JSON.stringify(q.options || []),
            q.correctKey,
            q.order || 0,
          ],
        );
      }
      console.log('seeded', mod.code, 'id=', moduleId);
    }
    await client.query('COMMIT');
    console.log('Done');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
