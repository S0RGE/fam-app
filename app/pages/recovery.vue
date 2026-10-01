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
    fields.value = parseApiError(cause).fields
    error.value = 'Проверьте адрес email и повторите попытку.'
  }
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Восстановление пароля'">
      <template #description>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Укажите email — отправим письмо со ссылкой на сброс.
        </p>
      </template>
    </UPageHeader>
    <UPageCard class="mx-auto w-full max-w-md">
      <p
        v-if="done"
        role="status"
        class="text-sm text-emerald-700 dark:text-emerald-400"
      >
        Если адрес зарегистрирован, письмо отправлено.
      </p>
      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField label="Email">
          <UInput v-model="email" type="email" autocomplete="email" required />
        </UFormField>
        <p v-if="fields.email" class="text-sm text-red-700 dark:text-red-400">
          {{ fields.email }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="text-sm text-red-700 dark:text-red-400"
        >
          {{ error }}
        </p>
        <UButton type="submit" block>Отправить письмо</UButton>
      </form>
    </UPageCard>
  </UPage>
</template>
