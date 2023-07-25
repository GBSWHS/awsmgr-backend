import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class GetLoginTokenDto {
  @IsString()
  @ApiProperty({
    description: '관리자 비밀번호'
  })
  public readonly password: string
}
