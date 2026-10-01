<script setup lang="ts">
type Episode = {
  id: string
  title: string
  description: string | null
  status: 'active' | 'completed'
  startedAt: string
  endedAt: string | null
  outcome: string | null
  symptoms: { id: string; name: string; description: string | null }[]
  tags: { id: string; name: string }[]
}

const route = useRoute()
const personId = route.params.personId as string
const episodeId = route.params.episodeId as string

const { data, error, pending, refresh } = await useFetch<{
  data: Episode
}>(() => `/api/v1/people/${personId}/episodes/${episodeId}`)
const episode = computed<Episode | null>(() => data.value?.data || null)

const busy = ref(false)
const message = ref('')
const formError = ref('')
const formFields = ref<Record<string, string>>({})
const editing = ref(false)
const form = reactive({
  title: '',
  description: '',
  startedAt: '',
  endedAt: '',
  outcome: '',
  symptoms: [] as { name: string; description: string }[],
  tags: '',
})

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
watch(
  episode,
  (value: Episode | null) => {
    if (!value) return
    form.title = value.title
    form.description = value.description || ''
    form.startedAt = toLocalInput(value.startedAt)
    form.endedAt = toLocalInput(value.endedAt)
    form.outcome = value.outcome || ''
    form.symptoms = value.symptoms.map(
      (symptom: { name: string; description: string | null }) => ({
        name: symptom.name,
        description: symptom.description || '',
      }),
    )
    form.tags = value.tags.map((tag: { name: string }) => tag.name).join(', ')
  },
  { immediate: true },
)

function addSymptom() {
  form.symptoms.push({ name: '', description: '' })
}
function removeSymptom(index: number) {
  form.symptoms.splice(index, 1)
}

async function save() {
  busy.value = true
  formError.value = ''
  formFields.value = {}
  try {
    await $fetch(`/api/v1/people/${personId}/episodes/${episodeId}`, {
      method: 'PATCH',
      body: {
        title: form.title,
        description: form.description || null,
        startedAt: form.startedAt,
        endedAt: form.endedAt || null,
        outcome: form.outcome || null,
        symptoms: form.symptoms
          .filter((symptom: { name: string; description: string }) =>
            symptom.name.trim(),
          )
          .map((symptom: { name: string; description: string }) => ({
            name: symptom.name,
            description: symptom.description || null,
          })),
        tags: form.tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean),
      },
    })
    editing.value = false
    message.value = 'Эпизод сохранён.'
    await refresh()
  } catch (cause: unknown) {
    formFields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    formError.value = 'Не удалось сохранить эпизод. Проверьте поля.'
  } finally {
    busy.value = false
  }
}

