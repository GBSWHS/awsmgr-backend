import { EC2Client, ModifyInstanceAttributeCommand, type Instance as EC2Instance, DescribeInstancesCommand, RunInstancesCommand, type KeyPair, type Subnet, type Image, StopInstancesCommand, StartInstancesCommand, TerminateInstancesCommand, RebootInstancesCommand } from '@aws-sdk/client-ec2'
import { PricingClient } from '@aws-sdk/client-pricing'
import { Injectable } from '@nestjs/common'

@Injectable()
export class EC2InstancesService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  private readonly pricingClient =
    new PricingClient({ region: 'ap-south-1' })

  public async getEC2Instance (name: string): Promise<EC2Instance | undefined> {
    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'tag:Name',
          Values: [name]
        }
      ]
    })

    const response = await this.ec2Client.send(command)
    return response.Reservations?.[0]?.Instances?.[0]
  }

  public async listEC2Instances (names: string[]): Promise<EC2Instance[] | undefined> {
    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'tag:Name',
          Values: names
        }
      ]
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
      KeyName: keypair.KeyName
    })

    const result = await this.ec2Client.send(command)
    return result.Instances?.[0]
  }

  public async stopEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new StopInstancesCommand({
      InstanceIds: [ec2Instance.InstanceId ?? '']
    })

    await this.ec2Client.send(command)
  }

  public async startEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new StartInstancesCommand({
      InstanceIds: [ec2Instance.InstanceId ?? '']
    })

    await this.ec2Client.send(command)
  }

  public async restartEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new RebootInstancesCommand({
      InstanceIds: [ec2Instance.InstanceId ?? '']
    })

    await this.ec2Client.send(command)
  }

  public async deleteEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new TerminateInstancesCommand({
      InstanceIds: [
        ec2Instance.InstanceId ?? ''
      ]
    })

    await this.ec2Client.send(command)
  }

  public async updateEC2InstanceType (instanceType: string, ec2Instance: EC2Instance): Promise<void> {
    const command = new ModifyInstanceAttributeCommand({
      InstanceType: {
        Value: instanceType
      },
      InstanceId: ec2Instance.InstanceId
    })

    await this.ec2Client.send(command)
  }
}
