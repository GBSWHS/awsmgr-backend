import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InstancesModule } from '../instances/instances.module'
import { LoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('DATABASE_PATH') ?? './db.sqlite',
        autoLoadEntities: true,
        synchronize: true
      })
    }),
    InstancesModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
