<script setup lang="ts">
const name = ref('')
const error = ref('')
const fields = ref<Record<string, string>>({})
async function submit() {
  error.value = ''
  fields.value = {}
  try {
    await $fetch('/api/v1/family', {
      method: 'POST',
      body: { name: name.value },
    })
    await navigateTo('/')
  } catch (cause: unknown) {
    fields.value =
      (cause as { data?: { error?: { fields?: Record<string, string> } } }).data
        ?.error?.fields || {}
    error.value = 'Не удалось создать семью.'
  }
}
</script>
<template>
  <section class="form-page">
    <h1>Настройка семьи</h1>
    <form @submit.prevent="submit">
      <label
        >Название семьи<input v-model="name" required maxlength="120" /><span
          v-if="fields.name"
          class="field-error"
          >{{ fields.name }}</span
        ></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <button>Создать семью</button>
    </form>
  </section>
</template>
