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
  // 简单的主题切换逻辑
  const html = document.documentElement
  if (html.classList.contains('dark')) {
    html.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  } else {
    html.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }
}

const goToProfile = () => {
  router.push('/profile')
}

const goToAdmin = () => {
  router.push('/admin')
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

const toggleMobileMenu = () => {
  // 移动端菜单切换逻辑
  console.log('Toggle mobile menu')
}
</script>

<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-4">
          <router-link to="/" class="flex items-center space-x-2">
            <font-awesome-icon 
              :icon="['fas', 'envelope']" 
              class="text-2xl text-blue-500 dark:text-blue-400"
            />
            <span class="text-xl font-bold text-gray-900 dark:text-gray-100">
              临时邮箱
            </span>
          </router-link>
        </div>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center space-x-6">
          <router-link 
            v-if="isLoggedIn" 
            to="/dashboard" 
            class="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            邮箱管理
          </router-link>
          <router-link 
            v-if="!isLoggedIn" 
            to="/features" 
            class="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            功能介绍
          </router-link>
        </nav>

        <!-- User Actions -->
        <div class="flex items-center space-x-4">
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="切换主题"
          >
            <font-awesome-icon
              :icon="['fas', 'sun']"
              class="text-gray-600 dark:text-gray-400"
            />
          </button>

          <!-- User Menu -->
          <div v-if="isLoggedIn" class="flex items-center space-x-4">
            <!-- Quota Display -->
            <div class="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <font-awesome-icon 
                :icon="['fas', 'envelope']" 
                class="text-blue-500 dark:text-blue-400 text-sm"
              />
              <span class="text-sm text-blue-700 dark:text-blue-300 font-medium">
                配额: {{ userQuota }}
              </span>
            </div>

            <!-- User Dropdown -->
            <el-dropdown @command="handleCommand">
              <div class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <font-awesome-icon 
                    :icon="['fas', 'user']" 
                    class="text-white text-sm"
                  />
                </div>
                <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ user?.email }}
                </span>
                <font-awesome-icon 
                  :icon="['fas', 'chevron-down']" 
                  class="text-gray-400 text-xs"
                />
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
              <el-button type="primary" size="small">登录</el-button>
            </router-link>
            <router-link to="/register">
              <el-button size="small">注册</el-button>
            </router-link>
          </div>

          <!-- Mobile Menu Button -->
          <button 
            class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="toggleMobileMenu"
          >
            <font-awesome-icon 
              :icon="['fas', 'bars']" 
              class="text-gray-600 dark:text-gray-400"
            />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
