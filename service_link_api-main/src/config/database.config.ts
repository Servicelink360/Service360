export default (): Record<string, any> => ({
  databaseConnection: process.env.DATABASE_CONNECTION || 'postgres',
  databaseHost: process.env.DATABASE_HOST,
  databasePort: parseInt(process.env.DATABASE_PORT, 10),
  databaseUsername: process.env.DATABASE_USERNAME,
  databasePassword: process.env.DATABASE_PASSWORD,
  databaseName: process.env.DATABASE_DB_NAME || 'servicelink360',
  databaseSync: process.env.DATABASE_SYNC === 'true',
})
