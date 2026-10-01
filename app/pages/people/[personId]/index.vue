<script setup lang="ts">
type Person = {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string
  sex: 'male' | 'female' | 'unspecified'
  familyRole: string | null
  status: 'active' | 'archived'
}
type ProfileItem = {
  id?: string
  name: string
  description: string | null
  status: 'active' | 'archived'
}
type Profile = {
  bloodGroup: 'o' | 'a' | 'b' | 'ab' | null
  rhesusFactor: 'positive' | 'negative' | null
  generalComment: string | null
  allergies: ProfileItem[]
  chronicConditions: ProfileItem[]
  warnings: ProfileItem[]
}
const route = useRoute()
const id = route.params.personId as string
const {
  data: personData,
  error: personError,
  pending: personPending,
  refresh: refreshPerson,
} = await useFetch<{ data: Person }>(() => `/api/v1/people/${id}`)
const {
  data: profileData,
  error: profileError,
  pending: profilePending,
  refresh: refreshProfile,
} = await useFetch<{ data: { profile: Profile | null } }>(
  () => `/api/v1/people/${id}/medical-profile`,
)
const person = reactive<Person>({
  id: '',
  firstName: '',
  lastName: '',
  middleName: null,
  birthDate: '',
  sex: 'unspecified',
  familyRole: null,
  status: 'active',
})
const profile = reactive<Profile>({
  bloodGroup: null,
  rhesusFactor: null,
  generalComment: null,
  allergies: [],
  chronicConditions: [],
  warnings: [],
})
const message = ref('')
const error = ref('')
const fields = ref<Record<string, string>>({})
const personDirty = ref(false)
const profileDirty = ref(false)
const saving = ref(false)
watch(
  personData,
  (value) => {
    if (value?.data) Object.assign(person, value.data)
  },
  { immediate: true },
)
watch(
  profileData,
  (value) => {
    if (value?.data.profile) Object.assign(profile, value.data.profile)
  },
  { immediate: true, deep: true },
)
function addItem(category: 'allergies' | 'chronicConditions' | 'warnings') {
  profile[category].push({ name: '', description: null, status: 'active' })
  profileChanged()
}
function removeItem(
  category: 'allergies' | 'chronicConditions' | 'warnings',
  index: number,
) {
  profile[category].splice(index, 1)
  profileChanged()
}
function personChanged() {
  personDirty.value = true
  message.value = ''
}
function profileChanged() {
  profileDirty.value = true
  message.value = ''
}
async function savePerson() {
  saving.value = true
  error.value = ''
  fields.value = {}
  try {
    await $fetch(`/api/v1/people/${id}`, {
      method: 'PATCH',
      body: {
        firstName: person.firstName,
        lastName: person.lastName,
        middleName: person.middleName || null,
        birthDate: person.birthDate,
        sex: person.sex,
        familyRole: person.familyRole || null,
      },
    })
    personDirty.value = false
    message.value = 'Профиль сохранён.'
    await refreshPerson()
  } catch (cause: unknown) {
    fields.value = parseApiError(cause).fields
    error.value = 'Проверьте данные профиля.'
  } finally {
    saving.value = false
  }
}
function profilePayload() {
  const item = (value: ProfileItem) => ({
    name: value.name,
    description: value.description || null,
    status: value.status,
  })
  return {
    bloodGroup: profile.bloodGroup,
    rhesusFactor: profile.rhesusFactor,
    generalComment: profile.generalComment || null,
    allergies: profile.allergies.map(item),
    chronicConditions: profile.chronicConditions.map(item),
    warnings: profile.warnings.map(item),
  }
}
async function saveProfile() {
  saving.value = true
  error.value = ''
  fields.value = {}
  try {
    await $fetch(`/api/v1/people/${id}/medical-profile`, {
      method: 'PUT',
      body: profilePayload(),
    })
    profileDirty.value = false
    message.value = 'Медицинский профиль сохранён.'
    await refreshProfile()
  } catch (cause: unknown) {
    fields.value = parseApiError(cause).fields
    error.value = 'Не удалось сохранить медицинский профиль.'
  } finally {
    saving.value = false
  }
}
async function transition(action: 'archive' | 'restore') {
  const text =
    action === 'archive'
      ? 'Перевести профиль в архив?'
      : 'Восстановить профиль?'
  if (!confirm(text)) return
  await $fetch(`/api/v1/people/${id}/${action}`, { method: 'POST' })
  await refreshPerson()
  message.value =
    action === 'archive' ? 'Профиль архивирован.' : 'Профиль восстановлен.'
}
onBeforeRouteLeave(
  () =>
    (!personDirty.value && !profileDirty.value) ||
    confirm('Есть несохранённые изменения. Покинуть страницу?'),
)
</script>
<template>
  <UPage class="gap-6">
    <p
      v-if="personPending"
      role="status"
      class="text-sm text-neutral-600 dark:text-neutral-400"
    >
      Загрузка профиля…
    </p>
    <p
      v-else-if="personError"
      role="alert"
      class="text-sm text-red-700 dark:text-red-400"
    >
      Профиль не найден.
    </p>
    <template v-else>
      <UPageHeader :title="`${person.lastName} ${person.firstName}`">
        <template #links>
          <UBadge
            :color="person.status === 'active' ? 'success' : 'neutral'"
            variant="soft"
            :label="person.status === 'active' ? 'Активен' : 'В архиве'"
          />
        </template>
      </UPageHeader>
      <p
        v-if="message"
        role="status"
        class="text-sm text-emerald-700 dark:text-emerald-400"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        {{ error }}
      </p>
      <UPageCard>
        <template #header>
          <h2 class="text-base font-semibold">Данные человека</h2>
        </template>
        <form
          class="flex flex-col gap-4"
          @input="personChanged"
          @submit.prevent="savePerson"
        >
          <UFormField label="Имя">
            <UInput v-model="person.firstName" :max-length="100" required />
          </UFormField>
          <p
            v-if="fields.firstName"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.firstName }}
          </p>
          <UFormField label="Фамилия">
            <UInput v-model="person.lastName" :max-length="100" required />
          </UFormField>
          <p
            v-if="fields.lastName"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.lastName }}
          </p>
          <UFormField label="Отчество">
            <UInput
              :model-value="person.middleName || ''"
              :max-length="100"
              @update:model-value="person.middleName = String($event || '')"
            />
          </UFormField>
          <p
            v-if="fields.middleName"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.middleName }}
          </p>
          <UFormField label="Дата рождения">
            <UInput v-model="person.birthDate" type="date" required />
          </UFormField>
          <p
            v-if="fields.birthDate"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.birthDate }}
          </p>
          <UFormField label="Пол">
            <select v-model="person.sex" class="native-select" aria-label="Пол">
              <option value="unspecified">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </UFormField>
          <p v-if="fields.sex" class="text-sm text-red-700 dark:text-red-400">
            {{ fields.sex }}
          </p>
          <UFormField label="Роль в семье">
            <UInput
              :model-value="person.familyRole || ''"
              :max-length="50"
              @update:model-value="person.familyRole = String($event || '')"
            />
          </UFormField>
          <p
            v-if="fields.familyRole"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.familyRole }}
          </p>
          <UButton type="submit" :loading="saving">Сохранить данные</UButton>
        </form>
      </UPageCard>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-if="person.status === 'active'"
          variant="outline"
          @click="transition('archive')"
        >
          Архивировать
        </UButton>
        <UButton v-else variant="outline" @click="transition('restore')">
          Восстановить
        </UButton>
        <NuxtLink
          :to="`/people/${id}/episodes`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Эпизоды</NuxtLink
        >
        <NuxtLink
          :to="`/people/${id}/measurements`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Измерения</NuxtLink
        >
        <NuxtLink
          :to="`/people/${id}/timeline`"
          class="text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Хронология</NuxtLink
        >
      </div>
      <UPageCard class="mt-4">
        <template #header>
          <h2 class="text-base font-semibold">Медицинский профиль</h2>
        </template>
        <p
          v-if="profilePending"
          role="status"
          class="text-sm text-neutral-600 dark:text-neutral-400"
        >
          Загрузка медицинского профиля…
        </p>
        <p
          v-else-if="profileError"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          Не удалось загрузить медицинский профиль.
        </p>
        <form
          v-else
          class="flex flex-col gap-4"
          @input="profileChanged"
          @submit.prevent="saveProfile"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Группа крови">
              <select
                v-model="profile.bloodGroup"
                class="native-select"
                aria-label="Группа крови"
              >
                <option :value="null">Не указана</option>
                <option value="o">I (O)</option>
                <option value="a">II (A)</option>
                <option value="b">III (B)</option>
                <option value="ab">IV (AB)</option>
              </select>
            </UFormField>
            <UFormField label="Резус-фактор">
              <select
                v-model="profile.rhesusFactor"
                class="native-select"
                aria-label="Резус-фактор"
              >
                <option :value="null">Не указан</option>
                <option value="positive">Положительный</option>
                <option value="negative">Отрицательный</option>
              </select>
            </UFormField>
          </div>
          <p
            v-if="fields.bloodGroup || fields.rhesusFactor"
            class="text-sm text-red-700 dark:text-red-400"
          >
            <span v-if="fields.bloodGroup">{{ fields.bloodGroup }}</span>
            <span v-if="fields.rhesusFactor"> {{ fields.rhesusFactor }}</span>
          </p>
          <UFormField label="Общий комментарий">
            <UTextarea
              :model-value="profile.generalComment || ''"
              :max-length="5000"
              :rows="3"
              @update:model-value="
                profile.generalComment = String($event || '')
              "
            />
          </UFormField>
          <p
            v-if="fields.generalComment"
            class="text-sm text-red-700 dark:text-red-400"
          >
            {{ fields.generalComment }}
          </p>
          <template
            v-for="(items, category) in {
              allergies: profile.allergies,
              chronicConditions: profile.chronicConditions,
              warnings: profile.warnings,
            }"
            :key="category"
          >
            <h3 class="text-sm font-semibold">
              {{
                category === 'allergies'
                  ? 'Аллергии'
                  : category === 'chronicConditions'
                    ? 'Хронические состояния'
                    : 'Предупреждения'
              }}
            </h3>
            <p
              v-if="!items.length"
              class="text-sm text-neutral-600 dark:text-neutral-400"
            >
              Нет записей.
            </p>
            <fieldset
              v-for="(item, index) in items"
              :key="item.id || index"
              class="m-0 flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
            >
              <UFormField label="Название">
                <UInput v-model="item.name" :max-length="200" required />
              </UFormField>
              <p
                v-if="fields[`${category}.${index}.name`]"
                class="text-sm text-red-700 dark:text-red-400"
              >
                {{ fields[`${category}.${index}.name`] }}
              </p>
              <UFormField label="Описание">
                <UTextarea
                  :model-value="item.description || ''"
                  :max-length="2000"
                  :rows="2"
                  @update:model-value="item.description = String($event || '')"
                />
              </UFormField>
              <p
                v-if="fields[`${category}.${index}.description`]"
                class="text-sm text-red-700 dark:text-red-400"
              >
                {{ fields[`${category}.${index}.description`] }}
              </p>
              <UFormField label="Статус">
                <select
                  v-model="item.status"
                  class="native-select"
                  :aria-label="`Статус записи ${index + 1}`"
                >
                  <option value="active">Актуально</option>
                  <option value="archived">В архиве</option>
                </select>
              </UFormField>
              <p
                v-if="fields[`${category}.${index}.status`]"
                class="text-sm text-red-700 dark:text-red-400"
              >
                {{ fields[`${category}.${index}.status`] }}
              </p>
              <div>
                <UButton
                  variant="ghost"
                  color="error"
                  size="sm"
                  @click="removeItem(category, index)"
                >
                  Удалить из списка
                </UButton>
              </div>
            </fieldset>
            <div>
              <UButton variant="outline" size="sm" @click="addItem(category)">
                Добавить
              </UButton>
            </div>
          </template>
          <UButton type="submit" :loading="saving"
            >Сохранить медицинский профиль</UButton
          >
        </form>
      </UPageCard>
    </template>
  </UPage>
</template>
