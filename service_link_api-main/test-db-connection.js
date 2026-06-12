require('./scripts/load-env');
const { createConnection } = require('typeorm');

async function testDbConnection() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB_NAME,
    });
    await connection.query('SELECT NOW()');
    console.log('Database connection successful!');
    await connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testDbConnection();
