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
    formFields.value = parseApiError(cause).fields
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
  <UPage class="gap-6">
    <UPageHeader :title="'Эпизоды'">
      <template #description>
        <NuxtLink
          :to="`/people/${id}`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Назад к профилю</NuxtLink
        >
      </template>
      <template #links>
        <UButton type="button" size="sm" @click="showForm = !showForm">
          {{ showForm ? 'Скрыть форму' : 'Добавить эпизод' }}
        </UButton>
      </template>
    </UPageHeader>

    <UPageCard>
      <UFormField label="Статус">
        <select
          v-model="statusFilter"
          class="native-select"
          aria-label="Статус"
          @change="applyFilter"
        >
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="completed">Завершённые</option>
        </select>
      </UFormField>
    </UPageCard>

    <UPageCard v-if="showForm">
      <template #header>
        <h2 class="text-base font-semibold">Новый эпизод</h2>
      </template>
      <form class="flex flex-col gap-4" @submit.prevent="createEpisode">
        <UFormField label="Название">
          <UInput v-model="form.title" required :maxlength="120" />
        </UFormField>
        <p
          v-if="fieldError('title')"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formFields.title }}
        </p>
        <UFormField label="Описание">
          <UTextarea v-model="form.description" :maxlength="5000" :rows="3" />
        </UFormField>
        <p
          v-if="fieldError('description')"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formFields.description }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Дата начала">
            <UInput v-model="form.startedAt" type="datetime-local" required />
          </UFormField>
          <UFormField label="Дата завершения">
            <UInput v-model="form.endedAt" type="datetime-local" />
          </UFormField>
        </div>
        <p
          v-if="fieldError('startedAt') || fieldError('endedAt')"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formFields.startedAt || formFields.endedAt }}
        </p>
        <UFormField label="Итог">
          <UTextarea v-model="form.outcome" :maxlength="2000" :rows="3" />
        </UFormField>
        <p
          v-if="fieldError('outcome')"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formFields.outcome }}
        </p>
        <h3 class="text-sm font-semibold">Симптомы</h3>
        <p
          v-if="!form.symptoms.length"
          class="text-sm text-neutral-600 dark:text-neutral-400"
        >
          Симптомы не добавлены.
        </p>
        <fieldset
          v-for="(symptom, index) in form.symptoms"
          :key="index"
          class="m-0 flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
        >
          <UFormField label="Название симптома">
            <UInput v-model="symptom.name" required :maxlength="200" />
          </UFormField>
          <p
            v-if="fieldError(`symptoms.${index}.name`)"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields[`symptoms.${index}.name`] }}
          </p>
          <UFormField label="Описание">
            <UTextarea
              v-model="symptom.description"
              :maxlength="2000"
              :rows="2"
            />
          </UFormField>
          <p
            v-if="fieldError(`symptoms.${index}.description`)"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields[`symptoms.${index}.description`] }}
          </p>
          <div>
            <UButton
              type="button"
              color="error"
              variant="ghost"
              size="sm"
              @click="removeSymptom(index)"
            >
              Удалить симптом
            </UButton>
          </div>
        </fieldset>
        <div>
          <UButton
            type="button"
            variant="outline"
            size="sm"
            @click="addSymptom"
          >
            Добавить симптом
          </UButton>
        </div>
        <UFormField label="Теги (через запятую)">
          <UInput
            v-model="form.tags"
            placeholder="например: сезонный, аллергия"
          />
        </UFormField>
        <p
          v-if="fieldError('tags')"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formFields.tags }}
        </p>
        <p
          v-if="formError"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ formError }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton type="submit" :loading="submitting">Создать эпизод</UButton>
          <UButton
            type="button"
            variant="outline"
            :disabled="submitting"
            @click="clearForm"
          >
            Отменить
          </UButton>
        </div>
      </form>
    </UPageCard>

    <UPageCard>
      <template #header>
        <h2 class="text-base font-semibold">Список</h2>
      </template>
      <p
        v-if="pending"
        role="status"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Загрузка эпизодов…
      </p>
      <p
        v-else-if="error"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        Не удалось загрузить эпизоды.
      </p>
      <p
        v-else-if="!data || !data.data.length"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Эпизодов пока нет. Добавьте первый эпизод.
      </p>
      <template v-else>
        <ul class="m-0 grid list-none gap-3 p-0">
          <li
            v-for="episode in data.data"
            :key="episode.id"
            class="min-w-0 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <h3 class="break-words text-base font-semibold">
              <NuxtLink
                :to="`/people/${id}/episodes/${episode.id}`"
                class="text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
              >
                {{ episode.title }}
              </NuxtLink>
            </h3>
            <div
              class="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
            >
              <UBadge
                :color="episode.status === 'active' ? 'success' : 'neutral'"
                variant="soft"
              >
                {{ episode.status === 'active' ? 'Активен' : 'Завершён' }}
              </UBadge>
              <span>начался: {{ formatDay(episode.startedAt) }}</span>
              <span v-if="episode.endedAt"
                >завершён: {{ formatDay(episode.endedAt) }}</span
              >
            </div>
            <p v-if="episode.symptoms.length" class="mt-2 break-words text-sm">
              Симптомы:
              {{
                episode.symptoms
                  .map((symptom: { name: string }) => symptom.name)
                  .join(', ')
              }}
            </p>
            <p v-if="episode.tags.length" class="mt-2 break-words text-sm">
              Теги:
              {{
                episode.tags.map((tag: { name: string }) => tag.name).join(', ')
              }}
            </p>
          </li>
        </ul>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
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
      </template>
    </UPageCard>
  </UPage>
</template>
