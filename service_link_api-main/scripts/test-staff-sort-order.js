require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { SitesService } = require('../dist/src/sites/sites.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const sites = app.get(SitesService);
  const admin = {
    userId: 1,
    username: 't',
    fullName: 'T',
    email: 't@t.com',
    type: 3,
    companyId: '',
    serviceId: '',
    positionId: '',
    roleIds: [],
  };
  const desc = await sites.findAll(admin, {
    page: 1,
    limit: 15,
    orderBy: 'staffCount',
    orderValue: 'DESC',
    staffId: '0',
  });
  const asc = await sites.findAll(admin, {
    page: 1,
    limit: 15,
    orderBy: 'staffCount',
    orderValue: 'ASC',
    staffId: '0',
  });
  console.log(
    'DESC',
    desc.data.rows.map((r) => ({ id: r.id, staffCount: r.staffCount })),
  );
  console.log(
    'ASC',
    asc.data.rows.map((r) => ({ id: r.id, staffCount: r.staffCount })),
  );
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
