<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
const email = ref('')
const password = ref('')
const error = ref('')
const fields = ref<Record<string, string>>({})
const loading = ref(false)
async function submit() {
  loading.value = true
  error.value = ''
  fields.value = {}
  try {
    const result = await $fetch<any>('/api/v1/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo(result.data.setupRequired ? '/setup' : '/')
  } catch (cause: unknown) {
    fields.value = parseApiError(cause).fields
    error.value = 'Не удалось войти. Проверьте email и пароль.'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Вход'">
      <template #description>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Войти в семейный медицинский профиль.
        </p>
      </template>
    </UPageHeader>
    <UPageCard class="mx-auto w-full max-w-md">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField label="Email">
          <UInput v-model="email" type="email" autocomplete="email" required />
        </UFormField>
        <p v-if="fields.email" class="text-sm text-red-700 dark:text-red-400">
          {{ fields.email }}
        </p>
        <UFormField label="Пароль">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </UFormField>
        <p
          v-if="fields.password"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ fields.password }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ error }}
        </p>
        <UButton type="submit" :loading="loading" block> Войти </UButton>
        <NuxtLink
          to="/recovery"
          class="text-center text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >Восстановить пароль</NuxtLink
        >
      </form>
    </UPageCard>
  </UPage>
</template>
