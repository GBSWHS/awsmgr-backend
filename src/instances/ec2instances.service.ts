import {
  EC2Client,
  ModifyInstanceAttributeCommand,
  type Instance as EC2Instance,
  DescribeInstancesCommand,
  RunInstancesCommand,
  type KeyPair,
  type Subnet,
  type Image,
  StopInstancesCommand,
  StartInstancesCommand,
  TerminateInstancesCommand,
  RebootInstancesCommand,
  DescribeInstanceStatusCommand,
  type InstanceStatus
} from '@aws-sdk/client-ec2'
import { PricingClient } from '@aws-sdk/client-pricing'
import { Injectable } from '@nestjs/common'

@Injectable()
export class EC2InstancesService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  private readonly pricingClient =
    new PricingClient({ region: 'ap-south-1' })

  public async getEC2Instance (id: string): Promise<EC2Instance | undefined> {
    const command = new DescribeInstancesCommand({
      InstanceIds: [id]
    })

    const response = await this.ec2Client.send(command)
    return response.Reservations?.[0]?.Instances?.[0]
  }

  public async getEC2InstanceStatus (id: string): Promise<InstanceStatus | undefined>
  public async getEC2InstanceStatus (ids: string[]): Promise<InstanceStatus[] | undefined>
  public async getEC2InstanceStatus (idOrIds: string[] | string): Promise<InstanceStatus | InstanceStatus[] | undefined> {
    const command = new DescribeInstanceStatusCommand({
      InstanceIds: Array.isArray(idOrIds) ? idOrIds : [idOrIds],
      IncludeAllInstances: true
    })

    const response = await this.ec2Client.send(command)
    const instanceStatuses = response.InstanceStatuses

    return Array.isArray(idOrIds) ? instanceStatuses : instanceStatuses?.[0]
  }

  public async listEC2Instances (ids: string[]): Promise<EC2Instance[] | undefined> {
    const command = new DescribeInstancesCommand({
      InstanceIds: ids
    })

    const response = await this.ec2Client.send(command)
    return response.Reservations?.[0]?.Instances
  }

  public async createEC2Instance (
    { name, storageSize, type, image, subnet, keypair, securityGroupId }:
    {
      name: string
      storageSize: number
      type: string
      image?: Image
      subnet: Subnet
      keypair: KeyPair
      securityGroupId: string
    }): Promise<EC2Instance | undefined> {
    const command = new RunInstancesCommand({
      MaxCount: 1,
      MinCount: 1,
      InstanceType: type,
      ImageId: image?.ImageId ?? 'ami-0785accd4f9bbbbe3',
      SubnetId: subnet.SubnetId,
      TagSpecifications: [{
        ResourceType: 'instance',
        Tags: [{
          Key: 'Name',
          Value: name
        }]
      }],
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: storageSize,
            VolumeType: 'gp2'
          }
        }
      ],
      SecurityGroupIds: [
        securityGroupId
      ],
      KeyName: keypair.KeyName,
      UserData: btoa('#/bin/bash\ngrowpart /dev/sda 1\nresize2fs /dev/sda1')
    })

    const result = await this.ec2Client.send(command)
    return result.Instances?.[0]
  }

  public async stopEC2Instance (id: string): Promise<void> {
    const command = new StopInstancesCommand({
      InstanceIds: [id]
    })

    await this.ec2Client.send(command)
  }

  public async startEC2Instance (id: string): Promise<void> {
    const command = new StartInstancesCommand({
      InstanceIds: [id]
    })

    await this.ec2Client.send(command)
  }

  public async restartEC2Instance (id: string): Promise<void> {
    const command = new RebootInstancesCommand({
      InstanceIds: [id]
    })

    await this.ec2Client.send(command)
  }

  public async deleteEC2Instance (id: string): Promise<void> {
    const command = new TerminateInstancesCommand({
      InstanceIds: [id]
    })

    await this.ec2Client.send(command)
  }

  public async updateEC2InstanceType (id: string, type: string): Promise<void> {
    const command = new ModifyInstanceAttributeCommand({
      InstanceType: {
        Value: type
      },
      InstanceId: id
    })

    await this.ec2Client.send(command)
  }
}
