<script setup lang="ts">
type MeasurementValueType = 'number' | 'text' | 'boolean' | 'compound'
type MeasurementType = {
  id: string
  name: string
  category: string
  description: string | null
  valueType: MeasurementValueType
  unit: string | null
  allowedUnits: string[]
  status: 'active' | 'archived'
  isPreset: boolean
  createdAt: string
  updatedAt: string
}
type Measurement = {
  id: string
  measurementTypeId: string
  episodeId: string | null
  occurredAt: string
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  compoundValue: { systolic: number; diastolic: number } | null
  unit: string | null
  comment: string | null
  source: 'manual' | 'import'
  createdAt: string
  updatedAt: string
}
type MeasurementPayload = {
  measurementTypeId: string
  occurredAt: string
  numericValue?: number
  textValue?: string
  booleanValue?: boolean
  compoundValue?: { systolic: number; diastolic: number }
  unit: string | null
  comment: string | null
  episodeId: string | null
}
type Episode = { id: string; title: string }

const route = useRoute()
const personId = route.params.personId as string
const limit = 20
const offset = ref(0)
const typeFilter = ref('')
const fromFilter = ref('')
const toFilter = ref('')

function measurementQuery() {
  const params = new URLSearchParams(`limit=${limit}&offset=${offset.value}`)
  if (typeFilter.value) params.set('typeId', typeFilter.value)
  if (fromFilter.value)
    params.set('from', new Date(fromFilter.value).toISOString())
  if (toFilter.value) params.set('to', new Date(toFilter.value).toISOString())
  return params.toString()
}

const {
  data,
  error,
  pending,
  refresh: refreshMeasurements,
} = await useFetch<{
  data: Measurement[]
  meta: { limit: number; offset: number; total: number }
}>(() => `/api/v1/people/${personId}/measurements?${measurementQuery()}`)
const {
  data: typesData,
  error: typesError,
  refresh: refreshTypes,
} = await useFetch<{
  data: MeasurementType[]
  meta: { limit: number; offset: number; total: number }
}>('/api/v1/measurements/types?limit=100&offset=0')
const { data: episodesData } = await useFetch<{ data: Episode[] }>(
  `/api/v1/people/${personId}/episodes?limit=100&offset=0`,
)

const types = computed(() => typesData.value?.data || [])
const episodes = computed(() => episodesData.value?.data || [])
const typeById = computed(
  () =>
    new Map(
      types.value.map((type: MeasurementType) => [type.id, type] as const),
    ),
)
const episodeById = computed(
  () =>
    new Map(
      episodes.value.map((episode: Episode) => [episode.id, episode] as const),
    ),
)

async function applyFilter() {
  offset.value = 0
  await refreshMeasurements()
}
async function step(next: boolean) {
  offset.value = next ? offset.value + limit : Math.max(0, offset.value - limit)
  await refreshMeasurements()
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 20 }).format(
    value,
  )
}
function formatValue(measurement: Measurement) {
  let value = ''
  if (measurement.numericValue !== null)
    value = formatNumber(measurement.numericValue)
  else if (measurement.textValue !== null) value = measurement.textValue
  else if (measurement.booleanValue !== null)
    value = measurement.booleanValue ? 'Да' : 'Нет'
  else if (measurement.compoundValue)
    value = `${formatNumber(measurement.compoundValue.systolic)}/${formatNumber(measurement.compoundValue.diastolic)}`
  return `${value}${measurement.unit ? ` ${measurement.unit}` : ''}`
}

const showMeasurementForm = ref(false)
const editingMeasurement = ref<Measurement | null>(null)
const measurementBusy = ref(false)
const measurementError = ref('')
const measurementFields = ref<Record<string, string>>({})
const measurementDirty = ref(false)

