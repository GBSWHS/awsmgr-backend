import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { InvitesService } from './invites.service'
import { PResBody } from '../types'
import { Invite } from './entity/invite.entity'
import { AuthGuard } from '../auth/auth.guard'
import { type Instance } from '../instances/entity/instance.entity'
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'

@ApiTags('invites')
@Controller('/invites')
export class InvitesController {
  constructor (
    private readonly invitesService: InvitesService
  ) {}

  @Get('/:uuid')
  public async getInviteInstance (uuid: string): PResBody<Instance> {
    const invite = await this.invitesService.getInviteInstance(uuid)

    return {
      success: true,
      body: invite
    }
  }

  @Post('/')
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  public async createInvite (@Body() invite: Invite): PResBody<Invite> {
    const result = await this.invitesService.createInvite(invite)

    return {
      success: true,
      body: result
    }
  }

  @Post('/:uuid/restart')
  public async restartInviteInstance (@Param('uuid') uuid: string): PResBody {
    await this.invitesService.restartInviteInstance(uuid)

    return {
      success: true
    }
  }

  @Post('/:uuid/reset')
  public async resetInviteInstance (@Param('uuid') uuid: string): PResBody {
    await this.invitesService.resetInviteInstance(uuid)

    return {
      success: true
    }
  }

  @Get('/:uuid/keypair')
  public async getInviteInstanceKeypair (@Param('uuid') uuid: string): PResBody<string> {
    const keypair = await this.invitesService.getInviteInstanceKeypair(uuid)

    return {
      success: true,
      body: keypair
    }
  }
}
