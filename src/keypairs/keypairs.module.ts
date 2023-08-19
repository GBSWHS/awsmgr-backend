import { Module } from '@nestjs/common'
import { KeypairsService } from './keypairs.service'

@Module({
  providers: [KeypairsService],
  exports: [KeypairsService]
})
export class KeypairsModule {}
