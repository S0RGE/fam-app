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

const route = useRoute()
const id = route.params.personId as string

const typeFilter = ref('')
const fromFilter = ref('')
const toFilter = ref('')
const episodeFilter = ref('')
const offset = ref(0)
const limit = 20

function timelineQuery() {
  const params = new URLSearchParams(`limit=${limit}&offset=${offset.value}`)
  if (typeFilter.value) params.set('type', typeFilter.value)
  if (fromFilter.value)
    params.set('from', new Date(fromFilter.value).toISOString())
  if (toFilter.value) params.set('to', new Date(toFilter.value).toISOString())
  if (episodeFilter.value) params.set('episodeId', episodeFilter.value)
  return params.toString()
}

const { data, error, pending, refresh } = await useFetch<{
  data: MedicalEventDto[]
  meta: {
    limit: number
    offset: number
    from?: string
    to?: string
    type?: string
    episodeId?: string
    total: number
  }
}>(() => `/api/v1/people/${id}/timeline?${timelineQuery()}`)

/** Список эпизодов для фильтра хронологии (spec §8 «фильтр по эпизоду»). */
const { data: episodesData } = await useFetch<{
  data: { id: string; title: string }[]
}>(`/api/v1/people/${id}/episodes?limit=100&offset=0`)

async function applyFilter() {
  offset.value = 0
  await refresh()
}
async function step(next: boolean) {
  offset.value = next ? offset.value + limit : Math.max(0, offset.value - limit)
  await refresh()
}

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
const typeOptions = Object.entries(typeNames) as [
  MedicalEventDto['type'],
  string,
][]

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

type EditForm = {
  id: string
  title: string
  description: string
  occurredAt: string
}
const editing = ref(false)
const form = ref<EditForm>({
  id: '',
  title: '',
  description: '',
  occurredAt: '',
})
const busy = ref(false)
const formError = ref('')
const formFields = ref<Record<string, string>>({})
const dirty = ref(false)

