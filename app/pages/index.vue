<script setup lang="ts">
const firstName = ref('')
const lastName = ref('')
const birthDate = ref('')
const sex = ref<'male' | 'female' | 'unspecified'>('unspecified')
const error = ref('')
const fields = ref<Record<string, string>>({})
async function add() {
  error.value = ''
  fields.value = {}
  try {
    await $fetch('/api/v1/people', {
      method: 'POST',
      body: {
        firstName: firstName.value,
        lastName: lastName.value,
        birthDate: birthDate.value,
        sex: sex.value,
        middleName: null,
        familyRole: null,
      },
    })
    await navigateTo('/people')
  } catch (cause: unknown) {
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    error.value = 'Проверьте данные профиля.'
  }
}
</script>
<template>
  <section>
    <h1>Семейная медицинская информация</h1>
    <NuxtLink to="/people">Все члены семьи</NuxtLink>
    <h2>Добавить члена семьи</h2>
    <form @submit.prevent="add">
      <label
        >Имя<input v-model="firstName" maxlength="100" required /><span
          v-if="fields.firstName"
          class="field-error"
          >{{ fields.firstName }}</span
        ></label
      ><label
        >Фамилия<input v-model="lastName" maxlength="100" required /><span
          v-if="fields.lastName"
          class="field-error"
          >{{ fields.lastName }}</span
        ></label
      ><label
        >Дата рождения<input v-model="birthDate" type="date" required /><span
          v-if="fields.birthDate"
          class="field-error"
          >{{ fields.birthDate }}</span
        ></label
      ><label
        >Пол<select v-model="sex">
          <option value="unspecified">Не указан</option>
          <option value="male">Мужской</option>
          <option value="female">Женский</option></select
        ><span v-if="fields.sex" class="field-error">{{
          fields.sex
        }}</span></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <button>Добавить</button>
    </form>
  </section>
</template>
