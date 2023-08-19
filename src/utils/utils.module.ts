import { Module, forwardRef } from '@nestjs/common'
import { UtilsService } from './utils.service'
import { InstancesModule } from '../instances/instances.module'

@Module({
  imports: [forwardRef(() => InstancesModule)],
  providers: [UtilsService],
  exports: [UtilsService]
})
export class UtilsModule {}
