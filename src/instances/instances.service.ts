import { CreateKeyPairCommand, DescribeImagesCommand, DescribeSubnetsCommand, EC2Client, type Instance as EC2Instance, type Image, RunInstancesCommand, type Subnet, type KeyPair, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, AllocateAddressCommand, AssociateAddressCommand, DescribeInstanceStatusCommand, DescribeSecurityGroupsCommand, RevokeSecurityGroupIngressCommand, DescribeInstancesCommand, StopInstancesCommand, ModifyVolumeCommand, StartInstancesCommand, ModifyInstanceAttributeCommand } from '@aws-sdk/client-ec2'
import { GetProductsCommand, Pricing } from '@aws-sdk/client-pricing'
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { Instance } from './entity/instance.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cwd } from 'node:process'
import { delayInSeconds } from '../utils'
import { type UpdateInstanceDto } from './dto/UpdateInstance.dto'

@Injectable()
export class InstancesService {
  private readonly ec2Client =
    new EC2Client({ region: 'ap-northeast-2' })

  private readonly pricingClient =
    new Pricing({ region: 'us-east-1' })

  constructor (
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>
  ) {}

  public async listInstances (take: number, skip: number): Promise<Instance[]> {
    return await this.instanceRepository.find({
      take,
      skip
    })
  }

