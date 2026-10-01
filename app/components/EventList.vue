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
  <ul class="m-0 grid list-none gap-3 p-0">
    <li
      v-for="event in props.events"
      :key="event.id"
      class="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div
        class="flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
      >
        <UBadge class="event-type" color="primary" variant="soft">
          {{ typeNames[event.type] }}
        </UBadge>
        <time :datetime="event.occurredAt">
          {{ formatDateTime(event.occurredAt) }}
        </time>
        <span v-if="event.type !== 'note'">только просмотр</span>
      </div>
      <h3
        class="mt-3 break-words text-base font-semibold text-neutral-950 dark:text-white"
      >
        {{ event.title }}
      </h3>
      <p
        v-if="event.description"
        class="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300"
      >
        {{ event.description }}
      </p>
      <p
        v-if="
          (event.type === 'episode_start' || event.type === 'episode_end') &&
          event.episodeId
        "
        class="mt-3"
      >
        <NuxtLink
          :to="`/people/${props.personId}/episodes/${event.episodeId}`"
          :aria-label="`Открыть эпизод: ${event.title}`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Открыть эпизод</NuxtLink
        >
      </p>
      <div v-if="event.type === 'note'" class="mt-3 flex flex-wrap gap-2">
        <template v-if="props.editable">
          <UButton
            type="button"
            variant="outline"
            size="sm"
            :disabled="props.busy"
            @click="emit('edit', event)"
          >
            Редактировать
          </UButton>
          <UButton
            type="button"
            color="error"
            variant="soft"
            size="sm"
            :disabled="props.busy"
            @click="emit('remove', event)"
          >
            Удалить
          </UButton>
        </template>
        <span v-else class="text-sm text-neutral-600 dark:text-neutral-400">
          только просмотр
        </span>
      </div>
    </li>
  </ul>
</template>