function onFormInput() {
  dirty.value = true
  formError.value = ''
}
function startEdit(event: MedicalEventDto) {
  form.value = {
    id: event.id,
    title: event.title,
    description: event.description || '',
    occurredAt: toLocalInput(event.occurredAt),
  }
  dirty.value = false
  formError.value = ''
  formFields.value = {}
  editing.value = true
}
function cancelEdit() {
  editing.value = false
  dirty.value = false
  formError.value = ''
  formFields.value = {}
}
async function save() {
  busy.value = true
  formError.value = ''
  formFields.value = {}
  try {
    await $fetch(`/api/v1/people/${id}/timeline/${form.value.id}`, {
      method: 'PATCH',
      body: {
        title: form.value.title,
        description: form.value.description || null,
        occurredAt: new Date(form.value.occurredAt).toISOString(),
      },
    })
    editing.value = false
    dirty.value = false
    await refresh()
  } catch (cause: unknown) {
    const apiError = parseApiError(cause)
    formFields.value = apiError.fields
    if (apiError.statusCode === 409 && apiError.code === 'NOT_EDITABLE') {
      formError.value = 'Запись не поддерживает редактирование.'
    } else {
      formError.value = 'Не удалось сохранить заметку. Проверьте поля.'
    }
  } finally {
    busy.value = false
  }
}
async function remove(event: MedicalEventDto) {
  if (!confirm('Удалить заметку? Это действие нельзя отменить.')) return
  busy.value = true
  try {
    await $fetch(`/api/v1/people/${id}/timeline/${event.id}`, {
      method: 'DELETE',
    })
    await refresh()
  } catch {
    formError.value = 'Не удалось удалить заметку.'
  } finally {
    busy.value = false
  }
}
function fieldError(key: string) {
  return formFields.value[key]
}
onBeforeRouteLeave(
  () =>
    !dirty.value || confirm('Есть несохранённые изменения. Покинуть страницу?'),
)
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Медицинская хронология'">
      <template #description>
        <NuxtLink
          :to="`/people/${id}`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Назад к профилю</NuxtLink
        >
      </template>
    </UPageHeader>

    <UPageCard>
      <template #header>
        <h2 class="text-base font-semibold">Фильтры</h2>
      </template>
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="applyFilter">
        <UFormField label="Тип">
          <select
            v-model="typeFilter"
            class="native-select"
            aria-label="Тип"
            @change="applyFilter"
          >
            <option value="">Все</option>
            <option
              v-for="[value, label] in typeOptions"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Эпизод">
          <select
            v-model="episodeFilter"
            class="native-select"
            aria-label="Эпизод"
            @change="applyFilter"
          >
            <option value="">Все</option>
            <option
              v-for="episode in episodesData?.data || []"
              :key="episode.id"
              :value="episode.id"
            >
              {{ episode.title }}
            </option>
          </select>
        </UFormField>
        <UFormField label="С даты">
          <UInput
            v-model="fromFilter"
            type="datetime-local"
            aria-label="С даты"
            @change="applyFilter"
          />
        </UFormField>
        <UFormField label="По дату">
          <UInput
            v-model="toFilter"
            type="datetime-local"
            aria-label="По дату"
            @change="applyFilter"
          />
        </UFormField>
        <div class="md:col-span-2">
          <UButton type="submit" :loading="pending">Применить</UButton>
        </div>
      </form>
    </UPageCard>

    <p
      v-if="pending"
      role="status"
      aria-label="Загрузка событий…"
      class="text-sm text-neutral-600 dark:text-neutral-400"
    >
      Загрузка событий…
    </p>
    <p
      v-else-if="error"
      role="alert"
      class="text-sm text-red-700 dark:text-red-400"
    >
      Не удалось загрузить события.
    </p>
    <p
      v-else-if="!data || !data.data.length"
      class="text-sm text-neutral-600 dark:text-neutral-400"
    >
      Событий пока нет.
    </p>
    <template v-else>
      <EventList
        :events="data.data"
        :person-id="id"
        editable
        :busy="busy"
        @edit="startEdit"
        @remove="remove"
      />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium">Всего: {{ data.meta.total }}</p>
        <div v-if="data.meta.total > 0" class="flex gap-2">
          <UButton
            type="button"
            variant="outline"
            size="sm"
            :disabled="offset === 0 || pending"
            @click="step(false)"
          >
            Назад
          </UButton>
          <UButton
            type="button"
            variant="outline"
            size="sm"
            :disabled="offset + limit >= data.meta.total || pending"
            @click="step(true)"
          >
            Дальше
          </UButton>
        </div>
      </div>

      <p
        v-if="formError"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        {{ formError }}
      </p>
      <UPageCard v-if="editing">
        <template #header>
          <h2 class="text-base font-semibold">Редактирование заметки</h2>
        </template>
        <form class="flex flex-col gap-4" @submit.prevent="save">
          <UFormField label="Заголовок">
            <UInput
              v-model="form.title"
              aria-label="Заголовок"
              required
              :maxlength="120"
              :disabled="busy"
              @input="onFormInput"
            />
          </UFormField>
          <p
            v-if="fieldError('title')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields.title }}
          </p>
          <UFormField label="Текст">
            <UTextarea
              v-model="form.description"
              aria-label="Текст"
              :maxlength="5000"
              :rows="4"
              :disabled="busy"
              @input="onFormInput"
            />
          </UFormField>
          <p
            v-if="fieldError('description')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields.description }}
          </p>
          <UFormField label="Дата и время">
            <UInput
              v-model="form.occurredAt"
              aria-label="Дата и время"
              type="datetime-local"
              required
              :disabled="busy"
              @input="onFormInput"
            />
          </UFormField>
          <p
            v-if="fieldError('occurredAt')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields.occurredAt }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton type="submit" :loading="busy">Сохранить</UButton>
            <UButton
              type="button"
              variant="outline"
              :disabled="busy"
              @click="cancelEdit"
            >
              Отменить
            </UButton>
          </div>
        </form>
      </UPageCard>
    </template>
  </UPage>
</template>
