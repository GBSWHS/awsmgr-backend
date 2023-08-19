import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common'
import { PResBody } from '../types'
import { ManagedInstancesService } from './managedinstances.service'
import { Instance } from './entity/instance.entity'
import { AuthGuard } from '../auth/auth.guard'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { NoticeGateway } from '../notice/notice.gateway'

@ApiTags('instances')
@ApiCookieAuth()
@Controller('/instances')
export class InstancesController {
  constructor (
    private readonly managedInstancesService: ManagedInstancesService,
    private readonly noticeGateway: NoticeGateway
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
  // event-driven
  public async createInstance (@Res() res: Response, @Body() instance: Instance): Promise<void> {
    res.send({ success: true })

    await this.managedInstancesService.createInstance(instance)
      .catch(this.noticeGateway.handleErrorMessage({
        type: 'Error',
        message: '인스턴스 생성 중 문제가 발생하였습니다.'
      }))

    this.noticeGateway.send({
      type: 'Success',
      message: '인스턴스를 성공적으로 생성했습니다.'
    })
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
  // event-driven
  public async updateInstance (@Res() res: Response, @Param('instanceId') instanceId: string, @Body() modifications: Instance): Promise<void> {
    res.send({ success: true })

    await this.managedInstancesService.updateInstance(instanceId, modifications)
      .catch(this.noticeGateway.handleErrorMessage({
        type: 'Error',
        message: '인스턴스 수정 중 문제가 발생하였습니다.'
      }))

    this.noticeGateway.send({
      type: 'Success',
      message: '인스턴스를 성공적으로 수정했습니다.'
    })
  }

  @Delete('/:instanceId')
  @UseGuards(AuthGuard)
  public async deleteInstance (@Res() res: Response, @Param('instanceId') instanceId: string): Promise<void> {
    res.send({ success: true })

    await this.managedInstancesService.deleteInstance(instanceId)
      .catch(this.noticeGateway.handleErrorMessage({
        type: 'Error',
        message: '인스턴스 삭제 중 문제가 발생하였습니다.'
      }))

    this.noticeGateway.send({
      type: 'Success',
      message: '인스턴스를 성공적으로 삭제했습니다.'
    })
  }

  @Post('/:instanceId/restart')
  @UseGuards(AuthGuard)
  public async restartInstance (@Res() res: Response, @Param('instanceId') instanceId: string): Promise<void> {
    res.send({ success: true })

    await this.managedInstancesService.restartInstance(instanceId)
      .catch(this.noticeGateway.handleErrorMessage({
        type: 'Error',
        message: '인스턴스 재시작 중 문제가 발생하였습니다.'
      }))

    this.noticeGateway.send({
      type: 'Success',
      message: '인스턴스를 성공적으로 재시작했습니다.'
    })
  }

  @Post('/:instanceId/reset')
  @UseGuards(AuthGuard)
  public async resetInstance (@Res() res: Response, @Param('instanceId') instanceId: string): Promise<void> {
    res.send({ success: true })

    await this.managedInstancesService.resetInstance(instanceId)
      .catch(this.noticeGateway.handleErrorMessage({
        type: 'Error',
        message: '인스턴스 초기화 중 문제가 발생하였습니다.'
      }))

    this.noticeGateway.send({
      type: 'Success',
      message: '인스턴스를 성공적으로 초기화했습니다.'
    })
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
