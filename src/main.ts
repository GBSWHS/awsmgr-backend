import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { ConfigService } from '@nestjs/config'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { HttpExceptionFilter } from './app/exception.filter'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { type Response } from 'express'
import { Logger } from './logger/logger.service'

async function bootstrap (): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  })

  app.useLogger(app.get(Logger))
  app.useGlobalFilters(new HttpExceptionFilter())
  app.setGlobalPrefix('/api')
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    always: true,
    exceptionFactory: (errors) =>
      new BadRequestException(
        'VALIDATION_FAILED: ' +
        errors
          .map((v) => Object.values(v.constraints ?? {}))
          .flat().join('\n'))
  }))

  app.use(cookieParser())
  app.use(morgan((tokens, req, res) =>
    JSON.stringify({
      type: 'ACCESS_LOG',
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      return: tokens.status(req, res),
      userAgent: tokens['user-agent'](req, res),
      time: tokens['response-time'](req, res),
      date: tokens.date(req, res, 'iso'),
      locals: (res as Response).locals
    })))

  const config = app.get(ConfigService)
  const port = config.get<number>('SERVER_PORT') ?? 3000

  await app.listen(port)
}

void bootstrap()
