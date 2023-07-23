import { IsIP, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Instance {
  @IsUUID()
  @IsOptional()
  @PrimaryGeneratedColumn('uuid')
  public readonly uuid: string

  @IsString()
  @Column()
  public readonly category: string

  @IsString()
  @Column()
  public readonly name: string

  @IsString()
  @Column()
  public readonly description: string

  @IsString()
  @Column()
  public readonly owner: string

  @IsString()
  @Column()
  public readonly type: string

  @IsInt()
  @IsPositive()
  @Column()
  public readonly storageSize: number

  /** Comma-separated */
  @IsString()
  @Column()
  public readonly ports: string

  @IsString()
  @Column()
  public readonly memo: string

  // system-specific ---

  @IsString()
  @Column()
  @IsOptional()
  public readonly keypairId: string

  @IsIP()
  @Column()
  @IsOptional()
  public readonly publicIP: string

  @IsNumber()
  @Column()
  @IsOptional()
  public readonly pricePerHour: number
}
