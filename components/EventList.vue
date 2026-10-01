<script setup lang="ts">
type MedicalEventDto = {
  id: string
  type:
    | 'note'
    | 'measurement'
    | 'lab_report'
    | 'visit'
    | 'prescription'
    | 'document'
    | 'episode_start'
    | 'episode_end'
  occurredAt: string
  title: string
  description: string | null
  source: string
  authorId: string
  episodeId: string | null
  createdAt: string
  updatedAt: string
}
const props = withDefaults(
  defineProps<{
    events: MedicalEventDto[]
    personId: string
    /** показывает кнопки «Редактировать»/«Удалить» для заметок */
    editable?: boolean
    /** блокирует кнопки, пока идёт запрос */
    busy?: boolean
  }>(),
  { editable: false, busy: false },
)
const emit = defineEmits<{
  (e: 'edit' | 'remove', event: MedicalEventDto): void
}>()

const typeNames: Record<MedicalEventDto['type'], string> = {
  note: 'Заметка',
  measurement: 'Измерение',
  lab_report: 'Лабораторное исследование',
  visit: 'Посещение врача',
  prescription: 'Назначение',
  document: 'Документ',
  episode_start: 'Начало эпизода',
  episode_end: 'Завершение эпизода',
}

/** UTC-ISO с API форматируется на границе представления в локальном поясе. */
function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
<template>
  <ul class="event-list">
    <li v-for="event in props.events" :key="event.id" class="event-item">
      <p class="event-meta">
        <span class="event-type">{{ typeNames[event.type] }}</span>
        · {{ formatDateTime(event.occurredAt) }}
        <span v-if="event.type !== 'note'" class="event-readonly">
          · только просмотр
        </span>
      </p>
      <h3 class="event-title">{{ event.title }}</h3>
      <p v-if="event.description" class="event-description">
        {{ event.description }}
      </p>
      <p
        v-if="
          (event.type === 'episode_start' || event.type === 'episode_end') &&
          event.episodeId
        "
      >
        <NuxtLink
          :to="`/people/${props.personId}/episodes/${event.episodeId}`"
          :aria-label="`Открыть эпизод: ${event.title}`"
          >Открыть эпизод</NuxtLink
        >
      </p>
      <p v-if="event.type === 'note'" class="event-actions">
        <template v-if="props.editable">
          <button
            type="button"
            :disabled="props.busy"
            @click="emit('edit', event)"
          >
            Редактировать
          </button>
          <button
            type="button"
            class="danger"
            :disabled="props.busy"
            @click="emit('remove', event)"
          >
            Удалить
          </button>
        </template>
        <span v-else class="event-readonly">только просмотр</span>
      </p>
    </li>
  </ul>
</template>
