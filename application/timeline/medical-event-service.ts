/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  MedicalEventCreateInput,
  MedicalEventListInput,
  MedicalEventRepository,
  MedicalEventUpdateInput,
} from '../../ports/medical-event-repository'
import { medicalEventDto } from '../dto/medical-event'
import type { MedicalEventDto } from '../dto/medical-event'

/**
 * M002 (D5): only `note` entries support editing and deletion; auto and
 * future-module event types are read-only.
 */
export class NoteNotEditableError extends Error {
  constructor() {
    super('Запись не поддерживает редактирование')
    this.name = 'NoteNotEditableError'
  }
}

export class MedicalEventService {
  constructor(private readonly events: MedicalEventRepository) {}
  list(familyId: string, personId: string, input: any) {
    return this.events
      .list(familyId, personId, input as MedicalEventListInput)
      .then((r) => ({
        events: r.events.map(medicalEventDto),
        total: r.total,
      }))
  }
  get(familyId: string, personId: string, id: string) {
    return this.events
      .get(familyId, personId, id)
      .then((e) => e && medicalEventDto(e))
  }
  create(
    familyId: string,
    personId: string,
    input: {
      occurredAt: string
      title: string
      description: string | null
      episodeId: string | null
    },
    authorId: string,
  ): Promise<MedicalEventDto> {
    const payload: MedicalEventCreateInput = {
      type: 'note',
      occurredAt: input.occurredAt,
      episodeId: input.episodeId,
      title: input.title,
      description: input.description,
      source: 'manual',
      authorId,
    }
    return this.events.create(familyId, personId, payload).then(medicalEventDto)
  }
  async update(
    familyId: string,
    personId: string,
    id: string,
    input: MedicalEventUpdateInput,
  ): Promise<MedicalEventDto | null> {
    const current = await this.events.get(familyId, personId, id)
    if (!current) return null
    if (current.type !== 'note') throw new NoteNotEditableError()
    // The row-level `type = 'note'` filter keeps the mutation safe even if a
    // future writer changes the event type between the check and the update.
    const updated = await this.events.update(
      familyId,
      personId,
      id,
      input,
      'note',
    )
    if (!updated) return null
    if (updated.type !== 'note') throw new NoteNotEditableError()
    return medicalEventDto(updated)
  }
  async delete(familyId: string, personId: string, id: string) {
    const current = await this.events.get(familyId, personId, id)
    if (!current) return false
    if (current.type !== 'note') throw new NoteNotEditableError()
    return this.events.delete(familyId, personId, id, 'note')
  }
}
