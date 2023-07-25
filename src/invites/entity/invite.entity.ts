import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IsOptional, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

@Entity()
export class Invite {
  @IsUUID()
  @IsOptional()
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public readonly uuid: string

  @IsUUID()
  @ApiProperty()
  @Column()
  public readonly instanceUUID: string
}
