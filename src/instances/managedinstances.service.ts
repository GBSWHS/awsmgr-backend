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
    private readonly utilsService: UtilsService
  ) {}

  public async getInstance (uuid: string): Promise<Instance & { status?: number } | undefined> {
    const instance = await this.instanceRepository.findOneBy({ uuid }) ?? undefined
    if (instance === undefined) {
      return undefined
    }

    const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.name)

    return {
      ...instance,
      status: ec2Instance?.State?.Code
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
        { memo: likeSearch }
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
        { memo: likeSearch }
      ]
    })
  }

  public async listInstances (take: number, skip: number): Promise<Array<Instance & { status?: number }>> {
    const instances = await this.instanceRepository.find({
      take,
      skip
    })

    const statuses =
      await this.ec2InstancesService.listEC2Instances(instances.map((v) => v.name))

    return instances.map((v) => ({
      ...v,
      status: statuses?.find((i) => i.Tags?.find((t) => t.Key === 'Name' && t.Value === v.name))?.State?.Code
    }))
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

    await this.utilsService.waitForState('running', ec2Instance)

    const publicIP = await this.networksService.attachEIP(ec2Instance)
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

  public async updateInstance (uuid: string, modifications: Instance): Promise<Instance> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
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
      const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.name)
      if (ec2Instance === undefined) {
        throw new InternalServerErrorException('Internal error has been occurred during stop instance.')
      }

      await this.ec2InstancesService.stopEC2Instance(ec2Instance)
      await this.utilsService.waitForState('stopped', ec2Instance)

      if (modifications.storageSize !== instance.storageSize) {
        await this.storagesService.updateRootStorage(modifications.storageSize, ec2Instance)
      }

      if (modifications.type !== instance.type) {
        pricePerHour = await this.pricesService.getTypePricePerHour(modifications.type)
        await this.ec2InstancesService.updateEC2InstanceType(modifications.type, ec2Instance)
      }

      await this.ec2InstancesService.startEC2Instance(ec2Instance)
      await this.utilsService.waitForState('running', ec2Instance)
    }

    const updateOption = {
      ...modifications,
      pricePerHour
    } as any

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
    }
  }

  public async deleteInstance (uuid: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
    }

    const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.name)
    if (ec2Instance === undefined) {
      throw new InternalServerErrorException('Internal error has been occurred during delete instance.')
    }

    await this.networksService.detachEIP(ec2Instance)
    await this.keypairsService.deleteKeypair(instance.name)

    await this.ec2InstancesService.deleteEC2Instance(ec2Instance)
    await this.utilsService.waitForState('terminated', ec2Instance)

    await this.sgService.deleteSecurityGroup(instance.name)

    await this.instanceRepository.delete({
      uuid
    })
  }

  public async restartInstance (uuid: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
    }

    const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.name)
    if (ec2Instance === undefined) {
      throw new InternalServerErrorException('Internal error has been occurred during restart instance.')
    }
  }

  public async resetInstance (uuid: string): Promise<void> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
    }

    const ec2Instance = await this.ec2InstancesService.getEC2Instance(instance.name)
    if (ec2Instance === undefined) {
      throw new InternalServerErrorException('Internal error has been occurred during reset instance.')
    }
  }

  public async getInstanceKeypair (uuid: string): Promise<string> {
    const instance = await this.instanceRepository.findOneBy({
      uuid
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
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
