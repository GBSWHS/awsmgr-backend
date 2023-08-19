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

  @Get('/:id')
  public async getInviteInstance (@Param('id') id: string): PResBody<Instance> {
    const invite = await this.invitesService.getInviteInstance(id)

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

  @Post('/:id/restart')
  public async restartInviteInstance (@Param('id') id: string): PResBody {
    await this.invitesService.restartInviteInstance(id)

    return {
      success: true
    }
  }

  @Post('/:id/reset')
  public async resetInviteInstance (@Param('id') id: string): PResBody {
    await this.invitesService.resetInviteInstance(id)

    return {
      success: true
    }
  }

  @Get('/:id/keypair')
  public async getInviteInstanceKeypair (@Param('id') id: string): PResBody<string> {
    const keypair = await this.invitesService.getInviteInstanceKeypair(id)

    return {
      success: true,
      body: keypair
    }
  }
}
