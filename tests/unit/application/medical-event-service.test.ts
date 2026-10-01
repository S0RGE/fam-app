import { describe, expect, it } from 'vitest'
import {
  MedicalEventService,
  NoteNotEditableError,
} from '../../../application/timeline/medical-event-service'
import type { MedicalEventRepository } from '../../../ports/medical-event-repository'
import type { MedicalEvent } from '../../../domain/medical-event'

const row: MedicalEvent = {
  id: 'event-id',
  familyId: 'family-a',
  personId: 'person-b',
  episodeId: 'episode-1',
  type: 'note',
  occurredAt: '2026-01-02T00:00:00.000Z',
  title: 'Заметка',
  description: 'Текст',
  source: 'manual',
  authorId: 'account-1',
  createdAt: 'c',
  updatedAt: 'u',
}

const auto: MedicalEvent = {
  ...row,
  id: 'auto-id',
  type: 'episode_start',
  title: 'Эпизод',
}

function mockRepo(existing: MedicalEvent[] = [row]) {
  const calls: { name: string; args: unknown[] }[] = []
  const repository: MedicalEventRepository = {
    list: async (familyId, personId, input) => {
      calls.push({ name: 'list', args: [familyId, personId, input] })
      return { events: existing, total: existing.length }
    },
    get: async (familyId, personId, id) => {
      calls.push({ name: 'get', args: [familyId, personId, id] })
      return existing.find((e) => e.id === id) ?? null
    },
    create: async (familyId, personId, input) => {
      calls.push({ name: 'create', args: [familyId, personId, input] })
      return { ...row, ...input }
    },
    update: async (familyId, personId, id, input, editableType) => {
      calls.push({
        name: 'update',
        args: [familyId, personId, id, input, editableType],
      })
      const found = existing.find((e) => e.id === id)
      return found ? { ...found, ...input } : null
    },
    delete: async (familyId, personId, id, editableType) => {
      calls.push({
        name: 'delete',
        args: [familyId, personId, id, editableType],
      })
      return existing.some((e) => e.id === id)
    },
  }
  return { repository, calls }
}

describe('MedicalEventService', () => {
  it('maps list rows to DTOs without tenant identifiers', async () => {
    const { repository } = mockRepo()
    const service = new MedicalEventService(repository)
    const result = await service.list('family-a', 'person-b', {
      limit: 20,
      offset: 0,
    })
    expect(result.total).toBe(1)
    expect(result.events[0]).toMatchObject({
      id: 'event-id',
      type: 'note',
      source: 'manual',
      authorId: 'account-1',
    })
    expect(result.events[0]).not.toHaveProperty('familyId')
    expect(result.events[0]).not.toHaveProperty('personId')
  })

  it('creates only notes with server-fixed type/source and the given author', async () => {
    const { repository, calls } = mockRepo()
    const service = new MedicalEventService(repository)
    const created = await service.create(
      'family-a',
      'person-b',
      {
        occurredAt: '2026-01-02T00:00:00.000Z',
        title: 'Новая заметка',
        description: null,
        episodeId: null,
      },
      'account-1',
    )
    const createCall = calls.find((c) => c.name === 'create')
    expect(createCall?.args).toEqual([
      'family-a',
      'person-b',
      {
        type: 'note',
        occurredAt: '2026-01-02T00:00:00.000Z',
        episodeId: null,
        title: 'Новая заметка',
        description: null,
        source: 'manual',
        authorId: 'account-1',
      },
    ])
    expect(created).toMatchObject({ type: 'note', source: 'manual' })
    expect(created).not.toHaveProperty('familyId')
  })

  it('updates only notes and forwards scoped identifiers', async () => {
    const { repository, calls } = mockRepo()
    const service = new MedicalEventService(repository)
    const updated = await service.update('family-a', 'person-b', 'event-id', {
      title: 'Обновлено',
    })
    expect(updated).toMatchObject({ title: 'Обновлено' })
    expect(calls.filter((c) => c.name === 'update')[0]?.args).toEqual([
      'family-a',
      'person-b',
      'event-id',
      { title: 'Обновлено' },
      'note',
    ])
    await expect(
      service.update('family-a', 'person-b', 'missing-id', { title: 'Х' }),
    ).resolves.toBeNull()
  })

  it('rejects updating and deleting non-note events with 409 semantics', async () => {
    const { repository } = mockRepo([auto])
    const service = new MedicalEventService(repository)
    await expect(
      service.update('family-a', 'person-b', 'auto-id', { title: 'Х' }),
    ).rejects.toThrow(NoteNotEditableError)
    await expect(
      service.delete('family-a', 'person-b', 'auto-id'),
    ).rejects.toThrow(NoteNotEditableError)
    await expect(
      service.update('family-a', 'person-b', 'auto-id', { title: 'Х' }),
    ).rejects.toMatchObject({
      message: 'Запись не поддерживает редактирование',
    })
  })

  it('deletes notes through the scoped repository', async () => {
    const { repository, calls } = mockRepo()
    const service = new MedicalEventService(repository)
    await expect(
      service.delete('family-a', 'person-b', 'event-id'),
    ).resolves.toBe(true)
    await expect(
      service.delete('family-a', 'person-b', 'missing-id'),
    ).resolves.toBe(false)
    // The repository delete is invoked only once, with scoped identifiers
    // and the editable-type guard; a missing event short-circuits before
    // the repository call.
    expect(calls.filter((c) => c.name === 'delete')).toEqual([
      {
        name: 'delete',
        args: ['family-a', 'person-b', 'event-id', 'note'],
      },
    ])
  })
})
