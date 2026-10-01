<template>
  <div
    class="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100"
  >
    <header
      class="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
    >
      <UContainer
        class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <NuxtLink
          to="/"
          class="text-lg font-bold tracking-tight text-neutral-900 no-underline dark:text-neutral-50"
          >Family App</NuxtLink
        >
        <AppNavigation />
      </UContainer>
    </header>
    <main>
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </main>
  </div>
</template>
