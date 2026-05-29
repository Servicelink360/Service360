/**
 * Exercises SitesService.findAll with orderBy=staffCount (TypeORM path).
 * Run from service_link_api-main: node scripts/test-sites-staff-sort-typeorm.js
 */
require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { SitesService } = require('../dist/src/sites/sites.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const sites = app.get(SitesService);
    const admin = {
      userId: 1,
      username: 'test',
      fullName: 'Test',
      email: 'test@test.com',
      type: 3,
      companyId: '',
      serviceId: '',
      positionId: '',
      roleIds: [],
    };
    const result = await sites.findAll(admin, {
      page: 1,
      limit: 5,
      orderBy: 'staffCount',
      orderValue: 'DESC',
      staffId: '0',
    });
    if (result.status !== 1 && result.status !== 200) {
      console.error('FAILED', result);
      process.exit(1);
    }
    console.log('OK count=', result.data?.count, 'rows=', result.data?.rows?.length);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
