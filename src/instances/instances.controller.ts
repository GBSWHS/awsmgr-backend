import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { PResBody } from '../types'
import { InstancesService } from './instances.service'
import { Instance } from './entity/instance.entity'
import { AuthGuard } from '../auth/auth.guard'
import { UpdateInstanceDto } from './dto/UpdateInstance.dto'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'

@ApiTags('instances')
@ApiCookieAuth()
@Controller('/instances')
export class InstancesController {
  constructor (
    private readonly instancesService: InstancesService
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  public async listInstances (@Query('take') take: number, @Query('skip') skip: number): PResBody<Instance[]> {
    const result = await this.instancesService.listInstances(take, skip)

    return {
      success: true,
      body: result
    }
  }

  @Post('/')
  @UseGuards(AuthGuard)
  public async createInstance (@Body() instance: Instance): PResBody<Instance> {
    const result = await this.instancesService.createInstance(instance)

    return {
      success: true,
      body: result
    }
  }

  @Put('/:uuid')
  @UseGuards(AuthGuard)
  public async updateInstance (@Param('uuid') uuid: string, @Body() updateDto: UpdateInstanceDto): PResBody<Instance> {
    const result = await this.instancesService.updateInstance(uuid, updateDto)

    return {
      success: true,
      body: result
    }
  }

  @Delete('/:uuid')
  @UseGuards(AuthGuard)
  public async deleteInstance (@Param('uuid') uuid: string): PResBody {
    await this.instancesService.deleteInstance(uuid)

    return {
      success: true
    }
  }

  @Post('/:uuid/restart')
  @UseGuards(AuthGuard)
  public async restartInstance (@Param('uuid') uuid: string): PResBody {
    await this.instancesService.restartInstance(uuid)

    return {
      success: true
    }
  }

  @Post('/:uuid/reset')
  @UseGuards(AuthGuard)
  public async resetInstance (@Param('uuid') uuid: string): PResBody {
    await this.instancesService.resetInstance(uuid)

    return {
      success: true
    }
  }

  @Get('/:uuid/keypair')
  @UseGuards(AuthGuard)
  public async getInstanceKeypair (@Param('uuid') uuid: string): PResBody<string> {
    const keypair = await this.instancesService.getInstanceKeypair(uuid)

    return {
      success: true,
      body: keypair
    }
  }
}
