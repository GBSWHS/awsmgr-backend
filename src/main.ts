import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap (): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('/api')
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }))

  const config = app.get(ConfigService)
  const port = config.get<number>('SERVER_PORT') ?? 3000

  await app.listen(port)
}

void bootstrap()
