import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { PResBody } from '../types'
import { ManagedInstancesService } from './managedinstances.service'
import { Instance } from './entity/instance.entity'
import { AuthGuard } from '../auth/auth.guard'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'

@ApiTags('instances')
@ApiCookieAuth()
@Controller('/instances')
export class InstancesController {
  constructor (
    private readonly managedInstancesService: ManagedInstancesService
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  public async listInstances (@Query('take') take: number, @Query('skip') skip: number): PResBody<{ instances: Instance[], pageCount: number }> {
    const instances = await this.managedInstancesService.listInstances(take, skip)
    const pageCount = await this.managedInstancesService.countInstancePages(take)

    return {
      success: true,
      body: {
        instances,
        pageCount
      }
    }
  }

  @Post('/')
  @UseGuards(AuthGuard)
  public async createInstance (@Body() instance: Instance): PResBody<Instance> {
    const result = await this.managedInstancesService.createInstance(instance)

    return {
      success: true,
      body: result
    }
  }

  @Get('/search')
  public async searchInstances (@Query('query') query: string, @Query('take') take: number, @Query('skip') skip: number): PResBody<{ instances: Instance[], pageCount: number }> {
    const instances = await this.managedInstancesService.searchInstances(query, take, skip)
    const pageCount = await this.managedInstancesService.searchInstancePages(query, take)

    return {
      success: true,
      body: {
        instances,
        pageCount
      }
    }
  }

  @Get('/:instanceId')
  @UseGuards(AuthGuard)
  public async getInstance (@Param('instanceId') instanceId: string): PResBody<Instance> {
    const result = await this.managedInstancesService.getInstance(instanceId)

    return {
      success: true,
      body: result
    }
  }

  @Put('/:instanceId')
  @UseGuards(AuthGuard)
  public async updateInstance (@Param('instanceId') instanceId: string, @Body() modifications: Instance): PResBody<Instance> {
    const result = await this.managedInstancesService.updateInstance(instanceId, modifications)

    return {
      success: true,
      body: result
    }
  }

  @Delete('/:instanceId')
  @UseGuards(AuthGuard)
  public async deleteInstance (@Param('instanceId') instanceId: string): PResBody {
    await this.managedInstancesService.deleteInstance(instanceId)

    return {
      success: true
    }
  }

  @Post('/:instanceId/restart')
  @UseGuards(AuthGuard)
  public async restartInstance (@Param('instanceId') instanceId: string): PResBody {
    await this.managedInstancesService.restartInstance(instanceId)

    return {
      success: true
    }
  }

  @Post('/:instanceId/reset')
  @UseGuards(AuthGuard)
  public async resetInstance (@Param('instanceId') instanceId: string): PResBody {
    await this.managedInstancesService.resetInstance(instanceId)

    return {
      success: true
    }
  }

  @Get('/:instanceId/keypair')
  @UseGuards(AuthGuard)
  public async getInstanceKeypair (@Param('instanceId') instanceId: string): PResBody<string> {
    const keypair = await this.managedInstancesService.getInstanceKeypair(instanceId)

    return {
      success: true,
      body: keypair
    }
  }
}
