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
  (value: { data: Person } | null) => {
    if (value?.data) Object.assign(person, value.data)
  },
  { immediate: true },
)
watch(
  profileData,
  (value: { data: { profile: Profile | null } } | null) => {
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
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
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
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
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
  <section>
    <p v-if="personPending" role="status">Загрузка профиля…</p>
    <p v-else-if="personError" role="alert">Профиль не найден.</p>
    <template v-else
      ><h1>{{ person.lastName }} {{ person.firstName }}</h1>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <form @input="personChanged" @submit.prevent="savePerson">
        <h2>Данные человека</h2>
        <label
          >Имя<input v-model="person.firstName" required maxlength="100" /><span
            v-if="fields.firstName"
            class="field-error"
            >{{ fields.firstName }}</span
          ></label
        ><label
          >Фамилия<input
            v-model="person.lastName"
            required
            maxlength="100"
          /><span v-if="fields.lastName" class="field-error">{{
            fields.lastName
          }}</span></label
        ><label
          >Отчество<input v-model="person.middleName" maxlength="100" /><span
            v-if="fields.middleName"
            class="field-error"
            >{{ fields.middleName }}</span
          ></label
        ><label
          >Дата рождения<input
            v-model="person.birthDate"
            type="date"
            required
          /><span v-if="fields.birthDate" class="field-error">{{
            fields.birthDate
          }}</span></label
        ><label
          >Пол<select v-model="person.sex">
            <option value="unspecified">Не указан</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option></select
          ><span v-if="fields.sex" class="field-error">{{
            fields.sex
          }}</span></label
        ><label
          >Роль в семье<input v-model="person.familyRole" maxlength="50" /><span
            v-if="fields.familyRole"
            class="field-error"
            >{{ fields.familyRole }}</span
          ></label
        ><button :disabled="saving">Сохранить данные</button>
      </form>
      <button v-if="person.status === 'active'" @click="transition('archive')">
        Архивировать</button
      ><button v-else @click="transition('restore')">Восстановить</button>
      <p>
        <NuxtLink :to="`/people/${id}/episodes`">Эпизоды</NuxtLink>
        <NuxtLink :to="`/people/${id}/timeline`">Хронология</NuxtLink>
      </p>
      <h2>Медицинский профиль</h2>
      <p v-if="profilePending" role="status">Загрузка медицинского профиля…</p>
      <p v-else-if="profileError" role="alert">
        Не удалось загрузить медицинский профиль.
      </p>
      <form v-else @input="profileChanged" @submit.prevent="saveProfile">
        <label
          >Группа крови<select v-model="profile.bloodGroup">
            <option :value="null">Не указана</option>
            <option value="o">I (O)</option>
            <option value="a">II (A)</option>
            <option value="b">III (B)</option>
            <option value="ab">IV (AB)</option></select
          ><span v-if="fields.bloodGroup" class="field-error">{{
            fields.bloodGroup
          }}</span></label
        ><label
          >Резус-фактор<select v-model="profile.rhesusFactor">
            <option :value="null">Не указан</option>
            <option value="positive">Положительный</option>
            <option value="negative">Отрицательный</option></select
          ><span v-if="fields.rhesusFactor" class="field-error">{{
            fields.rhesusFactor
          }}</span></label
        ><label
          >Общий комментарий<textarea
            v-model="profile.generalComment"
            maxlength="5000"
          ></textarea
          ><span v-if="fields.generalComment" class="field-error">{{
            fields.generalComment
          }}</span></label
        ><template
          v-for="(items, category) in {
            allergies: profile.allergies,
            chronicConditions: profile.chronicConditions,
            warnings: profile.warnings,
          }"
          :key="category"
          ><h3>
            {{
              category === 'allergies'
                ? 'Аллергии'
                : category === 'chronicConditions'
                  ? 'Хронические состояния'
                  : 'Предупреждения'
            }}
          </h3>
          <p v-if="!items.length">Нет записей.</p>
          <fieldset v-for="(item, index) in items" :key="item.id || index">
            <label
              >Название<input
                v-model="item.name"
                maxlength="200"
                required
              /><span
                v-if="fields[`${category}.${index}.name`]"
                class="field-error"
                >{{ fields[`${category}.${index}.name`] }}</span
              ></label
            ><label
              >Описание<textarea
                v-model="item.description"
                maxlength="2000"
              ></textarea
              ><span
                v-if="fields[`${category}.${index}.description`]"
                class="field-error"
                >{{ fields[`${category}.${index}.description`] }}</span
              ></label
            ><label
              >Статус<select v-model="item.status">
                <option value="active">Актуально</option>
                <option value="archived">В архиве</option></select
              ><span
                v-if="fields[`${category}.${index}.status`]"
                class="field-error"
                >{{ fields[`${category}.${index}.status`] }}</span
              ></label
            ><button type="button" @click="removeItem(category, index)">
              Удалить из списка
            </button>
          </fieldset>
          <button type="button" @click="addItem(category)">
            Добавить
          </button></template
        ><button :disabled="saving">Сохранить медицинский профиль</button>
      </form></template
    >
  </section>
</template>