function createMeasurement() {
  editingMeasurement.value = null
  measurementError.value = ''
  measurementFields.value = {}
  measurementDirty.value = false
  showMeasurementForm.value = true
}
function editMeasurement(measurement: Measurement) {
  editingMeasurement.value = measurement
  measurementError.value = ''
  measurementFields.value = {}
  measurementDirty.value = false
  showMeasurementForm.value = true
}
function closeMeasurementForm() {
  showMeasurementForm.value = false
  editingMeasurement.value = null
  measurementError.value = ''
  measurementFields.value = {}
  measurementDirty.value = false
}
async function saveMeasurement(payload: MeasurementPayload) {
  measurementBusy.value = true
  measurementError.value = ''
  measurementFields.value = {}
  try {
    if (editingMeasurement.value) {
      const { measurementTypeId: _measurementTypeId, ...changes } = payload
      await $fetch(
        `/api/v1/people/${personId}/measurements/${editingMeasurement.value.id}`,
        { method: 'PATCH', body: changes },
      )
    } else {
      await $fetch(`/api/v1/people/${personId}/measurements`, {
        method: 'POST',
        body: payload,
      })
    }
    closeMeasurementForm()
    offset.value = 0
    await refreshMeasurements()
  } catch (cause: unknown) {
    const apiError = parseApiError(cause)
    measurementFields.value = apiError.fields
    measurementError.value =
      apiError.statusCode === 409
        ? 'Значение не соответствует выбранному типу показателя.'
        : 'Не удалось сохранить измерение. Проверьте поля.'
  } finally {
    measurementBusy.value = false
  }
}
async function removeMeasurement(measurement: Measurement) {
  if (!confirm('Удалить измерение? Это действие нельзя отменить.')) return
  measurementBusy.value = true
  try {
    await $fetch(`/api/v1/people/${personId}/measurements/${measurement.id}`, {
      method: 'DELETE',
    })
    await refreshMeasurements()
  } catch {
    measurementError.value = 'Не удалось удалить измерение.'
  } finally {
    measurementBusy.value = false
  }
}

