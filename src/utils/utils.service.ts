import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UtilsService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  public async waitForState (id: string, state: string): Promise<void> {
    for (;;) {
      await this.delayInSeconds(500)

      const command = new DescribeInstancesCommand({
        InstanceIds: [id]
      })

      const response = await this.ec2Client.send(command)
      if (response.Reservations?.[0]?.Instances?.[0].State?.Name === state) {
        break
      }
    }
  }

  private async delayInSeconds (time: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, time))
  }
}
