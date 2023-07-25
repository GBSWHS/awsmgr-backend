import { ApiProperty } from '@nestjs/swagger'
import { IsIP, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Instance {
  @IsUUID()
  @IsOptional()
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  public readonly uuid: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly category: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly name: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly description: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly owner: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly type: string

  @IsInt()
  @IsPositive()
  @ApiProperty()
  @Column()
  public readonly storageSize: number

  /** Comma-separated */
  @IsString()
  @ApiProperty()
  @Column()
  public readonly ports: string

  @IsString()
  @ApiProperty()
  @Column()
  public readonly memo: string

  // system-specific ---

  @IsString()
  @Column()
  @ApiProperty()
  @IsOptional()
  public readonly keypairId: string

  @IsIP()
  @Column()
  @ApiProperty()
  @IsOptional()
  public readonly publicIP: string

  @IsNumber()
  @Column()
  @ApiProperty()
  @IsOptional()
  public readonly pricePerHour: number
}