const showTypes = ref(false)
const typeSearch = ref('')
const showTypeForm = ref(false)
const editingTypeId = ref<string | null>(null)
const typeBusy = ref(false)
const typeError = ref('')
const typeFields = ref<Record<string, string>>({})
const typeDirty = ref(false)
const typeForm = reactive({
  name: '',
  category: '',
  description: '',
  valueType: 'number' as MeasurementValueType,
  unit: '',
  allowedUnits: '',
})
const visibleTypes = computed(() => {
  const query = typeSearch.value.trim().toLocaleLowerCase('ru-RU')
  return types.value.filter(
    (type: MeasurementType) =>
      !query || type.name.toLocaleLowerCase('ru-RU').includes(query),
  )
})
function resetTypeForm() {
  editingTypeId.value = null
  typeForm.name = ''
  typeForm.category = ''
  typeForm.description = ''
  typeForm.valueType = 'number'
  typeForm.unit = ''
  typeForm.allowedUnits = ''
  typeError.value = ''
  typeFields.value = {}
  showTypeForm.value = false
  typeDirty.value = false
}
function createType() {
  resetTypeForm()
  showTypeForm.value = true
}
function editType(type: MeasurementType) {
  if (type.isPreset) return
  editingTypeId.value = type.id
  typeForm.name = type.name
  typeForm.category = type.category
  typeForm.description = type.description || ''
  typeForm.valueType = type.valueType
  typeForm.unit = type.unit || ''
  typeForm.allowedUnits = type.allowedUnits.join(', ')
  typeError.value = ''
  typeFields.value = {}
  typeDirty.value = false
  showTypeForm.value = true
}
async function saveType() {
  typeBusy.value = true
  typeError.value = ''
  typeFields.value = {}
  const payload = {
    name: typeForm.name,
    category: typeForm.category,
    description: typeForm.description || null,
    valueType: typeForm.valueType,
    unit: typeForm.unit || null,
    allowedUnits: typeForm.allowedUnits
      .split(',')
      .map((unit: string) => unit.trim())
      .filter(Boolean),
  }
  try {
    if (editingTypeId.value)
      await $fetch(`/api/v1/measurements/types/${editingTypeId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    else
      await $fetch('/api/v1/measurements/types', {
        method: 'POST',
        body: payload,
      })
    resetTypeForm()
    await refreshTypes()
  } catch (cause: unknown) {
    const apiError = parseApiError(cause)
    typeFields.value = apiError.fields
    typeError.value =
      apiError.code === 'DUPLICATE_TYPE'
        ? 'Активный тип с таким названием и единицей уже существует.'
        : apiError.code === 'TYPE_IN_USE'
          ? 'Нельзя изменить вид значения типа, для которого уже есть измерения.'
          : apiError.code === 'PRESET_NOT_EDITABLE'
            ? 'Предустановленный тип нельзя изменить.'
            : 'Не удалось сохранить тип показателя. Проверьте поля.'
  } finally {
    typeBusy.value = false
  }
}
async function transitionType(type: MeasurementType) {
  if (type.isPreset) return
  const next = type.status === 'active' ? 'archived' : 'active'
  const question =
    next === 'archived'
      ? `Архивировать тип «${type.name}»?`
      : `Восстановить тип «${type.name}»?`
  if (!confirm(question)) return
  typeBusy.value = true
  try {
    await $fetch(`/api/v1/measurements/types/${type.id}`, {
      method: 'PATCH',
      body: { status: next },
    })
    await refreshTypes()
  } catch (cause: unknown) {
    const apiError = parseApiError(cause)
    typeError.value =
      apiError.code === 'DUPLICATE_TYPE'
        ? 'Нельзя восстановить тип: активный тип с таким названием и единицей уже существует.'
        : 'Не удалось изменить статус типа.'
  } finally {
    typeBusy.value = false
  }
}
function typeFieldError(key: string) {
  return typeFields.value[key]
}

onBeforeRouteLeave(
  () =>
    (!measurementDirty.value && !typeDirty.value) ||
    confirm('Есть несохранённые изменения. Покинуть страницу?'),
)
</script>

<template>
  <UPage class="min-w-0 gap-6" :ui="{ root: 'min-w-0', center: 'min-w-0' }">
    <UPageHeader title="Измерения">
      <template #description>
        <NuxtLink
          :to="`/people/${personId}`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
        >
          Назад к профилю
        </NuxtLink>
      </template>
      <template #links>
        <div class="flex flex-wrap gap-2">
          <UButton type="button" size="sm" @click="createMeasurement">
            Добавить измерение
          </UButton>
          <UButton
            type="button"
            size="sm"
            variant="outline"
            @click="showTypes = !showTypes"
          >
            {{ showTypes ? 'Скрыть типы' : 'Настроить типы' }}
          </UButton>
        </div>
      </template>
    </UPageHeader>

    <UPageCard v-if="showMeasurementForm">
      <template #header>
        <h2 class="text-base font-semibold">
          {{
            editingMeasurement ? 'Редактирование измерения' : 'Новое измерение'
          }}
        </h2>
      </template>
      <MeasurementForm
        :types="types"
        :episodes="episodes"
        :measurement="editingMeasurement"
        :busy="measurementBusy"
        :error="measurementError"
        :fields="measurementFields"
        @dirty="measurementDirty = true"
        @cancel="closeMeasurementForm"
        @submit="saveMeasurement"
      />
    </UPageCard>

    <UPageCard v-if="showTypes">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold">Типы показателей</h2>
          <UButton type="button" size="sm" @click="createType">
            Добавить тип
          </UButton>
        </div>
      </template>
      <p
        v-if="typesError"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        Не удалось загрузить типы показателей.
      </p>
      <template v-else>
        <UFormField label="Поиск типов">
          <UInput
            v-model="typeSearch"
            aria-label="Поиск типов"
            placeholder="Название типа"
          />
        </UFormField>
        <p
          v-if="typeError"
          role="alert"
          class="mt-3 text-sm text-red-700 dark:text-red-400"
        >
          {{ typeError }}
        </p>
        <p
          v-if="!visibleTypes.length"
          class="mt-4 text-sm text-neutral-600 dark:text-neutral-400"
        >
          Типы не найдены.
        </p>
        <ul
          v-else
          aria-label="Список типов показателей"
          class="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2"
        >
          <li
            v-for="type in visibleTypes"
            :key="type.id"
            class="min-w-0 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="break-words font-semibold">{{ type.name }}</h3>
                <p
                  class="mt-1 break-words text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {{ type.category
                  }}<span v-if="type.unit"> · {{ type.unit }}</span>
                </p>
              </div>
              <div class="flex flex-wrap gap-1">
                <UBadge v-if="type.isPreset" color="primary" variant="soft">
                  Предустановленный
                </UBadge>
                <UBadge
                  :color="type.status === 'active' ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ type.status === 'active' ? 'Активен' : 'В архиве' }}
                </UBadge>
              </div>
            </div>
            <p v-if="type.description" class="mt-2 break-words text-sm">
              {{ type.description }}
            </p>
            <p v-if="type.allowedUnits.length" class="mt-2 break-words text-sm">
              Дополнительные единицы: {{ type.allowedUnits.join(', ') }}
            </p>
            <div v-if="!type.isPreset" class="mt-3 flex flex-wrap gap-2">
              <UButton
                type="button"
                size="sm"
                variant="outline"
                :aria-label="`Редактировать тип ${type.name}`"
                :disabled="typeBusy"
                @click="editType(type)"
              >
                Редактировать
              </UButton>
              <UButton
                type="button"
                size="sm"
                variant="soft"
                :color="type.status === 'active' ? 'error' : 'primary'"
                :aria-label="`${type.status === 'active' ? 'Архивировать' : 'Восстановить'} тип ${type.name}`"
                :disabled="typeBusy"
                @click="transitionType(type)"
              >
                {{ type.status === 'active' ? 'Архивировать' : 'Восстановить' }}
              </UButton>
            </div>
          </li>
        </ul>
      </template>

      <div
        v-if="showTypeForm"
        class="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-700"
      >
        <h3 class="mb-4 font-semibold">
          {{ editingTypeId ? 'Редактирование типа' : 'Новый тип показателя' }}
        </h3>
        <form
          class="flex flex-col gap-4"
          @input="typeDirty = true"
          @submit.prevent="saveType"
        >
          <UFormField label="Название типа">
            <UInput
              v-model="typeForm.name"
              aria-label="Название типа"
              required
              :maxlength="100"
            />
          </UFormField>
          <p
            v-if="typeFieldError('name')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ typeFieldError('name') }}
          </p>
          <UFormField label="Категория">
            <UInput
              v-model="typeForm.category"
              aria-label="Категория"
              required
              :maxlength="100"
            />
          </UFormField>
          <p
            v-if="typeFieldError('category')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ typeFieldError('category') }}
          </p>
          <UFormField label="Описание">
            <UTextarea
              v-model="typeForm.description"
              aria-label="Описание типа"
              :maxlength="5000"
              :rows="3"
            />
          </UFormField>
          <p
            v-if="typeFieldError('description')"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ typeFieldError('description') }}
          </p>
          <UFormField label="Тип значения">
            <select
              v-model="typeForm.valueType"
              class="native-select"
              aria-label="Тип значения"
              :disabled="typeBusy"
            >
              <option value="number">Число</option>
              <option value="text">Текст</option>
              <option value="boolean">Логическое значение</option>
              <option value="compound">Составное числовое значение</option>
            </select>
          </UFormField>
          <UFormField label="Основная единица">
            <UInput
              v-model="typeForm.unit"
              aria-label="Основная единица"
              :maxlength="50"
            />
          </UFormField>
          <UFormField label="Дополнительные единицы">
            <UInput
              v-model="typeForm.allowedUnits"
              aria-label="Дополнительные единицы"
              placeholder="через запятую"
            />
          </UFormField>
          <p
            v-if="
              typeFieldError('valueType') ||
              typeFieldError('unit') ||
              typeFieldError('allowedUnits')
            "
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{
              typeFieldError('valueType') ||
              typeFieldError('unit') ||
              typeFieldError('allowedUnits')
            }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton type="submit" :loading="typeBusy">Сохранить тип</UButton>
            <UButton
              type="button"
              variant="outline"
              :disabled="typeBusy"
              @click="resetTypeForm"
            >
              Отменить
            </UButton>
          </div>
        </form>
      </div>
    </UPageCard>

    <UPageCard>
      <template #header>
        <h2 class="text-base font-semibold">Фильтры</h2>
      </template>
      <form class="grid gap-4 md:grid-cols-3" @submit.prevent="applyFilter">
        <UFormField label="Тип показателя">
          <select
            v-model="typeFilter"
            class="native-select"
            aria-label="Фильтр по типу"
            @change="applyFilter"
          >
            <option value="">Все типы</option>
            <option v-for="type in types" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </UFormField>
        <UFormField label="С даты">
          <UInput
            v-model="fromFilter"
            aria-label="С даты"
            type="datetime-local"
            @change="applyFilter"
          />
        </UFormField>
        <UFormField label="По дату">
          <UInput
            v-model="toFilter"
            aria-label="По дату"
            type="datetime-local"
            @change="applyFilter"
          />
        </UFormField>
        <div class="md:col-span-3">
          <UButton type="submit" :loading="pending">Применить</UButton>
        </div>
      </form>
    </UPageCard>

    <UPageCard
      class="min-w-0"
      :ui="{ root: 'min-w-0', container: 'min-w-0', body: 'min-w-0' }"
    >
      <template #header>
        <h2 class="text-base font-semibold">История измерений</h2>
      </template>
      <p
        v-if="pending"
        role="status"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Загрузка измерений…
      </p>
      <p
        v-else-if="error"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        Не удалось загрузить измерения.
      </p>
      <p
        v-else-if="!data || !data.data.length"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Измерений пока нет.
      </p>
      <template v-else>
        <div class="max-w-full overflow-x-auto">
          <table class="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-700">
                <th class="p-3 font-semibold">Дата</th>
                <th class="p-3 font-semibold">Показатель</th>
                <th class="p-3 font-semibold">Значение</th>
                <th class="p-3 font-semibold">Комментарий</th>
                <th class="p-3 font-semibold">Эпизод</th>
                <th class="p-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="measurement in data.data"
                :key="measurement.id"
                class="border-b border-neutral-200 align-top last:border-0 dark:border-neutral-800"
              >
                <td class="p-3 whitespace-nowrap">
                  <time :datetime="measurement.occurredAt">{{
                    formatDateTime(measurement.occurredAt)
                  }}</time>
                </td>
                <td class="p-3 font-medium">
                  {{
                    typeById.get(measurement.measurementTypeId)?.name ||
                    'Неизвестный тип'
                  }}
                </td>
                <td class="p-3 break-words">{{ formatValue(measurement) }}</td>
                <td class="p-3 break-words">
                  {{ measurement.comment || '—' }}
                </td>
                <td class="p-3">
                  <NuxtLink
                    v-if="measurement.episodeId"
                    :to="`/people/${personId}/episodes/${measurement.episodeId}`"
                    :aria-label="
                      `Открыть эпизод ${episodeById.get(measurement.episodeId)?.title || ''}`.trim()
                    "
                    class="font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
                  >
                    {{
                      episodeById.get(measurement.episodeId)?.title ||
                      'Открыть эпизод'
                    }}
                  </NuxtLink>
                  <span v-else>—</span>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-2">
                    <UButton
                      type="button"
                      size="sm"
                      variant="outline"
                      :aria-label="
                        `Редактировать измерение ${typeById.get(measurement.measurementTypeId)?.name || ''}`.trim()
                      "
                      :disabled="measurementBusy"
                      @click="editMeasurement(measurement)"
                    >
                      Редактировать
                    </UButton>
                    <UButton
                      type="button"
                      size="sm"
                      color="error"
                      variant="soft"
                      :aria-label="
                        `Удалить измерение ${typeById.get(measurement.measurementTypeId)?.name || ''}`.trim()
                      "
                      :disabled="measurementBusy"
                      @click="removeMeasurement(measurement)"
                    >
                      Удалить
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-medium">Всего: {{ data.meta.total }}</p>
          <div v-if="data.meta.total > 0" class="flex gap-2">
            <UButton
              type="button"
              size="sm"
              variant="outline"
              :disabled="offset === 0 || pending"
              @click="step(false)"
            >
              Назад
            </UButton>
            <UButton
              type="button"
              size="sm"
              variant="outline"
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
