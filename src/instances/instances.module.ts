import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Instance } from './entity/instance.entity'
import { InstancesService } from './instances.service'
import { InstancesController } from './instances.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Instance])
  ],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService]
})
export class InstancesModule {}
