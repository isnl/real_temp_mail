<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ElMessage } from 'element-plus'
import { usePublicSettings } from '@/composables/usePublicSettings'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const publicSettings = usePublicSettings()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)

const handleLogout = async () => {
  try {
    await authStore.logout()
    ElMessage.success('登出成功')
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('登出失败')
  }
}

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const themeIcon = computed(() => themeStore.getThemeIcon())
const themeDisplayName = computed(() => themeStore.getThemeDisplayName())

const goToProfile = () => {
  router.push('/profile')
}

const goToAdmin = () => {
  router.push('/admin/dashboard')
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      goToProfile()
      break
    case 'admin':
      goToAdmin()
      break
    case 'logout':
      handleLogout()
      break
  }
}

onMounted(() => {
  void publicSettings.load().catch(() => undefined)
})
</script>

<template>
  <header class="app-header">
    <div class="max-w-1500px mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-4">
          <router-link
            to="/"
            class="app-brand"
            aria-label="临时邮箱管理首页"
          >
            <h1 class="app-brand-title">临时邮箱管理</h1>
          </router-link>
        </div>

        <!-- Navigation & User Actions -->
        <div class="app-header-actions flex items-center space-x-4">
          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center space-x-6">
            <router-link
              to="/pricing"
              class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="mr-1" />
              配额中心
            </router-link>
          </nav>

          <!-- Theme Toggle -->
          <el-button
            @click="toggleTheme"
            circle
            class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            :title="`切换主题 (当前: ${themeDisplayName})`"
            :aria-label="`切换主题，当前为${themeDisplayName}`"
          >
            <font-awesome-icon
              :icon="['fas', themeIcon]"
              class="text-gray-600 dark:text-gray-400"
            />
          </el-button>

          <!-- User Menu -->
          <div v-if="isLoggedIn" class="flex items-center space-x-4">
            <!-- User Dropdown -->
            <el-dropdown @command="handleCommand">
              <button
                type="button"
                class="user-menu-trigger"
                aria-label="打开用户菜单"
              >
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <font-awesome-icon :icon="['fas', 'user']" class="text-white text-sm" />
                </div>
                <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ user?.email }}
                </span>
                <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-gray-400 text-xs" />
              </button>

              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <font-awesome-icon :icon="['fas', 'user']" class="mr-2" />
                    个人中心
                  </el-dropdown-item>
                  <el-dropdown-item v-if="user?.role === 'admin'" command="admin">
                    <font-awesome-icon :icon="['fas', 'cog']" class="mr-2" />
                    管理后台
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <font-awesome-icon :icon="['fas', 'sign-out-alt']" class="mr-2" />
                    登出
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- Login/Register Buttons -->
          <div v-else class="flex items-center space-x-2">
            <router-link to="/login">
              <el-button>登录</el-button>
            </router-link>
            <router-link v-if="publicSettings.settings.value.registrationEnabled" to="/register">
              <el-button type="primary">注册</el-button>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
