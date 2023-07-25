import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'
import { ConfigService } from '@nestjs/config'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { HttpExceptionFilter } from './app/exception.filter'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { type Response } from 'express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from './logger/logger.service'

async function bootstrap (): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger()
  })

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

  const docs = new DocumentBuilder()
    .setTitle('awsmgr')
    .setDescription('AWS EC2, over-simplified. | 경소고 EC2 대시보드 & 연결 정보 솔루션')
    .setVersion('0.0')
    .addTag('auth', '관리자 인증 관련')
    .addTag('instances', '관리자 인스턴스 관리')
    .addTag('invites', '사용자 인스턴스 사용')
    .addCookieAuth('SESSION_TOKEN')
    .build()

  const document = SwaggerModule.createDocument(app, docs)
  SwaggerModule.setup('/api', app, document)

  const config = app.get(ConfigService)
  const port =
    config.get<number>('SERVER_PORT') ??
    process.env.SERVER_PORT ?? 3000

  await app.listen(port)
}

void bootstrap()
