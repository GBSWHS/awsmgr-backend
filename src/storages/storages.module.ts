import { Module } from '@nestjs/common'
import { StoragesService } from './storages.service'

@Module({
  providers: [StoragesService],
  exports: [StoragesService]
})
export class StoragesModule {}
