import { IsString } from 'class-validator'

export class GetLoginTokenDto {
  @IsString()
  public readonly password: string
}