async function transition() {
  if (!episode.value) return
  const toCompleted = episode.value.status === 'active'
  const text = toCompleted ? 'Завершить эпизод?' : 'Повторно открыть эпизод?'
  if (!confirm(text)) return
  busy.value = true
  formError.value = ''
  try {
    await $fetch(`/api/v1/people/${personId}/episodes/${episodeId}`, {
      method: 'PUT',
      body: { status: toCompleted ? 'completed' : 'active' },
    })
    message.value = toCompleted ? 'Эпизод завершён.' : 'Эпизод снова активен.'
    await refresh()
  } catch {
    formError.value = 'Не удалось изменить статус эпизода.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm('Удалить эпизод? Это действие нельзя отменить.')) return
  busy.value = true
  try {
    await $fetch(`/api/v1/people/${personId}/episodes/${episodeId}`, {
      method: 'DELETE',
    })
    await navigateTo(`/people/${personId}/episodes`)
  } catch {
    formError.value = 'Не удалось удалить эпизод.'
    busy.value = false
  }
}

function formatInstant(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}
function fieldError(key: string) {
  return formFields.value[key]
}
onBeforeRouteLeave(
  () =>
    !editing.value ||
    confirm('Есть несохранённые изменения. Покинуть страницу?'),
)
</script>
<template>
  <section>
    <h1>Эпизод</h1>
    <p>
      <NuxtLink :to="`/people/${personId}/episodes`">
        К списку эпизодов
      </NuxtLink>
    </p>
    <p v-if="pending" role="status">Загрузка эпизода…</p>
    <p v-else-if="error" role="alert">Эпизод не найден или недоступен.</p>
    <template v-else-if="episode">
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="formError" role="alert">{{ formError }}</p>
      <header class="episode-header">
        <h2>{{ episode.title }}</h2>
        <p>
          <span class="episode-status">{{
            episode.status === 'active' ? 'Активен' : 'Завершён'
          }}</span>
        </p>
      </header>
      <dl class="episode-meta">
        <div>
          <dt>Начался</dt>
          <dd>{{ formatInstant(episode.startedAt) }} (UTC)</dd>
        </div>
        <div>
          <dt>Завершён</dt>
          <dd>
            {{
              episode.endedAt
                ? `${formatInstant(episode.endedAt)} (UTC)`
                : 'Не завершён'
            }}
          </dd>
        </div>
      </dl>
      <p v-if="episode.description">{{ episode.description }}</p>
      <h3>Итог</h3>
      <p>{{ episode.outcome || 'Не указан.' }}</p>
      <h3>Симптомы</h3>
      <p v-if="!episode.symptoms.length">Симптомы не указаны.</p>
      <ul v-else>
        <li v-for="symptom in episode.symptoms" :key="symptom.id">
          <strong>{{ symptom.name }}</strong>
          <span v-if="symptom.description"> — {{ symptom.description }}</span>
        </li>
      </ul>
      <h3>Теги</h3>
      <p v-if="!episode.tags.length">Теги не указаны.</p>
      <p v-else>
        {{ episode.tags.map((tag: { name: string }) => tag.name).join(', ') }}
      </p>

      <form v-if="editing" @submit.prevent="save">
        <h2>Редактирование</h2>
        <label>
          Название
          <input v-model="form.title" required maxlength="120" />
          <span v-if="fieldError('title')" class="field-error">{{
            formFields.title
          }}</span>
        </label>
        <label>
          Описание
          <textarea v-model="form.description" maxlength="5000"></textarea>
          <span v-if="fieldError('description')" class="field-error">{{
            formFields.description
          }}</span>
        </label>
        <label>
          Дата начала
          <input v-model="form.startedAt" type="datetime-local" required />
          <span v-if="fieldError('startedAt')" class="field-error">{{
            formFields.startedAt
          }}</span>
        </label>
        <label>
          Дата завершения
          <input v-model="form.endedAt" type="datetime-local" />
          <span v-if="fieldError('endedAt')" class="field-error">{{
            formFields.endedAt
          }}</span>
        </label>
        <label>
          Итог
          <textarea v-model="form.outcome" maxlength="2000"></textarea>
          <span v-if="fieldError('outcome')" class="field-error">{{
            formFields.outcome
          }}</span>
        </label>
        <h3>Симптомы</h3>
        <p v-if="!form.symptoms.length">Симптомы не добавлены.</p>
        <fieldset v-for="(symptom, index) in form.symptoms" :key="index">
          <label>
            Название симптома
            <input v-model="symptom.name" required maxlength="200" />
            <span v-if="fieldError(`symptoms.${index}.name`)">
              <span class="field-error">{{
                formFields[`symptoms.${index}.name`]
              }}</span>
            </span>
          </label>
          <label>
            Описание
            <textarea v-model="symptom.description" maxlength="2000"></textarea>
            <span v-if="fieldError(`symptoms.${index}.description`)">
              <span class="field-error">{{
                formFields[`symptoms.${index}.description`]
              }}</span>
            </span>
          </label>
          <button type="button" @click="removeSymptom(index)">
            Удалить симптом
          </button>
        </fieldset>
        <button type="button" @click="addSymptom">Добавить симптом</button>
        <label>
          Теги (через запятую)
          <input v-model="form.tags" />
          <span v-if="fieldError('tags')" class="field-error">{{
            formFields.tags
          }}</span>
        </label>
        <div class="episode-form-actions">
          <button type="submit" :disabled="busy">
            {{ busy ? 'Сохранение…' : 'Сохранить' }}
          </button>
          <button type="button" :disabled="busy" @click="editing = false">
            Отменить
          </button>
        </div>
      </form>
      <p v-else class="episode-actions">
        <button type="button" :disabled="busy" @click="editing = true">
          Редактировать
        </button>
        <button type="button" :disabled="busy" @click="transition">
          {{ episode.status === 'active' ? 'Завершить' : 'Повторно открыть' }}
        </button>
        <button type="button" class="danger" :disabled="busy" @click="remove">
          Удалить
        </button>
      </p>
    </template>
  </section>
</template>
