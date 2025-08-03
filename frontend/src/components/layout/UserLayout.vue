<script lang="ts" setup>
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()

  // 检查并刷新token
  if (authStore.isAuthenticated) {
    authStore.checkAndRefreshToken()
  }
})
</script>

<template>
  <div id="user-layout" class="w-full h-full overflow-hidden flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <AppHeader />
    <main class="flex-1 w-full mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>