import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PostgresSchemaPatchService } from './postgres-schema-patch.service'

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
      }),
      inject: [ConfigService]
    }),
  ],
  providers: [PostgresSchemaPatchService],
})
export class DatabaseModule {
}
