export = {
    host: process.env.DATABASE_HOST,
    type: 'postgres',
    port: process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'servicelink360',
    entities: [
      __dirname + '/**/*.entity{.ts,.js}',
    ],
    migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
    cli: {
      migrationsDir: 'src/database/migrations',
    },
    seeds: ["src/database/seeding/seeds/**/*{.ts,.js}"],
    factories: ["src/database/seeding/factories/**/*{.ts,.js}"],
  };
  