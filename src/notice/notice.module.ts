import { Module } from '@nestjs/common'
import { NoticeGateway } from './notice.gateway'

@Module({
  providers: [NoticeGateway],
  exports: [NoticeGateway]
})
export class NoticeModule {}
