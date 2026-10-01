<script setup lang="ts">
type MeasurementValueType = 'number' | 'text' | 'boolean' | 'compound'
type MeasurementType = {
  id: string
  name: string
  valueType: MeasurementValueType
  unit: string | null
  allowedUnits: string[]
  status: 'active' | 'archived'
}
type Episode = { id: string; title: string }
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

const props = defineProps<{
  types: MeasurementType[]
  episodes: Episode[]
  measurement?: Measurement | null
  busy?: boolean
  error?: string
  fields?: Record<string, string>
}>()
const emit = defineEmits<{
  (event: 'submit', payload: MeasurementPayload): void
  (event: 'cancel' | 'dirty'): void
}>()

const typeSearch = ref('')
const form = reactive({
  measurementTypeId: '',
  occurredAt: '',
  numericValue: '',
  textValue: '',
  booleanValue: '',
  systolic: '',
  diastolic: '',
  unit: '',
  comment: '',
  episodeId: '',
})

const filteredTypes = computed(() => {
  const query = typeSearch.value.trim().toLocaleLowerCase('ru-RU')
  return props.types.filter(
    (type: MeasurementType) =>
      (type.status === 'active' || type.id === form.measurementTypeId) &&
      (!query || type.name.toLocaleLowerCase('ru-RU').includes(query)),
  )
})
const selectedType = computed(() =>
  props.types.find(
    (type: MeasurementType) => type.id === form.measurementTypeId,
  ),
)
const unitOptions = computed(() => {
  const type = selectedType.value
  if (!type) return []
  return [
    ...new Set([type.unit, ...type.allowedUnits].filter(Boolean)),
  ] as string[]
})

