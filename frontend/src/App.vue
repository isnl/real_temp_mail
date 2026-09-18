<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { loadPublicSettings } from '@/composables/usePublicSettings'
import { usePageTitle } from '@/composables/usePageTitle'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()

// Apply the persisted theme before the first component paint.
themeStore.initTheme()
usePageTitle()
void loadPublicSettings().catch(() => undefined)

onMounted(async () => {
  // App is the only lifecycle owner for cross-page initialization. Keeping
  // token rotation in individual layouts caused duplicate refresh requests,
  // while direct visits to profile routes skipped initialization entirely.
  if (!authStore.isLoggedIn) return
  const tokenIsUsable = await authStore.checkAndRefreshToken()
  if (!tokenIsUsable) return
  try {
    // JWT 中的角色不是授权真相；刷新数据库用户也能及时反映停用和降权。
    await authStore.fetchCurrentUser()
    if (route.meta.requiresAdmin && !authStore.isAdmin) await router.replace('/profile')
  } catch {
    // API 客户端会清理无效会话并跳转登录页。
  }
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <RouterView />
</template>
