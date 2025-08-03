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
  <div id="user-layout" class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <AppHeader />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* 用户端布局特定样式 */
#user-layout {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

/* 确保主内容区域有足够的最小高度 */
main {
  min-height: calc(100vh - 4rem); /* 减去 header 高度 */
}
</style>
