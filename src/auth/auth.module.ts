import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SESSION_SECRET', 'youshallnotpass'),
        signOptions: {
          expiresIn: '30 days',
          algorithm: 'HS512',
          issuer: 'awsmgr'
        },
        verifyOptions: {
          algorithms: ['HS512'],
          issuer: 'awsmgr'
        }
      })
    }),
    ConfigModule
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
