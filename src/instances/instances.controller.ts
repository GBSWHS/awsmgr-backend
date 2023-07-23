import { Body, Controller, Post } from '@nestjs/common'
import { PResBody } from '../types'
import { InstancesService } from './instances.service'
import { Instance } from './entity/instance.entity'

@Controller('/instances')
export class InstancesController {
  constructor (
    private readonly instancesService: InstancesService
  ) {}

  @Post('/')
  public async createInstance (@Body() instance: Instance): PResBody<Instance> {
    const result = await this.instancesService.createInstance(instance)

    return {
      success: true,
      body: result
    }
  }
}
