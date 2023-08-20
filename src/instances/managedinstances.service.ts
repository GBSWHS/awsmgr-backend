import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { Instance } from './entity/instance.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Repository } from 'typeorm'
import { EC2InstancesService } from './ec2instances.service'
import { PricesService } from '../prices/prices.service'
import { StoragesService } from '../storages/storages.service'
import { SecurityGroupsService } from '../securitygroups/securitygroups.service'
import { NetworksService } from '../networks/networks.service'
import { KeypairsService } from '../keypairs/keypairs.service'
import { UtilsService } from '../utils/utils.service'
import { NoticeGateway } from '../notice/notice.gateway'

@Injectable()
export class ManagedInstancesService {
  constructor (
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,
    private readonly ec2InstancesService: EC2InstancesService,
    private readonly pricesService: PricesService,
    private readonly storagesService: StoragesService,
    private readonly sgService: SecurityGroupsService,
    private readonly networksService: NetworksService,
    private readonly keypairsService: KeypairsService,
    private readonly utilsService: UtilsService,
    private readonly noticeGateway: NoticeGateway
  ) {}

  public async getInstance (id: string): Promise<Instance & { state?: number } | undefined> {
    const instance = await this.instanceRepository.findOneBy({ id }) ?? undefined
    if (instance === undefined) {
      throw new NotFoundException(`Instance id: ${id} not found.`)
    }

    const status = await this.ec2InstancesService.getEC2InstanceStatus(id)

    return {
      ...instance,
      state: status?.InstanceState?.Code
    }
  }

  public async countInstancePages (take: number): Promise<number> {
    const instanceCount = await this.instanceRepository.count()
    return Math.ceil(instanceCount / take)
  }

  public async searchInstancePages (query: string, take: number): Promise<number> {
    const likeSearch = Like(`%${query}%`)
    const searchResultCount = await this.instanceRepository.count({
      take,
      where: [
        { category: likeSearch },
        { name: likeSearch },
        { description: likeSearch },
        { owner: likeSearch },
        { memo: likeSearch },
        { publicIP: likeSearch },
        { id: likeSearch }
      ]
    })

    return Math.ceil(searchResultCount / take)
  }

  public async searchInstances (query: string, take: number, skip: number): Promise<Instance[]> {
    const likeSearch = Like(`%${query}%`)

    return await this.instanceRepository.find({
      take,
      skip,
      where: [
        { category: likeSearch },
        { name: likeSearch },
        { description: likeSearch },
        { owner: likeSearch },
        { memo: likeSearch },
        { publicIP: likeSearch },
        { id: likeSearch }
      ]
    })
  }

  public async listInstances (take: number, skip: number): Promise<Array<Instance & { state?: number }>> {
    const instances = await this.instanceRepository.find({
      take,
      skip
    })

    if (instances.length < 1) {
      return []
    }

    const statuses = await this.ec2InstancesService.getEC2InstanceStatus(instances.map((v) => v.id))

    return instances.map((v) => ({
      ...v,
      state: statuses?.find((i) => i.InstanceId === v.id)?.InstanceState?.Code
    }))
  }

