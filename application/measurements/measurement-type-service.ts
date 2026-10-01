import type {
  MeasurementTypeCreateInput,
  MeasurementTypeListInput,
  MeasurementTypeRepository,
  MeasurementTypeUpdateInput,
} from '../../ports/measurement-type-repository'
import { measurementTypeDto } from '../dto/measurement-type'

export class PresetNotEditableError extends Error {
  constructor() {
    super('Предустановленный тип нельзя изменить')
    this.name = 'PresetNotEditableError'
  }
}

export class MeasurementTypeService {
  constructor(private readonly types: MeasurementTypeRepository) {}

  async list(familyId: string, input: MeasurementTypeListInput) {
    const result = await this.types.list(familyId, input)
    return {
      types: result.types.map(measurementTypeDto),
      total: result.total,
    }
  }

  async get(familyId: string, typeId: string) {
    const type = await this.types.get(familyId, typeId)
    return type && measurementTypeDto(type)
  }

  async create(familyId: string, input: MeasurementTypeCreateInput) {
    return measurementTypeDto(await this.types.create(familyId, input))
  }

  async update(
    familyId: string,
    typeId: string,
    input: MeasurementTypeUpdateInput,
  ) {
    const current = await this.types.get(familyId, typeId)
    if (!current) return null
    if (current.isPreset) throw new PresetNotEditableError()
    const updated = await this.types.update(familyId, typeId, input)
    return updated && measurementTypeDto(updated)
  }
}
