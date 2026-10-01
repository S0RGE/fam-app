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
    fields.value = parseApiError(cause).fields
    error.value = 'Проверьте данные профиля.'
  }
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader
      eyebrow="Семейная медицинская информация"
      :title="'Добавить члена семьи'"
    >
      <template #description>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          <NuxtLink
            to="/people"
            class="font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
            >Все члены семьи</NuxtLink
          >
        </p>
      </template>
    </UPageHeader>
    <UPageCard>
      <form class="flex flex-col gap-4" @submit.prevent="add">
        <UFormField label="Имя">
          <UInput v-model="firstName" :max-length="100" required />
        </UFormField>
        <p
          v-if="fields.firstName"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ fields.firstName }}
        </p>
        <UFormField label="Фамилия">
          <UInput v-model="lastName" :max-length="100" required />
        </UFormField>
        <p
          v-if="fields.lastName"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ fields.lastName }}
        </p>
        <UFormField label="Дата рождения">
          <UInput v-model="birthDate" type="date" required />
        </UFormField>
        <p
          v-if="fields.birthDate"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ fields.birthDate }}
        </p>
        <UFormField label="Пол">
          <select v-model="sex" class="native-select" aria-label="Пол">
            <option value="unspecified">Не указан</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </UFormField>
        <p v-if="fields.sex" class="text-sm text-red-700 dark:text-red-400">
          {{ fields.sex }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ error }}
        </p>
        <UButton type="submit" block>Добавить</UButton>
      </form>
    </UPageCard>
  </UPage>
</template>
