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
    fields.value = parseApiError(cause).fields
    error.value = 'Не удалось обновить пароль.'
  }
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Новый пароль'">
      <template #description>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Придумайте пароль не короче 6 символов.
        </p>
      </template>
    </UPageHeader>
    <UPageCard class="mx-auto w-full max-w-md">
      <p
        v-if="message"
        role="status"
        class="text-sm text-emerald-700 dark:text-emerald-400"
      >
        {{ message }}
      </p>
      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField label="Пароль">
          <UInput
            v-model="password"
            type="password"
            autocomplete="new-password"
            :min-length="6"
            :max-length="72"
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
        <UButton type="submit" block>Сохранить пароль</UButton>
      </form>
    </UPageCard>
  </UPage>
</template>
