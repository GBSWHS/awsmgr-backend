import { Module } from '@nestjs/common'
import { NetworksService } from './networks.service'

@Module({
  providers: [NetworksService],
  exports: [NetworksService]
})
export class NetworksModule {}
