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
    const data = (
      cause as { data?: { error?: { fields?: Record<string, string> } } }
    ).data
    fields.value = data?.error?.fields || {}
    error.value = 'Не удалось войти. Проверьте email и пароль.'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <section class="form-page">
    <h1>Вход</h1>
    <form @submit.prevent="submit">
      <label
        >Email<input
          v-model="email"
          type="email"
          autocomplete="email"
          required
        /><span v-if="fields.email" class="field-error">{{
          fields.email
        }}</span></label
      ><label
        >Пароль<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        /><span v-if="fields.password" class="field-error">{{
          fields.password
        }}</span></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="loading">
        {{ loading ? 'Выполняется вход…' : 'Войти' }}
      </button>
    </form>
    <NuxtLink to="/recovery">Восстановить пароль</NuxtLink>
  </section>
</template>
