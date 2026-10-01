<script setup lang="ts">
type Person = {
  id: string
  firstName: string
  lastName: string
  status: string
}
const archived = ref(false)
const { data, error, refresh } = await useFetch<{ data: Person[] }>(
  '/api/v1/people',
  {
    query: { status: computed(() => (archived.value ? 'archived' : 'active')) },
  },
)
async function toggleArchived() {
  archived.value = !archived.value
  await refresh()
}
</script>
<template>
  <UPage class="gap-6">
    <UPageHeader :title="'Члены семьи'">
      <template #links>
        <UButton
          :variant="archived ? 'solid' : 'outline'"
          size="sm"
          @click="toggleArchived"
        >
          Показать архив
        </UButton>
      </template>
    </UPageHeader>
    <UPageCard>
      <p
        v-if="error"
        role="alert"
        class="text-sm text-red-700 dark:text-red-400"
      >
        Не удалось загрузить список.
      </p>
      <p
        v-else-if="!data"
        role="status"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Загрузка…
      </p>
      <p
        v-else-if="!data.data.length"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        Профилей пока нет.
      </p>
      <ul v-else class="m-0 grid gap-1 p-0" :style="{ listStyle: 'none' }">
        <li v-for="person in data.data" :key="person.id" class="py-1">
          <NuxtLink
            :to="`/people/${person.id}`"
            class="font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
          >
            {{ person.lastName }} {{ person.firstName }}
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink
        to="/"
        class="mt-4 inline-block text-sm font-medium text-primary-600 no-underline hover:text-primary-700 dark:text-primary-400"
        >Вернуться на главную</NuxtLink
      >
    </UPageCard>
  </UPage>
</template>
