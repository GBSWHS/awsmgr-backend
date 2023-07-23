import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { PResBody } from '../types'
import { InstancesService } from './instances.service'
import { Instance } from './entity/instance.entity'

@Controller('/instances')
export class InstancesController {
  constructor (
    private readonly instancesService: InstancesService
  ) {}

  @Get('/')
  public async listInstances (@Query('limit') limit: number, @Query('offset') offset: number): PResBody<Instance[]> {
    const result = await this.instancesService.listInstances(limit, offset)

    return {
      success: true,
      body: result
    }
  }

  @Post('/')
  public async createInstance (@Body() instance: Instance): PResBody<Instance> {
    const result = await this.instancesService.createInstance(instance)

    return {
      success: true,
      body: result
    }
  }
}
