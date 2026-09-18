<script lang="ts" setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import SiteFooter from './SiteFooter.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const footerPages = ['home', 'pricing', 'features', 'about', 'terms', 'privacy']
</script>

<template>
  <div
    id="user-layout"
    class="w-full h-full overflow-hidden flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
  >
    <AppHeader />
    <main id="main-content" class="flex-1 min-h-0 w-full mx-auto overflow-y-auto" tabindex="-1">
      <router-view />
      <SiteFooter v-if="footerPages.includes(String(route.name))" />
    </main>
  </div>
</template>
