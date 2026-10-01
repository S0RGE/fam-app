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
const id = route.params.personId as string

const statusFilter = ref('')
const offset = ref(0)
const limit = 20

const { data, error, pending, refresh } = await useFetch<{
  data: Episode[]
  meta: { limit: number; offset: number; status?: string; total: number }
}>(
  () =>
    `/api/v1/people/${id}/episodes?limit=${limit}&offset=${offset.value}${
      statusFilter.value ? `&status=${statusFilter.value}` : ''
    }`,
)

async function applyFilter() {
  offset.value = 0
  await refresh()
}
async function step(next: boolean) {
  offset.value = next ? offset.value + limit : Math.max(0, offset.value - limit)
  await refresh()
}

type FormSymptom = { name: string; description: string }
const showForm = ref(false)
const form = reactive({
  title: '',
  description: '',
  startedAt: '',
  endedAt: '',
  outcome: '',
  symptoms: [] as FormSymptom[],
  tags: '',
})
const submitting = ref(false)
const formError = ref('')
const formFields = ref<Record<string, string>>({})

function addSymptom() {
  form.symptoms.push({ name: '', description: '' })
}
function removeSymptom(index: number) {
  form.symptoms.splice(index, 1)
}
function clearForm() {
  form.title = ''
  form.description = ''
  form.startedAt = ''
  form.endedAt = ''
  form.outcome = ''
  form.symptoms = []
  form.tags = ''
  formError.value = ''
  formFields.value = {}
}
async function createEpisode() {
  submitting.value = true
  formError.value = ''
  formFields.value = {}
  try {
    await $fetch(`/api/v1/people/${id}/episodes`, {
      method: 'POST',
      body: {
        title: form.title,
        description: form.description || null,
        startedAt: form.startedAt,
        endedAt: form.endedAt || null,
        outcome: form.outcome || null,
        symptoms: form.symptoms
          .filter((symptom: FormSymptom) => symptom.name.trim())
          .map((symptom: FormSymptom) => ({
            name: symptom.name,
            description: symptom.description || null,
          })),
        tags: form.tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean),
      },
    })
    clearForm()
    showForm.value = false
    offset.value = 0
    await refresh()
  } catch (cause: unknown) {
    formFields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    formError.value = 'Не удалось создать эпизод. Проверьте поля.'
  } finally {
    submitting.value = false
  }
}

function formatDay(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
function fieldError(key: string) {
  return formFields.value[key]
}
</script>
<template>
  <section>
    <h1>Эпизоды</h1>
    <p><NuxtLink :to="`/people/${id}`">Назад к профилю</NuxtLink></p>

    <div class="episodes-toolbar">
      <label>
        Статус
        <select v-model="statusFilter" @change="applyFilter">
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="completed">Завершённые</option>
        </select>
      </label>
      <button type="button" @click="showForm = !showForm">
        {{ showForm ? 'Скрыть форму' : 'Добавить эпизод' }}
      </button>
    </div>

    <form v-if="showForm" class="episode-form" @submit.prevent="createEpisode">
      <h2>Новый эпизод</h2>
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
          <span
            v-if="fieldError(`symptoms.${index}.name`)"
            class="field-error"
            >{{ formFields[`symptoms.${index}.name`] }}</span
          >
        </label>
        <label>
          Описание
          <textarea v-model="symptom.description" maxlength="2000"></textarea>
          <span
            v-if="fieldError(`symptoms.${index}.description`)"
            class="field-error"
            >{{ formFields[`symptoms.${index}.description`] }}</span
          >
        </label>
        <button type="button" @click="removeSymptom(index)">
          Удалить симптом
        </button>
      </fieldset>
      <button type="button" @click="addSymptom">Добавить симптом</button>
      <label>
        Теги (через запятую)
        <input v-model="form.tags" placeholder="например: сезонный, аллергия" />
        <span v-if="fieldError('tags')" class="field-error">{{
          formFields.tags
        }}</span>
      </label>
      <p v-if="formError" role="alert">{{ formError }}</p>
      <div class="episode-form-actions">
        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Создание…' : 'Создать эпизод' }}
        </button>
        <button type="button" :disabled="submitting" @click="clearForm">
          Отменить
        </button>
      </div>
    </form>

    <h2>Список</h2>
    <p v-if="pending" role="status">Загрузка эпизодов…</p>
    <p v-else-if="error" role="alert">Не удалось загрузить эпизоды.</p>
    <p v-else-if="!data || !data.data.length">
      Эпизодов пока нет. Добавьте первый эпизод.
    </p>
    <template v-else>
      <ul class="episodes-list">
        <li v-for="episode in data.data" :key="episode.id">
          <h3>
            <NuxtLink :to="`/people/${id}/episodes/${episode.id}`">{{
              episode.title
            }}</NuxtLink>
          </h3>
          <p>
            <span class="episode-status">{{
              episode.status === 'active' ? 'Активен' : 'Завершён'
            }}</span>
            · начался: {{ formatDay(episode.startedAt) }}
            <template v-if="episode.endedAt">
              · завершён: {{ formatDay(episode.endedAt) }}
            </template>
          </p>
          <p v-if="episode.symptoms.length">
            Симптомы:
            {{
              episode.symptoms
                .map((symptom: { name: string }) => symptom.name)
                .join(', ')
            }}
          </p>
          <p v-if="episode.tags.length">
            Теги:
            {{
              episode.tags.map((tag: { name: string }) => tag.name).join(', ')
            }}
          </p>
        </li>
      </ul>
      <p>Всего: {{ data.meta.total }}</p>
      <p v-if="data.meta.total > 0" class="episodes-pager">
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
    </template>
  </section>
</template>
