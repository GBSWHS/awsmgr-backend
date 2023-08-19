import { EC2Client } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'
import { EC2InstancesService } from '../instances/ec2instances.service'

@Injectable()
export class UtilsService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  constructor (
    private readonly ec2InstancesSerivce: EC2InstancesService
  ) {}

  public async waitForState (id: string, state: string): Promise<void> {
    for (;;) {
      await this.delayInSeconds(500)

      const status = await this.ec2InstancesSerivce.getEC2InstanceStatus(id)
      if (status?.InstanceState?.Name === state) {
        break
      }
    }
  }

  private async delayInSeconds (time: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, time))
  }
}
