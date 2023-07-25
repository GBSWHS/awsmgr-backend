import { BadRequestException, Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from './auth.guard'
import { ResBody } from '../types'
import { AuthService } from './auth.service'
import { GetLoginTokenDto } from './dto/GetLoginToken.dto'
import { Response } from 'express'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'

@ApiTags('auth')
@Controller('/auth')
export class AuthController {
  constructor (
    private readonly authService: AuthService
  ) {}

  @Get('/status')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  public getLoginStatus (): ResBody {
    return {
      success: true
    }
  }

  @Post('/login')
  public getLoginToken (@Res({ passthrough: true }) res: Response, @Body() body: GetLoginTokenDto): ResBody {
    const isCorrect = this.authService.verifyPassword(body.password)

    if (!isCorrect) {
      throw new BadRequestException('WRONG_PASSWORD')
    }

    const token = this.authService.generateToken()
    res.cookie('SESSION_TOKEN', token)

    return {
      success: true
    }
  }
}
