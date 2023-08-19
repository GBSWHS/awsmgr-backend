import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Instance } from './entity/instance.entity'
import { ManagedInstancesService } from './managedinstances.service'
import { InstancesController } from './instances.controller'
import { EC2InstancesService } from './ec2instances.service'
import { PricesModule } from '../prices/prices.module'
import { StoragesModule } from '../storages/storages.module'
import { NetworksModule } from '../networks/networks.module'
import { KeypairsModule } from '../keypairs/keypairs.module'
import { SecurityGroupsModule } from '../securitygroups/securitygroups.module'
import { UtilsModule } from '../utils/utils.module'
import { NoticeModule } from '../notice/notice.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Instance]),
    forwardRef(() => PricesModule),
    StoragesModule,
    SecurityGroupsModule,
    KeypairsModule,
    NetworksModule,
    forwardRef(() => UtilsModule),
    NoticeModule
  ],
  controllers: [InstancesController],
  providers: [
    ManagedInstancesService,
    EC2InstancesService
  ],
  exports: [
    ManagedInstancesService,
    EC2InstancesService
  ]
})
export class InstancesModule {}