function toLocalInput(value: string) {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
function localNow() {
  return toLocalInput(new Date().toISOString())
}
function clearValues() {
  form.numericValue = ''
  form.textValue = ''
  form.booleanValue = ''
  form.systolic = ''
  form.diastolic = ''
}
function reset() {
  const measurement = props.measurement
  typeSearch.value = ''
  clearValues()
  if (measurement) {
    form.measurementTypeId = measurement.measurementTypeId
    form.occurredAt = toLocalInput(measurement.occurredAt)
    form.numericValue =
      measurement.numericValue === null ? '' : String(measurement.numericValue)
    form.textValue = measurement.textValue || ''
    form.booleanValue =
      measurement.booleanValue === null ? '' : String(measurement.booleanValue)
    form.systolic =
      measurement.compoundValue === null
        ? ''
        : String(measurement.compoundValue.systolic)
    form.diastolic =
      measurement.compoundValue === null
        ? ''
        : String(measurement.compoundValue.diastolic)
    form.unit = measurement.unit || ''
    form.comment = measurement.comment || ''
    form.episodeId = measurement.episodeId || ''
    return
  }
  const first = props.types.find(
    (type: MeasurementType) => type.status === 'active',
  )
  form.measurementTypeId = first?.id || ''
  form.occurredAt = localNow()
  form.unit = first?.unit || ''
  form.comment = ''
  form.episodeId = ''
}
function onTypeChange() {
  clearValues()
  form.unit = selectedType.value?.unit || ''
  changed()
}
function changed() {
  emit('dirty')
}
function fieldError(...keys: string[]) {
  for (const key of keys) if (props.fields?.[key]) return props.fields[key]
  return ''
}
function submit() {
  const type = selectedType.value
  if (!type) return
  const payload: MeasurementPayload = {
    measurementTypeId: type.id,
    occurredAt: new Date(form.occurredAt).toISOString(),
    unit: form.unit || null,
    comment: form.comment || null,
    episodeId: form.episodeId || null,
  }
  if (type.valueType === 'number')
    payload.numericValue = Number(form.numericValue)
  if (type.valueType === 'text') payload.textValue = form.textValue
  if (type.valueType === 'boolean')
    payload.booleanValue = form.booleanValue === 'true'
  if (type.valueType === 'compound')
    payload.compoundValue = {
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
    }
  emit('submit', payload)
}

watch(
  () => [props.measurement, props.types] as const,
  () => reset(),
  { immediate: true, deep: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @input="changed" @submit.prevent="submit">
    <UFormField label="Поиск типа показателя">
      <UInput
        v-model="typeSearch"
        aria-label="Поиск типа показателя"
        placeholder="Начните вводить название"
        :disabled="Boolean(measurement) || busy"
      />
    </UFormField>
    <UFormField label="Тип показателя">
      <select
        v-model="form.measurementTypeId"
        class="native-select"
        aria-label="Тип показателя"
        required
        :disabled="Boolean(measurement) || busy"
        @change="onTypeChange"
      >
        <option value="" disabled>Выберите тип</option>
        <option v-for="type in filteredTypes" :key="type.id" :value="type.id">
          {{ type.name }}
        </option>
      </select>
    </UFormField>
    <p
      v-if="fieldError('measurementTypeId')"
      class="text-sm text-red-700 dark:text-red-400"
    >
      {{ fieldError('measurementTypeId') }}
    </p>

    <UFormField
      v-if="selectedType?.valueType === 'number'"
      label="Числовое значение"
    >
      <UInput
        v-model="form.numericValue"
        aria-label="Числовое значение"
        type="number"
        step="any"
        required
        :disabled="busy"
      />
    </UFormField>
    <UFormField
      v-else-if="selectedType?.valueType === 'text'"
      label="Текстовое значение"
    >
      <UTextarea
        v-model="form.textValue"
        aria-label="Текстовое значение"
        :maxlength="2000"
        :rows="3"
        required
        :disabled="busy"
      />
    </UFormField>
    <UFormField
      v-else-if="selectedType?.valueType === 'boolean'"
      label="Логическое значение"
    >
      <select
        v-model="form.booleanValue"
        class="native-select"
        aria-label="Логическое значение"
        required
        :disabled="busy"
      >
        <option value="" disabled>Выберите значение</option>
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </UFormField>
    <div
      v-else-if="selectedType?.valueType === 'compound'"
      class="grid gap-4 sm:grid-cols-2"
    >
      <UFormField label="Систолическое значение">
        <UInput
          v-model="form.systolic"
          aria-label="Систолическое значение"
          type="number"
          min="1"
          max="1000"
          step="any"
          required
          :disabled="busy"
        />
      </UFormField>
      <UFormField label="Диастолическое значение">
        <UInput
          v-model="form.diastolic"
          aria-label="Диастолическое значение"
          type="number"
          min="1"
          max="1000"
          step="any"
          required
          :disabled="busy"
        />
      </UFormField>
    </div>
    <p
      v-if="
        fieldError(
          'numericValue',
          'textValue',
          'booleanValue',
          'compoundValue',
          'compoundValue.systolic',
          'compoundValue.diastolic',
        )
      "
      class="text-sm text-red-700 dark:text-red-400"
    >
      {{
        fieldError(
          'numericValue',
          'textValue',
          'booleanValue',
          'compoundValue',
          'compoundValue.systolic',
          'compoundValue.diastolic',
        )
      }}
    </p>

    <UFormField v-if="unitOptions.length" label="Единица измерения">
      <select
        v-model="form.unit"
        class="native-select"
        aria-label="Единица измерения"
        :disabled="busy"
      >
        <option v-for="unit in unitOptions" :key="unit" :value="unit">
          {{ unit }}
        </option>
      </select>
    </UFormField>
    <p v-if="fieldError('unit')" class="text-sm text-red-700 dark:text-red-400">
      {{ fieldError('unit') }}
    </p>

    <UFormField label="Дата и время измерения">
      <UInput
        v-model="form.occurredAt"
        aria-label="Дата и время измерения"
        type="datetime-local"
        required
        :disabled="busy"
      />
    </UFormField>
    <p
      v-if="fieldError('occurredAt')"
      class="text-sm text-red-700 dark:text-red-400"
    >
      {{ fieldError('occurredAt') }}
    </p>

    <UFormField label="Эпизод">
      <select
        v-model="form.episodeId"
        class="native-select"
        aria-label="Эпизод"
        :disabled="busy"
      >
        <option value="">Без эпизода</option>
        <option
          v-for="episode in episodes"
          :key="episode.id"
          :value="episode.id"
        >
          {{ episode.title }}
        </option>
      </select>
    </UFormField>
    <p
      v-if="fieldError('episodeId')"
      class="text-sm text-red-700 dark:text-red-400"
    >
      {{ fieldError('episodeId') }}
    </p>

    <UFormField label="Комментарий">
      <UTextarea
        v-model="form.comment"
        aria-label="Комментарий"
        :maxlength="1000"
        :rows="3"
        :disabled="busy"
      />
    </UFormField>
    <p
      v-if="fieldError('comment')"
      class="text-sm text-red-700 dark:text-red-400"
    >
      {{ fieldError('comment') }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-700 dark:text-red-400">
      {{ error }}
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton type="submit" :loading="busy">
        {{ measurement ? 'Сохранить изменения' : 'Сохранить измерение' }}
      </UButton>
      <UButton
        type="button"
        variant="outline"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Отменить
      </UButton>
    </div>
  </form>
</template>
