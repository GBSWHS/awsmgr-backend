import { Module } from '@nestjs/common'
import { InvitesController } from './invites.controller'
import { InvitesService } from './invites.service'
import { InstancesModule } from '../instances/instances.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Instance } from '../instances/entity/instance.entity'
import { Invite } from './entity/invite.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Instance, Invite]),
    InstancesModule
  ],
  controllers: [InvitesController],
  providers: [InvitesService]
})
export class InvitesModule {}
