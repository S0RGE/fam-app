<script setup lang="ts">
const email = ref('')
const done = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
async function submit() {
  error.value = ''
  fields.value = {}
  try {
    await $fetch('/api/v1/auth/recovery', {
      method: 'POST',
      body: { email: email.value },
    })
    done.value = true
  } catch (cause: unknown) {
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    error.value = 'Проверьте адрес email и повторите попытку.'
  }
}
</script>
<template>
  <section class="form-page">
    <h1>Восстановление пароля</h1>
    <p v-if="done" role="status">
      Если адрес зарегистрирован, письмо отправлено.
    </p>
    <form v-else @submit.prevent="submit">
      <label
        >Email<input
          v-model="email"
          type="email"
          autocomplete="email"
          required
        /><span v-if="fields.email" class="field-error">{{
          fields.email
        }}</span></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <button>Отправить письмо</button>
    </form>
  </section>
</template>
