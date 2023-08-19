import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

@Entity()
export class Invite {
  @IsUUID()
  @IsOptional()
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public readonly id: string

  @ApiProperty()
  @IsString()
  @Column()
  public readonly instanceID: string
}
