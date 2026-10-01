<script setup lang="ts">
const route = useRoute()
const loggingOut = ref(false)
const error = ref('')
const isPublic = computed(() =>
  ['/login', '/recovery', '/reset'].includes(route.path),
)
async function logout() {
  loggingOut.value = true
  error.value = ''
  try {
    await $fetch('/api/v1/auth/logout', { method: 'POST' })
    await navigateTo('/login')
  } catch {
    error.value = 'Не удалось завершить сеанс.'
  } finally {
    loggingOut.value = false
  }
}
</script>
<template>
  <nav
    aria-label="Основная навигация"
    class="flex flex-wrap items-center gap-x-4 gap-y-1"
  >
    <NuxtLink
      to="/"
      class="text-sm font-medium text-neutral-700 no-underline hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
      >Главная</NuxtLink
    >
    <NuxtLink
      to="/people"
      class="text-sm font-medium text-neutral-700 no-underline hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
      >Члены семьи</NuxtLink
    >
    <UButton
      v-if="!isPublic"
      :disabled="loggingOut"
      variant="ghost"
      size="sm"
      class="text-sm"
      @click="logout"
    >
      {{ loggingOut ? 'Выход…' : 'Выйти' }}
    </UButton>
    <p v-if="error" role="alert" class="text-sm text-red-700 dark:text-red-400">
      {{ error }}
    </p>
  </nav>
</template>
