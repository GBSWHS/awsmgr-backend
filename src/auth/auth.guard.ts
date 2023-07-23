import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { type Response } from 'express'

@Injectable()
export class AuthGuard implements CanActivate {
  public canActivate (context: ExecutionContext): boolean {
    const response = context.switchToHttp().getResponse<Response>()

    if (response.locals.isAdmin !== true) {
      throw new ForbiddenException('NOT_LOGGINED')
    }

    return true
  }
}
