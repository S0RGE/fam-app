<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink class="brand" to="/">Family App</NuxtLink>
      <AppNavigation />
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>
