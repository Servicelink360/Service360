import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { PostgresSchemaPatchService } from './postgres-schema-patch.service'

function rdsSslOptions(): false | { rejectUnauthorized: boolean; ca?: string } {
  if (process.env.DATABASE_SSL !== 'true' && !String(process.env.DATABASE_HOST || '').includes('rds.amazonaws.com')) {
    return false
  }
  const candidates = [
    process.env.DATABASE_SSL_CA,
    join(process.cwd(), 'deploy', 'global-bundle.pem'),
    join(process.cwd(), '..', 'deploy', 'global-bundle.pem'),
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    if (existsSync(p)) {
      return { rejectUnauthorized: true, ca: readFileSync(p, 'utf8') }
    }
  }
  return { rejectUnauthorized: false }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('databaseHost'),
        port: configService.get<number>('databasePort'),
        username: configService.get<string>('databaseUsername'),
        password: configService.get<string>('databasePassword'),
        database: configService.get<string>('databaseName'),
        synchronize: configService.get<boolean>('databaseSync') ?? false,
        autoLoadEntities: true,
        keepConnectionAlive: true,
        logging: ['error', 'query'],
        logger: 'advanced-console',
        maxQueryExecutionTime: 500,
        ssl: configService.get<boolean>('databaseSsl') ? rdsSslOptions() : false,
      }),
      inject: [ConfigService]
    }),
  ],
  providers: [PostgresSchemaPatchService],
})
export class DatabaseModule {
}