  public async createInstance (instance: Instance): Promise<Instance> {
    const isAlreadyExist = await this.instanceRepository.findOneBy({
      name: instance.name
    })

    if (isAlreadyExist !== null) {
      throw new BadRequestException({
        message: `Instance "${instance.name}" already exists.`
      })
    }

    const image = await this.getLatestUbuntuImage()
    const price = await this.getTypePricePerHour(instance.type)
    if (price === undefined) {
      throw new NotFoundException({
        message: `Instance type "${instance.type}" not found.`
      })
    }

    const subnet = await this.getSubnet()
    if (subnet === undefined) {
      throw new NotFoundException({
        message: 'Subnet with "awsmgr-managed: true" tag not found.'
      })
    }

    const keypair = await this.createKeypair(instance.name)
    if (keypair === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during create keypair.'
      })
    }

    const keypairId = await this.saveKeypair(keypair)

    const ports = instance.ports.split(',').map((v) => Math.abs(parseInt(v))).filter((v) => !isNaN(v))
    const securityGroupId = await this.createSecurityGroupId(instance.name, subnet.VpcId ?? '', ports)
    if (securityGroupId === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during create securityGroup.'
      })
    }

    const ec2Instance = await this.createEC2Instance({
      name: instance.name,
      storageSize: instance.storageSize,
      type: instance.type,
      image,
      subnet,
      keypair,
      securityGroupId
    })

    if (ec2Instance === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during create ec2Instance.'
      })
    }

    await this.waitForState('running', ec2Instance)

    const publicIP = await this.attachEIP(ec2Instance)
    if (publicIP === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during attach EIP.'
      })
    }

    const result: Instance = {
      ...instance,
      publicIP,
      keypairId,
      pricePerHour: price
    }

    await this.instanceRepository.insert(result)
    return result
  }

  public async updateInstance (uuid: string, updateDto: UpdateInstanceDto): Promise<Instance> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
    }

    if (updateDto.name !== undefined) {
      throw new BadRequestException('Instance name cannot be changed.')
    }

    if (updateDto.ports !== undefined) {
      const ports = updateDto.ports.split(',').map((v) => Math.abs(parseInt(v))).filter((v) => !isNaN(v))
      await this.updateSecurityGroup(instance.name ?? '', ports)
    }

    let pricePerHour: number | undefined
    if (updateDto.storageSize !== undefined || updateDto.type !== undefined) {
      const ec2Instance = await this.getEC2Instance(instance.name)
      if (ec2Instance === undefined) {
        throw new InternalServerErrorException('Internal error has been occurred during stop instance.')
      }

      await this.stopEC2Instance(ec2Instance)
      await this.waitForState('stopped', ec2Instance)

      if (updateDto.storageSize !== undefined) {
        await this.updateRootStorage(updateDto.storageSize, ec2Instance)
      }

      if (updateDto.type !== undefined) {
        pricePerHour = await this.getTypePricePerHour(updateDto.type)
        await this.updateInstanceType(updateDto.type, ec2Instance)
      }

      await this.startEC2Instance(ec2Instance)
      await this.waitForState('running', ec2Instance)
    }

    const updateOption = {
      ...updateDto,
      pricePerHour
    }

    if (pricePerHour === undefined) {
      delete updateOption.pricePerHour
    }

    delete updateOption.uuid
    delete updateOption.keypairId
    delete updateOption.publicIP

    await this.instanceRepository.update({ uuid }, updateOption)

    return {
      ...instance,
      ...updateOption
    } as any
  }

  private async getEC2Instance (name: string): Promise<EC2Instance | undefined> {
    const command = new DescribeInstancesCommand({
      MaxResults: 5,
      Filters: [{
        Name: 'tag:Name',
        Values: [name]
      }]
    })

    const response = await this.ec2Client.send(command)
    return response.Reservations?.[0]?.Instances?.[0]
  }

  private async createEC2Instance (
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

  private async stopEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new StopInstancesCommand({
      InstanceIds: [ec2Instance.InstanceId ?? '']
    })

    await this.ec2Client.send(command)
  }

  private async startEC2Instance (ec2Instance: EC2Instance): Promise<void> {
    const command = new StartInstancesCommand({
      InstanceIds: [ec2Instance.InstanceId ?? '']
    })

    await this.ec2Client.send(command)
  }

  private async createKeypair (keyName: string): Promise<KeyPair | undefined> {
    const command = new CreateKeyPairCommand({
      KeyName: keyName,
      KeyType: 'rsa',
      KeyFormat: 'ppk'
    })

    return await this.ec2Client.send(command)
  }

  private async getTypePricePerHour (instanceType: string): Promise<number | undefined> {
    const command = new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceType },
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'regionCode', Value: 'ap-northeast-2' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ],
      MaxResults: 1
    })

    const response = await this.pricingClient.send(command)
    const priceObject = JSON.parse(response.PriceList?.[0].toString() ?? 'undefined')
    if (priceObject === undefined) {
      return undefined
    }

    const onDemandPrice = Object.values(priceObject.terms.OnDemand)[0] as any
    const priceDimension = Object.values(onDemandPrice.priceDimensions)[0] as any

    return priceDimension.pricePerUnit.USD
  }

  private async updateInstanceType (instanceType: string, ec2Instance: EC2Instance): Promise<void> {
    const command = new ModifyInstanceAttributeCommand({
      InstanceType: {
        Value: instanceType
      },
      InstanceId: ec2Instance.InstanceId
    })

    await this.ec2Client.send(command)
  }

  private async getLatestUbuntuImage (): Promise<Image | undefined> {
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
        new Date(a.CreationDate ?? '').getTime() -
        new Date(b.CreationDate ?? '').getTime())[0]
  }

  private async getSubnet (): Promise<Subnet | undefined> {
    const command = new DescribeSubnetsCommand({
      Filters: [
        { Name: 'tag:awsmgr-managed', Values: ['true'] }
      ]
    })

    const response = await this.ec2Client.send(command)
    return response.Subnets?.[0]
  }

  private async createSecurityGroupId (name: string, vpcId: string, ports: number[]): Promise<string | undefined> {
    const sgCommand = new CreateSecurityGroupCommand({
      GroupName: name + '-sg',
      Description: 'this security group managed by awsmgr',
      VpcId: vpcId,
      TagSpecifications: [{
        ResourceType: 'security-group',
        Tags: [{
          Key: 'Name',
          Value: name
        }]
      }]
    })

    const sgResponse = await this.ec2Client.send(sgCommand)
    const groupId = sgResponse.GroupId

    if (groupId === undefined) {
      return undefined
    }

    for (const port of ports) {
      const ingressCommand = new AuthorizeSecurityGroupIngressCommand({
        GroupId: groupId,
        IpPermissions: [{
          FromPort: port,
          ToPort: port,
          IpProtocol: 'tcp',
          IpRanges: [{
            CidrIp: '0.0.0.0/0'
          }]
        }]
      })

      await this.ec2Client.send(ingressCommand)
    }

    return groupId
  }

  private async updateSecurityGroup (name: string, afterPorts: number[]): Promise<void> {
    const sgCommand = new DescribeSecurityGroupsCommand({
      Filters: [{
        Name: 'tag:Name',
        Values: [name]
      }],
      MaxResults: 5
    })

    const sgResponse = await this.ec2Client.send(sgCommand)

    const groupId = sgResponse.SecurityGroups?.[0].GroupId ?? ''
    const beforeRules = sgResponse.SecurityGroups?.[0].IpPermissions ?? []
    const beforePorts = beforeRules.map((v) => v.FromPort ?? 0)

    const ports = [
      ...beforePorts,
      ...afterPorts
    ]

    for (const port of ports) {
      // Creation
      if (!beforePorts.includes(port) && afterPorts.includes(port)) {
        const createCommand = new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [{
            FromPort: port,
            ToPort: port,
            IpProtocol: 'tcp',
            IpRanges: [{
              CidrIp: '0.0.0.0/0'
            }]
          }]
        })

        await this.ec2Client.send(createCommand)
      }

      // Deletion
      if (beforePorts.includes(port) && !afterPorts.includes(port)) {
        const deleteCommand = new RevokeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [{
            FromPort: port,
            ToPort: port,
            IpProtocol: 'tcp',
            IpRanges: [{
              CidrIp: '0.0.0.0/0'
            }]
          }]
        })

        await this.ec2Client.send(deleteCommand)
      }
    }
  }

  private async attachEIP (ec2Instance: EC2Instance): Promise<string | undefined> {
    const createCommand = new AllocateAddressCommand({
      Domain: 'vpc'
    })

    const response = await this.ec2Client.send(createCommand)
    if (response.AllocationId === undefined) {
      return undefined
    }

    const attachCommand = new AssociateAddressCommand({
      InstanceId: ec2Instance.InstanceId,
      AllocationId: response.AllocationId
    })

    await this.ec2Client.send(attachCommand)
    return response.PublicIp
  }

  private async updateRootStorage (size: number, ec2Instance: EC2Instance): Promise<void> {
    const volumeId = ec2Instance.BlockDeviceMappings?.[0].Ebs?.VolumeId
    const command = new ModifyVolumeCommand({
      VolumeId: volumeId,
      Size: size
    })

    await this.ec2Client.send(command)
  }

  private async saveKeypair (keypair: KeyPair): Promise<string> {
    const keypairId = randomUUID()
    const keypairPath = path.join(cwd(), 'keys', keypairId + '.ppk')

    await writeFile(keypairPath, keypair.KeyMaterial ?? '')

    return keypairId
  }

  private async waitForState (state: string, instance: EC2Instance): Promise<void> {
    for (;;) {
      await delayInSeconds(500)

      const command = new DescribeInstancesCommand({
        InstanceIds: [
          instance.InstanceId ?? ''
        ]
      })

      const response = await this.ec2Client.send(command)
      if (response.Reservations?.[0]?.Instances?.[0].State?.Name === state) {
        break
      }
    }
  }
}
