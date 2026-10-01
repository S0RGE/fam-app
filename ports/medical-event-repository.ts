import type {
  MedicalEvent,
  MedicalEventSource,
  MedicalEventType,
} from '../domain/medical-event'

export interface MedicalEventListInput {
  limit: number
  offset: number
  /** Inclusive lower bound of `occurredAt` (ISO datetime, UTC at the edge). */
  from?: string
  /** Inclusive upper bound of `occurredAt` (ISO datetime, UTC at the edge). */
  to?: string
  type?: MedicalEventType
  episodeId?: string
}

export interface MedicalEventCreateInput {
  type: MedicalEventType
  occurredAt: string
  episodeId: string | null
  title: string
  description: string | null
  source: MedicalEventSource
  /** Account (auth sub) that creates the entry; enforced by D1. */
  authorId: string
}

export interface MedicalEventUpdateInput {
  occurredAt?: string
  title?: string
  description?: string | null
  episodeId?: string | null
}

export interface MedicalEventRepository {
  list(
    familyId: string,
    personId: string,
    input: MedicalEventListInput,
  ): Promise<{ events: MedicalEvent[]; total: number }>
  create(
    familyId: string,
    personId: string,
    input: MedicalEventCreateInput,
  ): Promise<MedicalEvent>
  get(
    familyId: string,
    personId: string,
    eventId: string,
  ): Promise<MedicalEvent | null>
  update(
    familyId: string,
    personId: string,
    eventId: string,
    input: MedicalEventUpdateInput,
    /** M002 D5: restrict the mutation to one editable event type. */
    editableType?: MedicalEventType,
  ): Promise<MedicalEvent | null>
  delete(
    familyId: string,
    personId: string,
    eventId: string,
    /** M002 D5: restrict the mutation to one editable event type. */
    editableType?: MedicalEventType,
  ): Promise<boolean>
}
