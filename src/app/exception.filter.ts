import { type ExceptionFilter, Catch, type ArgumentsHost, type HttpException } from '@nestjs/common'
import { type Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  public catch (exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus?.() ?? 500

    response
      .status(status)
      .send({
        success: false,
        message: exception.message
      })
  }
}
