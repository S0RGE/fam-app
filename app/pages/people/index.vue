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
</script>
<template>
  <section>
    <h1>Члены семьи</h1>
    <label
      ><input v-model="archived" type="checkbox" @change="() => refresh()" />
      Показать архив</label
    >
    <p v-if="error" role="alert">Не удалось загрузить список.</p>
    <p v-else-if="!data" role="status">Загрузка…</p>
    <p v-else-if="!data.data.length">Профилей пока нет.</p>
    <ul v-else>
      <li v-for="person in data.data" :key="person.id">
        <NuxtLink :to="`/people/${person.id}`"
          >{{ person.lastName }} {{ person.firstName }}</NuxtLink
        >
      </li>
    </ul>
    <NuxtLink to="/">Вернуться на главную</NuxtLink>
  </section>
</template>
