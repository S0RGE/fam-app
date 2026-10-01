import type { FamilyId, PersonId } from './shared'

/**
 * All eight event types (spec §8). M002 creates only `note` and the two
 * auto-generated episode events; the remaining types appear with their
 * subject modules in later milestones.
 */
export type MedicalEventType =
  | 'note'
  | 'measurement'
  | 'lab_report'
  | 'visit'
  | 'prescription'
  | 'document'
  | 'episode_start'
  | 'episode_end'

export type MedicalEventSource = 'manual' | 'import'

export interface MedicalEvent {
  id: string
  familyId: FamilyId
  personId: PersonId
  episodeId: string | null
  type: MedicalEventType
  occurredAt: string
  title: string
  description: string | null
  source: MedicalEventSource
  /** Account (auth sub) that created the entry; plain uuid, no FK. */
  authorId: string
  createdAt: string
  updatedAt: string
}
