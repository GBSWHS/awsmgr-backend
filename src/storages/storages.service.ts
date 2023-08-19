import { DescribeImagesCommand, type Image, ModifyVolumeCommand, type Instance as EC2Instance, EC2Client, CreateReplaceRootVolumeTaskCommand } from '@aws-sdk/client-ec2'
import { Injectable } from '@nestjs/common'

@Injectable()
export class StoragesService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  public async getLatestUbuntuImage (): Promise<Image | undefined> {
    const command = new DescribeImagesCommand({
      Owners: ['099720109477'],
      Filters: [
        { Name: 'name', Values: ['ubuntu/images/hvm-ssd/ubuntu-*-amd64-server-20*'] },
        { Name: 'state', Values: ['available'] }
      ]
    })

    const response = (await this.ec2Client.send(command)).Images ?? []

    return response
      .sort((a, b) =>
        new Date(b.CreationDate ?? '').getTime() -
        new Date(a.CreationDate ?? '').getTime())[0]
  }

  public async resetRootSorage (ec2Instance: EC2Instance): Promise<void> {
    const command = new CreateReplaceRootVolumeTaskCommand({
      InstanceId: ec2Instance.InstanceId ?? '',
      DeleteReplacedRootVolume: true
    })

    await this.ec2Client.send(command)
  }

  public async updateRootStorage (size: number, ec2Instance: EC2Instance): Promise<void> {
    const volumeId = ec2Instance.BlockDeviceMappings?.[0].Ebs?.VolumeId
    const command = new ModifyVolumeCommand({
      VolumeId: volumeId,
      Size: size
    })

    await this.ec2Client.send(command)
  }
}
