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
  window.open('/profile', '_blank')
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

        <!-- User Actions -->
        <div class="flex items-center space-x-4">
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
              <el-button type="primary">登录</el-button>
            </router-link>
            <router-link to="/register">
              <el-button>注册</el-button>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
