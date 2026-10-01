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
    fields.value = parseApiError(cause).fields
    error.value = 'Не удалось создать семью.'
  }
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Настройка семьи'">
      <template #description>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Назовите семью — данные будут доступны её участникам.
        </p>
      </template>
    </UPageHeader>
    <UPageCard class="mx-auto w-full max-w-md">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField label="Название семьи">
          <UInput v-model="name" :max-length="120" required />
        </UFormField>
        <p v-if="fields.name" class="text-sm text-red-700 dark:text-red-400">
          {{ fields.name }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ error }}
        </p>
        <UButton type="submit" block>Создать семью</UButton>
      </form>
    </UPageCard>
  </UPage>
</template>
