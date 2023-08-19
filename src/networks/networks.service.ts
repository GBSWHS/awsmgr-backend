import { AllocateAddressCommand, AssociateAddressCommand, DescribeAddressesCommand, DescribeSubnetsCommand, DisassociateAddressCommand, EC2Client, ReleaseAddressCommand, type Subnet } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'

@Injectable()
export class NetworksService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  public async getSubnet (): Promise<Subnet | undefined> {
    const command = new DescribeSubnetsCommand({
      Filters: [
        { Name: 'tag:awsmgr-managed', Values: ['true'] }
      ]
    })

    const response = await this.ec2Client.send(command)
    return response.Subnets?.[0]
  }

  public async attachEIP (instanceId: string): Promise<string | undefined> {
    const createCommand = new AllocateAddressCommand({
      Domain: 'vpc'
    })

    const response = await this.ec2Client.send(createCommand)
    if (response.AllocationId === undefined) {
      return undefined
    }

    const attachCommand = new AssociateAddressCommand({
      InstanceId: instanceId,
      AllocationId: response.AllocationId
    })

    await this.ec2Client.send(attachCommand)
    return response.PublicIp
  }

  public async detachEIP (instanceId: string): Promise<void> {
    const eipCommand = new DescribeAddressesCommand({
      Filters: [{
        Name: 'instance-id',
        Values: [instanceId]
      }]
    })
    const eip = await this.ec2Client.send(eipCommand)

    const detachCommand = new DisassociateAddressCommand({
      AssociationId: eip.Addresses?.[0].AssociationId
    })
    await this.ec2Client.send(detachCommand)

    const releaseCommand = new ReleaseAddressCommand({
      AllocationId: eip.Addresses?.[0].AllocationId
    })
    await this.ec2Client.send(releaseCommand)
  }
}
