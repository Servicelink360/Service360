/** Load .env then .env.local (local always wins). Use in node scripts. */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  Object.assign(process.env, parsed);
}

applyEnvFile(path.join(root, '.env'));
applyEnvFile(path.join(root, '.env.local'));

module.exports = { root };
