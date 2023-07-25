import { Injectable, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Invite } from './entity/invite.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { Instance } from '../instances/entity/instance.entity'
import { InstancesService } from '../instances/instances.service'

@Injectable()
export class InvitesService {
  constructor (
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,

    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    private readonly instancesService: InstancesService
  ) {}

  public async createInvite (invite: Invite): Promise<Invite> {
    const uuid = randomUUID()
    const instance = await this.instanceRepository.findOneBy({
      uuid: invite.instanceUUID
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${invite.instanceUUID}"`)
    }

    await this.inviteRepository.insert({
      uuid,
      instanceUUID: invite.instanceUUID
    })

    return {
      uuid,
      instanceUUID: invite.instanceUUID
    }
  }

  public async getInviteInstance (uuid: string): Promise<Instance> {
    const invite = await this.inviteRepository.findOneBy({
      uuid
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite uuid: "${uuid}"`)
    }

    const instance = await this.instanceRepository.findOneBy({
      uuid: invite.instanceUUID
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance uuid: "${uuid}"`)
    }

    return instance
  }

  public async restartInviteInstance (uuid: string): Promise<void> {
    const invite = await this.inviteRepository.findOneBy({
      uuid
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite uuid: "${uuid}"`)
    }

    await this.instancesService.restartInstance(invite.instanceUUID)
  }

  public async resetInviteInstance (uuid: string): Promise<void> {
    const invite = await this.inviteRepository.findOneBy({
      uuid
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite uuid: "${uuid}"`)
    }

    await this.instancesService.resetInstance(invite.instanceUUID)
  }

  public async getInviteInstanceKeypair (uuid: string): Promise<string> {
    const invite = await this.inviteRepository.findOneBy({
      uuid
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite uuid: "${uuid}"`)
    }

    return await this.instancesService.getInstanceKeypair(invite.instanceUUID)
  }
}
