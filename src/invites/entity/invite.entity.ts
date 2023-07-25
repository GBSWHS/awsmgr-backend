import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { IsOptional, IsUUID } from 'class-validator'

@Entity()
export class Invite {
  @IsUUID()
  @IsOptional()
  @PrimaryGeneratedColumn('uuid')
  public readonly uuid: string

  @IsUUID()
  @Column()
  public readonly instanceUUID: string
}
