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
    const err = cause as {
      statusCode?: number
      data?: { error?: { code?: string; fields?: Record<string, string> } }
    }
    formFields.value = err.data?.error?.fields || {}
    if (err.statusCode === 409 && err.data?.error?.code === 'NOT_EDITABLE') {
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
  <section>
    <h1>Медицинская хронология</h1>
    <p><NuxtLink :to="`/people/${id}`">Назад к профилю</NuxtLink></p>

    <form class="event-filters" @submit.prevent="applyFilter">
      <label>
        Тип
        <select v-model="typeFilter" @change="applyFilter">
          <option value="">Все</option>
          <option
            v-for="[value, label] in typeOptions"
            :key="value"
            :value="value"
          >
            {{ label }}
          </option>
        </select>
      </label>
      <label>
        С даты
        <input
          v-model="fromFilter"
          type="datetime-local"
          @change="applyFilter"
        />
      </label>
      <label>
        По дату
        <input v-model="toFilter" type="datetime-local" @change="applyFilter" />
      </label>
      <label>
        Эпизод
        <select v-model="episodeFilter" @change="applyFilter">
          <option value="">Все</option>
          <option
            v-for="episode in episodesData?.data || []"
            :key="episode.id"
            :value="episode.id"
          >
            {{ episode.title }}
          </option>
        </select>
      </label>
      <button type="submit" :disabled="pending">Применить</button>
    </form>

    <p v-if="pending" role="status">Загрузка событий…</p>
    <p v-else-if="error" role="alert">Не удалось загрузить события.</p>
    <p v-else-if="!data || !data.data.length">Событий пока нет.</p>
    <template v-else>
      <EventList
        :events="data.data"
        :person-id="id"
        editable
        :busy="busy"
        @edit="startEdit"
        @remove="remove"
      />
      <p>Всего: {{ data.meta.total }}</p>
      <p v-if="data.meta.total > 0" class="event-pager">
        <button
          type="button"
          :disabled="offset === 0 || pending"
          @click="step(false)"
        >
          Назад
        </button>
        <button
          type="button"
          :disabled="offset + limit >= data.meta.total || pending"
          @click="step(true)"
        >
          Дальше
        </button>
      </p>

      <p v-if="formError" role="alert">{{ formError }}</p>
      <form v-if="editing" class="event-form" @submit.prevent="save">
        <h2>Редактирование заметки</h2>
        <label>
          Заголовок
          <input
            v-model="form.title"
            required
            maxlength="120"
            :disabled="busy"
            @input="onFormInput"
          />
          <span v-if="fieldError('title')" class="field-error">{{
            formFields.title
          }}</span>
        </label>
        <label>
          Текст
          <textarea
            v-model="form.description"
            maxlength="5000"
            :disabled="busy"
            @input="onFormInput"
          ></textarea>
          <span v-if="fieldError('description')" class="field-error">{{
            formFields.description
          }}</span>
        </label>
        <label>
          Дата и время
          <input
            v-model="form.occurredAt"
            type="datetime-local"
            required
            :disabled="busy"
            @input="onFormInput"
          />
          <span v-if="fieldError('occurredAt')" class="field-error">{{
            formFields.occurredAt
          }}</span>
        </label>
        <div class="event-form-actions">
          <button type="submit" :disabled="busy">
            {{ busy ? 'Сохранение…' : 'Сохранить' }}
          </button>
          <button type="button" :disabled="busy" @click="cancelEdit">
            Отменить
          </button>
        </div>
      </form>
    </template>
  </section>
</template>