  public async createInstance (instance: Instance): Promise<Instance> {
    const isAlreadyExist = await this.instanceRepository.findOneBy({
      name: instance.name
    })

    if (isAlreadyExist !== null) {
      throw new BadRequestException({
        message: `Instance name "${instance.name}" already exists.`
      })
    }

    const image = await this.storagesService.getLatestUbuntuImage()
    const price = await this.pricesService.getTypePricePerHour(instance.type)
    if (price === undefined) {
      throw new NotFoundException({
        message: `Instance type "${instance.type}" not found.`
      })
    }

    const subnet = await this.networksService.getSubnet()
    if (subnet === undefined) {
      throw new NotFoundException({
        message: 'Subnet with "awsmgr-managed: true" tag not found.'
      })
    }

    const keypair = await this.keypairsService.createKeypair(instance.name)
    if (keypair === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during create keypair.'
      })
    }

    const keypairId = await this.keypairsService.saveKeypair(keypair)

    const ports = instance.ports.split(',').map((v) => Math.abs(parseInt(v))).filter((v) => !isNaN(v))
    const securityGroupId = await this.sgService.createSecurityGroupId(instance.name, subnet.VpcId ?? '', ports)
    if (securityGroupId === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during create securityGroup.'
      })
    }

    const ec2Instance = await this.ec2InstancesService.createEC2Instance({
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

    await this.utilsService.waitForState(ec2Instance.InstanceId ?? '', 'running')

    const publicIP = await this.networksService.attachEIP(ec2Instance.InstanceId ?? '')
    if (publicIP === undefined) {
      throw new InternalServerErrorException({
        message: 'Internal error has been occurred during attach EIP.'
      })
    }

    const result: Instance = {
      ...instance,
      publicIP,
      keypairId,
      pricePerHour: price,
      id: ec2Instance.InstanceId ?? ''
    }

    await this.instanceRepository.insert(result)
    return result
  }

  public async updateInstance (id: string, modifications: Instance): Promise<Instance> {
    const instance = await this.instanceRepository.findOneBy({
      id
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    if (modifications.name !== instance.name) {
      throw new BadRequestException('Instance name cannot be changed.')
    }

    if (modifications.ports !== instance.ports) {
      const ports = modifications.ports.split(',').map((v) => Math.abs(parseInt(v))).filter((v) => !isNaN(v))
      await this.sgService.updateSecurityGroup(instance.name ?? '', ports)
    }

    let pricePerHour: number | undefined
    if (modifications.storageSize !== instance.storageSize || modifications.type !== instance.type) {
      await this.ec2InstancesService.stopEC2Instance(instance.id)
      await this.utilsService.waitForState(instance.id, 'stopped')

      if (modifications.storageSize !== instance.storageSize) {
        const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.id)
        const volumeId = ec2Instance?.BlockDeviceMappings?.[0].Ebs?.VolumeId

        void this.storagesService.updateRootStorage(volumeId ?? '', modifications.storageSize)
      }

      if (modifications.type !== instance.type) {
        pricePerHour = await this.pricesService.getTypePricePerHour(modifications.type)
        await this.ec2InstancesService.updateEC2InstanceType(instance.id, modifications.type)
      }

      await this.ec2InstancesService.startEC2Instance(instance.id)
      await this.utilsService.waitForState(instance.id, 'running')
    }

    const updateOption = {
      ...modifications,
      pricePerHour
    } as any

    if (pricePerHour === undefined) {
      delete updateOption.pricePerHour
    }

    delete updateOption.id
    delete updateOption.keypairId
    delete updateOption.publicIP

    await this.instanceRepository.update({ id }, updateOption)

    return {
      ...instance,
      ...updateOption
    }
  }

  public async deleteInstance (id: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      id
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    await this.networksService.detachEIP(instance.id)
    await this.keypairsService.deleteKeypair(instance.name)

    await this.ec2InstancesService.deleteEC2Instance(instance.id)
    await this.utilsService.waitForState(instance.id, 'terminated')

    await this.sgService.deleteSecurityGroup(instance.name)

    await this.instanceRepository.delete({
      id
    })
  }

  public async restartInstance (id: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      id
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    const ec2Instance = await this.ec2InstancesService.getEC2InstanceStatus(id)
    if (ec2Instance?.InstanceState?.Name === 'stopped') {
      await this.ec2InstancesService.startEC2Instance(id)
      return
    }

    await this.ec2InstancesService.restartEC2Instance(id)
  }

  public async resetInstance (id: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      id
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    await this.storagesService.resetRootSorage(instance.id)
  }

  public async getInstanceKeypair (id: string): Promise<string> {
    const instance = await this.instanceRepository.findOneBy({
      id
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    return await this.keypairsService.loadKeypair(instance.keypairId)
  }

  public async getAllPricePerHour (): Promise<{ pricePerHour: number, storageSize: number }> {
    const instances = await this.instanceRepository.find({
      select: {
        pricePerHour: true,
        storageSize: true
      }
    })

    return {
      pricePerHour: instances.reduce((prev, curr) => prev + curr.pricePerHour, 0),
      storageSize: instances.reduce((prev, curr) => prev + curr.storageSize, 0)
    }
  }
}
