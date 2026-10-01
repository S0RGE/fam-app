import type { FamilyId, PersonId } from './shared'

export type EpisodeStatus = 'active' | 'completed'

export interface EpisodeSymptom {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface EpisodeTag {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Episode {
  id: string
  familyId: FamilyId
  personId: PersonId
  title: string
  description: string | null
  status: EpisodeStatus
  startedAt: string
  endedAt: string | null
  outcome: string | null
  symptoms: EpisodeSymptom[]
  tags: EpisodeTag[]
  createdAt: string
  updatedAt: string
}
