import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { PResBody } from '../types'
import { ManagedInstancesService } from '../instances/managedinstances.service'
import { PricesService } from './prices.service'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'

@ApiTags('prices')
@Controller('/prices')
export class PricesController {
  constructor (
    private readonly managedInstancesService: ManagedInstancesService,
    private readonly pricesService: PricesService
  ) {}

  @Get('/')
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  public async getAllPrice (): PResBody<{ pricePerHour: number, storageSize: number }> {
    const allPrice = await this.managedInstancesService.getAllPricePerHour() ?? 0

    return {
      success: true,
      body: allPrice
    }
  }

  @Get('/:instanceType')
  public async getPriceByInstanceType (@Param('instanceType') instanceType: string): PResBody<{ pricePerHour: number }> {
    const pricePerHour = await this.pricesService.getTypePricePerHour(instanceType) ?? 0.0117

    return {
      success: true,
      body: {
        pricePerHour
      }
    }
  }
}
