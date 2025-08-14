<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

// 处理GitHub登录回调
onMounted(async () => {
  // 检查是否有错误参数
  const error = route.query.error as string
  if (error) {
    ElMessage.error(decodeURIComponent(error))
    return
  }

  // 检查是否有token参数（从GitHub OAuth回调返回）
  const token = route.query.token as string
  const refreshToken = route.query.refresh_token as string
  const isNewUser = route.query.new_user === '1'

  if (token && refreshToken) {
    try {
      // 保存token到store
      authStore.setTokens({ accessToken: token, refreshToken })
      authStore.isAuthenticated = true

      // 获取用户信息
      await authStore.fetchCurrentUser()

      if (isNewUser) {
        ElMessage.success('欢迎使用临时邮箱服务！')
      } else {
        ElMessage.success('登录成功')
      }

      // 跳转到仪表板
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to fetch user info:', error)
      ElMessage.error('登录失败，请重试')
      authStore.clearAuthData()
    }
  }
})

const handleGitHubLogin = () => {
  loading.value = true
  // 重定向到GitHub OAuth授权页面
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
  window.location.href = `${apiBaseUrl}/api/auth/github`
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-4 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-md w-full flex flex-col gap-8">
      <!-- Header -->
      <div class="text-center">
        <div class="flex justify-center">
          <font-awesome-icon
            :icon="['fas', 'envelope']"
            class="text-6xl text-blue-500 dark:text-blue-400"
          />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">登录账户</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">使用GitHub账户登录</p>
      </div>

      <!-- GitHub Login -->
      <div
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-8"
      >
        <div class="space-y-6">
          <!-- GitHub Login Button -->
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleGitHubLogin"
            class="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 border-gray-900 hover:border-gray-800"
          >
            <font-awesome-icon :icon="['fab', 'github']" class="text-xl" />
            <span v-if="!loading">使用 GitHub 登录</span>
            <span v-else>正在跳转...</span>
          </el-button>

          <!-- 说明文字 -->
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              点击上方按钮将跳转到GitHub进行授权登录
            </p>
          </div>
        </div>


      </div>

      <!-- Features -->
      <div class="text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">安全 • 快速 • 免费的临时邮箱服务</p>
        <div class="flex justify-center space-x-6 mt-4">
          <div class="flex items-center space-x-1">
            <font-awesome-icon :icon="['fas', 'shield-alt']" class="text-green-500 text-sm" />
            <span class="text-xs text-gray-600 dark:text-gray-400">安全加密</span>
          </div>
          <div class="flex items-center space-x-1">
            <font-awesome-icon :icon="['fas', 'clock']" class="text-blue-500 text-sm" />
            <span class="text-xs text-gray-600 dark:text-gray-400">实时接收</span>
          </div>
          <div class="flex items-center space-x-1">
            <font-awesome-icon :icon="['fas', 'globe']" class="text-purple-500 text-sm" />
            <span class="text-xs text-gray-600 dark:text-gray-400">多域名支持</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Message as ElIconMessage, Lock as ElIconLock } from '@element-plus/icons-vue'

export default {
  components: {
    ElIconMessage,
    ElIconLock,
  },
}
</script>
