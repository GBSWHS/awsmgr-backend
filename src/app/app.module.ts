import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InstancesModule } from '../instances/instances.module'
import { LoggerModule } from '../logger/logger.module'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { InvitesModule } from '../invites/invites.module'

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
    InstancesModule,
    InvitesModule,
    AuthModule
  ],
  controllers: [],
  providers: []
})
export class AppModule implements NestModule {
  public configure (consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('/')
  }
}
