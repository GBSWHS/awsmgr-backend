import { PartialType } from '@nestjs/mapped-types'
import { Instance } from '../entity/instance.entity'

export class UpdateInstanceDto extends PartialType(Instance) {}
