<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isLoggedIn = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
const userQuota = computed(() => authStore.user?.quota || 0)

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
  window.open('/admin/dashboard', '_blank')
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
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="max-w-1500px mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-4">
          <router-link
            to="/"
            class="flex items-center space-x-3 no-underline hover:no-underline focus:no-underline p-2 rounded-xl bg-gradient-to-br backdrop-blur-sm border border-white/20 dark:border-gray-700/30"
          >
            <img class="w-60px" src="@/assets/logo.png" />
            <div class="flex flex-col justify-center">
              <h1
                class="text-lg m0 font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400"
              >
                四欧临时邮箱
              </h1>
              <div>
                <span class="text-sm font-bold text-green-500 font-italic">OOOO</span>
                <span class="text-sm font-bold font-italic text-orange-500">.ICU</span>
              </div>
            </div>
          </router-link>
        </div>

        <!-- Navigation & User Actions -->
        <div class="flex items-center space-x-4">
          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center space-x-6">
            <router-link
              to="/pricing"
              class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="mr-1" />
              配额购买
            </router-link>
          </nav>

          <!-- Theme Toggle -->
          <el-button
            @click="toggleTheme"
            circle
            class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            :title="`切换主题 (当前: ${themeDisplayName})`"
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
              <div
                class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <font-awesome-icon :icon="['fas', 'user']" class="text-white text-sm" />
                </div>
                <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ user?.email }}
                </span>
                <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-gray-400 text-xs" />
              </div>

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
              <el-button type="primary">登录</el-button>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
