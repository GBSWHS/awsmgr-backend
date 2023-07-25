import { type ExceptionFilter, Catch, type ArgumentsHost, type HttpException } from '@nestjs/common'
import { type Response } from 'express'
import { Logger } from '../logger/logger.service'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger()

  public catch (exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus?.() ?? 500

    this.logger.error(exception.message, exception)

    response
      .status(status)
      .send({
        success: false,
        message: exception.message
      })
  }
}
