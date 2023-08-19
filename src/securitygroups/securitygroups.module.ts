import { Module } from '@nestjs/common'
import { SecurityGroupsService } from './securitygroups.service'

@Module({
  providers: [SecurityGroupsService],
  exports: [SecurityGroupsService]
})
export class SecurityGroupsModule {}
