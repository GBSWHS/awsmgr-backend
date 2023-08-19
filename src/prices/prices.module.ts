import { Module, forwardRef } from '@nestjs/common'
import { PricesService } from './prices.service'
import { PricesController } from './prices.controller'
import { InstancesModule } from '../instances/instances.module'

@Module({
  imports: [forwardRef(() => InstancesModule)],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService]
})
export class PricesModule {}
