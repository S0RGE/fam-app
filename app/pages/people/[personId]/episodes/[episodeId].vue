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
type RelatedEvent = {
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
const personId = route.params.personId as string
const episodeId = route.params.episodeId as string

const { data, error, pending, refresh } = await useFetch<{
  data: Episode
}>(() => `/api/v1/people/${personId}/episodes/${episodeId}`)
const episode = computed<Episode | null>(() => data.value?.data || null)

const {
  data: eventsData,
  error: eventsError,
  pending: eventsPending,
  refresh: refreshEvents,
} = await useFetch<{ data: RelatedEvent[]; meta: { total: number } }>(
  () =>
    `/api/v1/people/${personId}/timeline?limit=100&offset=0&episodeId=${episodeId}`,
)

const noteTitle = ref('')
const noteDescription = ref('')
const noteOccurredAt = ref('')
const noteBusy = ref(false)
const noteError = ref('')
const noteFields = ref<Record<string, string>>({})

async function addNote() {
  noteBusy.value = true
  noteError.value = ''
  noteFields.value = {}
  try {
    await $fetch(`/api/v1/people/${personId}/timeline`, {
      method: 'POST',
      body: {
        title: noteTitle.value,
        description: noteDescription.value || null,
        occurredAt: new Date(noteOccurredAt.value).toISOString(),
        episodeId,
      },
    })
    noteTitle.value = ''
    noteDescription.value = ''
    noteOccurredAt.value = ''
    await refreshEvents()
  } catch (cause: unknown) {
    noteFields.value = parseApiError(cause).fields
    noteError.value = 'Не удалось добавить заметку. Проверьте поля.'
  } finally {
    noteBusy.value = false
  }
}
function noteFieldError(key: string) {
  return noteFields.value[key]
}

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
    formFields.value = parseApiError(cause).fields
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
  <UPage class="gap-6">
    <UPageHeader :title="'Эпизод'">
      <template #description>
        <NuxtLink
          :to="`/people/${personId}/episodes`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >К списку эпизодов</NuxtLink
        >
      </template>
    </UPageHeader>
    <p
      v-if="pending"
      role="status"
      class="text-sm text-neutral-600 dark:text-neutral-400"
    >
      Загрузка эпизода…
    </p>
    <p
      v-else-if="error"
      role="alert"
      class="text-sm text-red-700 dark:text-red-400"
    >
      Эпизод не найден или недоступен.
    </p>
    <template v-else-if="episode">
      <p
        v-if="message"
        role="status"
        class="text-sm text-emerald-700 dark:text-emerald-400"
      >
        {{ message }}
      </p>
      <p
        v-if="formError"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        {{ formError }}
      </p>
      <UPageCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="break-words text-xl font-semibold">
              {{ episode.title }}
            </h2>
            <UBadge
              :color="episode.status === 'active' ? 'success' : 'neutral'"
              variant="soft"
            >
              {{ episode.status === 'active' ? 'Активен' : 'Завершён' }}
            </UBadge>
          </div>
        </template>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div>
            <dt
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              Начался
            </dt>
            <dd class="m-0 mt-1 break-words">
              {{ formatInstant(episode.startedAt) }} (UTC)
            </dd>
          </div>
          <div>
            <dt
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              Завершён
            </dt>
            <dd class="m-0 mt-1 break-words">
              {{
                episode.endedAt
                  ? `${formatInstant(episode.endedAt)} (UTC)`
                  : 'Не завершён'
              }}
            </dd>
          </div>
        </dl>
        <p
          v-if="episode.description"
          class="mt-4 whitespace-pre-wrap break-words"
        >
          {{ episode.description }}
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <section>
            <h3 class="text-sm font-semibold">Итог</h3>
            <p class="mt-1 break-words text-sm">
              {{ episode.outcome || 'Не указан.' }}
            </p>
          </section>
          <section>
            <h3 class="text-sm font-semibold">Симптомы</h3>
            <p v-if="!episode.symptoms.length" class="mt-1 text-sm">
              Симптомы не указаны.
            </p>
            <ul v-else class="mt-1 pl-5 text-sm">
              <li v-for="symptom in episode.symptoms" :key="symptom.id">
                <strong>{{ symptom.name }}</strong>
                <span v-if="symptom.description">
                  — {{ symptom.description }}</span
                >
              </li>
            </ul>
          </section>
          <section>
            <h3 class="text-sm font-semibold">Теги</h3>
            <p class="mt-1 break-words text-sm">
              {{
                episode.tags.length
                  ? episode.tags
                      .map((tag: { name: string }) => tag.name)
                      .join(', ')
                  : 'Теги не указаны.'
              }}
            </p>
          </section>
        </div>
        <div v-if="!editing" class="mt-5 flex flex-wrap gap-2">
          <UButton type="button" :disabled="busy" @click="editing = true">
            Редактировать
          </UButton>
          <UButton
            type="button"
            variant="outline"
            :disabled="busy"
            @click="transition"
          >
            {{ episode.status === 'active' ? 'Завершить' : 'Повторно открыть' }}
          </UButton>
          <UButton
            type="button"
            color="error"
            variant="soft"
            :disabled="busy"
            @click="remove"
          >
            Удалить
          </UButton>
        </div>
      </UPageCard>

      <UPageCard v-if="editing">
        <template #header>
          <h2 class="text-base font-semibold">Редактирование</h2>
        </template>
        <form class="flex flex-col gap-4" @submit.prevent="save">
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
            <UInput v-model="form.tags" />
          </UFormField>
          <p
            v-if="fieldError('tags')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ formFields.tags }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton type="submit" :loading="busy">Сохранить</UButton>
            <UButton
              type="button"
              variant="outline"
              :disabled="busy"
              @click="editing = false"
            >
              Отменить
            </UButton>
          </div>
        </form>
      </UPageCard>

      <UPageCard>
        <template #header>
          <h2 class="text-base font-semibold">Хронология связанных событий</h2>
        </template>
        <p
          v-if="eventsPending"
          role="status"
          class="text-sm text-neutral-600 dark:text-neutral-400"
        >
          Загрузка событий…
        </p>
        <p
          v-else-if="eventsError"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          Не удалось загрузить связанные события.
        </p>
        <p
          v-else-if="!eventsData || !eventsData.data.length"
          class="text-sm text-neutral-600 dark:text-neutral-400"
        >
          Связанных событий пока нет.
        </p>
        <EventList v-else :events="eventsData.data" :person-id="personId" />

        <form class="mt-6 flex flex-col gap-4" @submit.prevent="addNote">
          <h3 class="text-base font-semibold">Добавить заметку</h3>
          <UFormField label="Заголовок">
            <UInput
              v-model="noteTitle"
              required
              :maxlength="120"
              :disabled="noteBusy"
            />
          </UFormField>
          <p
            v-if="noteFieldError('title')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ noteFields.title }}
          </p>
          <UFormField label="Текст">
            <UTextarea
              v-model="noteDescription"
              :maxlength="5000"
              :rows="3"
              :disabled="noteBusy"
            />
          </UFormField>
          <p
            v-if="noteFieldError('description')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ noteFields.description }}
          </p>
          <UFormField label="Дата и время">
            <UInput
              v-model="noteOccurredAt"
              type="datetime-local"
              required
              :disabled="noteBusy"
            />
          </UFormField>
          <p
            v-if="noteFieldError('occurredAt')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ noteFields.occurredAt }}
          </p>
          <p
            v-if="noteError"
            role="alert"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ noteError }}
          </p>
          <div>
            <UButton type="submit" :loading="noteBusy"
              >Добавить заметку</UButton
            >
          </div>
        </form>
      </UPageCard>
    </template>
  </UPage>
</template>
