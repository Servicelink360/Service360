/**
 * Legacy pg_dump tables (name ends with `2`) — not part of app integrity tooling.
 * Examples: users2. Still used optionally by import-user-from-users2.js.
 */
function isLegacySuffix2Table(tableName) {
  return typeof tableName === 'string' && /2$/.test(tableName);
}

module.exports = { isLegacySuffix2Table };
