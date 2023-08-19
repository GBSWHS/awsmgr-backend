import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IsOptional, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

@Entity()
export class Invite {
  @IsUUID()
  @IsOptional()
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public readonly id: string

  @ApiProperty()
  @Column()
  public readonly instanceID: string
}
