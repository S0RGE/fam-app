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
  <nav aria-label="Основная навигация">
    <ul class="navigation-list">
      <li><NuxtLink to="/">Главная</NuxtLink></li>
      <li><NuxtLink to="/people">Члены семьи</NuxtLink></li>
      <li v-if="!isPublic">
        <button type="button" :disabled="loggingOut" @click="logout">
          {{ loggingOut ? 'Выход…' : 'Выйти' }}
        </button>
      </li>
    </ul>
    <p v-if="error" role="alert">{{ error }}</p>
  </nav>
</template>
