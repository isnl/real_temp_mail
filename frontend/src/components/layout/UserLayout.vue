<script lang="ts" setup>
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div id="user-layout" class="w-full h-full overflow-hidden flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <AppHeader />
    <main
      id="main-content"
      class="flex-1 min-h-0 w-full mx-auto overflow-y-auto lg:overflow-hidden"
      tabindex="-1"
    >
      <router-view />
    </main>
  </div>
</template>
