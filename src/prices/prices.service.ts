import { GetProductsCommand, PricingClient } from '@aws-sdk/client-pricing'
import { Injectable } from '@nestjs/common'

@Injectable()
export class PricesService {
  private readonly pricingClient =
    new PricingClient({ region: 'ap-south-1' })

  public async getTypePricePerHour (instanceType: string): Promise<number | undefined> {
    const command = new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceType },
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'regionCode', Value: 'ap-northeast-2' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ]
    })

    const response = await this.pricingClient.send(command)
    const priceObject = JSON.parse(response.PriceList?.[0].toString() ?? 'undefined')
    if (priceObject === undefined) {
      return undefined
    }

    const onDemandPrice = Object.values(priceObject.terms.OnDemand)[0] as any
    const priceDimension = Object.values(onDemandPrice.priceDimensions)[0] as any

    return Math.floor(parseFloat(priceDimension.pricePerUnit.USD) * 100) / 100
  }
}
