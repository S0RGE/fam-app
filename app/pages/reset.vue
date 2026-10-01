<script setup lang="ts">
const password = ref('')
const message = ref('')
const error = ref('')
const fields = ref<Record<string, string>>({})
async function submit() {
  error.value = ''
  fields.value = {}
  try {
    await $fetch('/api/v1/auth/reset', {
      method: 'POST',
      body: { password: password.value },
    })
    message.value = 'Пароль обновлён.'
  } catch (cause: unknown) {
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    error.value = 'Не удалось обновить пароль.'
  }
}
</script>
<template>
  <section class="form-page">
    <h1>Новый пароль</h1>
    <p v-if="message" role="status">{{ message }}</p>
    <form v-else @submit.prevent="submit">
      <label
        >Пароль<input
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="6"
          maxlength="72"
          required
        /><span v-if="fields.password" class="field-error">{{
          fields.password
        }}</span></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <button>Сохранить пароль</button>
    </form>
  </section>
</template>
