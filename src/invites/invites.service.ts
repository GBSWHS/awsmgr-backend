import { Injectable, NotFoundException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Invite } from './entity/invite.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { Instance } from '../instances/entity/instance.entity'
import { ManagedInstancesService } from '../instances/managedinstances.service'

@Injectable()
export class InvitesService {
  constructor (
    @InjectRepository(Instance)
    private readonly instanceRepository: Repository<Instance>,

    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    private readonly instancesService: ManagedInstancesService
  ) {}

  public async createInvite (invite: Invite): Promise<Invite> {
    const id = randomUUID()
    const instance = await this.instanceRepository.findOneBy({
      id: invite.instanceID
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${invite.instanceID}"`)
    }

    await this.inviteRepository.insert({
      id,
      instanceID: invite.instanceID
    })

    return {
      id,
      instanceID: invite.instanceID
    }
  }

  public async getInviteInstance (id: string): Promise<Instance> {
    const invite = await this.inviteRepository.findOneBy({
      id
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite id: "${id}"`)
    }

    const instance = await this.instanceRepository.findOneBy({
      id: invite.instanceID
    })

    if (instance === null) {
      throw new NotFoundException(`Cannot found instance id: "${id}"`)
    }

    return instance
  }

  public async restartInviteInstance (id: string): Promise<void> {
    const invite = await this.inviteRepository.findOneBy({
      id
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite id: "${id}"`)
    }

    await this.instancesService.restartInstance(invite.instanceID)
  }

  public async resetInviteInstance (id: string): Promise<void> {
    const invite = await this.inviteRepository.findOneBy({
      id
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite id: "${id}"`)
    }

    await this.instancesService.resetInstance(invite.instanceID)
  }

  public async getInviteInstanceKeypair (id: string): Promise<string> {
    const invite = await this.inviteRepository.findOneBy({
      id
    })

    if (invite === null) {
      throw new NotFoundException(`Cannot found invite id: "${id}"`)
    }

    return await this.instancesService.getInstanceKeypair(invite.instanceID)
  }
}
