import { Injectable, InternalServerErrorException, NotAcceptableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

@Injectable()
export class AuthService {
  private readonly jwtService: JwtService
  private readonly ADMIN_PASSWORD: string

  constructor (jwtService: JwtService, configService: ConfigService) {
    this.jwtService = jwtService
    this.ADMIN_PASSWORD = configService.get<string>('ADMIN_PASSWORD', 'youshallnotpass')
  }

  public generateToken (): string {
    return this.jwtService.sign({})
  }

  public verifyToken (token: string): void {
    try {
      this.jwtService.verify(token)
    } catch (e) {
      if (e instanceof JsonWebTokenError) {
        throw new NotAcceptableException('TOKEN_MALFORMED')
      }

      if (e instanceof TokenExpiredError) {
        throw new UnauthorizedException('TOKEN_EXPIRED')
      }

      throw new InternalServerErrorException('JWT_SERVICE_ERROR')
    }
  }

  public verifyPassword (password: string): boolean {
    return this.ADMIN_PASSWORD === password
  }
}
