<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

// 侧边栏菜单项
const menuItems = [
  {
    path: '/profile/overview',
    name: 'profile-overview',
    title: '概览',
    icon: 'tachometer-alt',
    description: '账户概览和统计'
  },
  {
    path: '/profile/settings',
    name: 'profile-settings',
    title: '个人信息',
    icon: 'user-cog',
    description: '编辑个人资料'
  },
  {
    path: '/profile/security',
    name: 'profile-security',
    title: '安全设置',
    icon: 'shield-alt',
    description: '密码和安全选项'
  },
  {
    path: '/profile/quota',
    name: 'profile-quota',
    title: '配额管理',
    icon: 'chart-pie',
    description: '查看配额使用情况'
  },
  {
    path: '/profile/checkin',
    name: 'profile-checkin',
    title: '签到中心',
    icon: 'calendar-check',
    description: '签到统计和管理'
  }
]

// 当前激活的菜单项
const activeMenuItem = computed(() => {
  return menuItems.find(item => item.name === route.name) || menuItems[0]
})

// 侧边栏折叠状态
const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="flex h-full bg-gray-50 dark:bg-gray-900">
    <!-- 侧边栏 -->
    <div
      :class="[
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col',
        sidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- 侧边栏头部 - Logo区域 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div v-if="!sidebarCollapsed" class="flex items-center space-x-3">
            <router-link
              to="/"
              class="flex items-center space-x-2 no-underline hover:no-underline focus:no-underline"
            >
              <img class="w-60px" src="@/assets/logo.png" />
              <div class="flex flex-col justify-center">
                <h1
                  class="text-sm m0 font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400"
                >
                  四欧临时邮箱
                </h1>
                <div>
                  <span class="text-xs font-bold text-green-500 font-italic">OOOO</span>
                  <span class="text-xs font-bold font-italic text-orange-500">.ICU</span>
                </div>
              </div>
            </router-link>
          </div>
          <el-button
            @click="toggleSidebar"
            size="small"
            text
            class="!p-1"
          >
            <font-awesome-icon
              :icon="['fas', sidebarCollapsed ? 'chevron-right' : 'chevron-left']"
              class="text-gray-500"
            />
          </el-button>
        </div>
      </div>

      <!-- 菜单列表 -->
      <nav class="flex-1 p-2">
        <!-- 返回首页按钮 -->
        <router-link
          to="/dashboard"
          class="flex items-center px-3 py-2 mb-3 rounded-lg transition-colors group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
        >
          <font-awesome-icon
            :icon="['fas', 'home']"
            :class="[
              'text-lg text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300',
              sidebarCollapsed ? 'mx-auto' : 'mr-3'
            ]"
          />
          <div v-if="!sidebarCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">返回首页</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">回到邮箱管理</p>
          </div>
        </router-link>

        <!-- 分隔线 -->
        <div v-if="!sidebarCollapsed" class="border-t border-gray-200 dark:border-gray-600 my-3"></div>

        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="item.path"
          :class="[
            'flex items-center px-3 py-2 mb-1 rounded-lg transition-colors group',
            route.name === item.name
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
        >
          <font-awesome-icon
            :icon="['fas', item.icon]"
            :class="[
              'text-lg',
              sidebarCollapsed ? 'mx-auto' : 'mr-3',
              route.name === item.name
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            ]"
          />
          <div v-if="!sidebarCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ item.title }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ item.description }}</p>
          </div>
        </router-link>
      </nav>

      <!-- 侧边栏底部 - 用户信息区域 -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <!-- 展开状态下的用户信息 -->
        <div v-if="!sidebarCollapsed" class="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <font-awesome-icon
              :icon="['fas', 'user']"
              class="text-white text-xs"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ user?.email }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
            </div>
          </div>
        </div>

        <!-- 折叠状态下的用户信息 -->
        <div v-else class="flex flex-col items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <font-awesome-icon
              :icon="['fas', 'user']"
              class="text-white text-xs"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 内容头部 -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {{ activeMenuItem.title }}
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ activeMenuItem.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- 路由内容 -->
      <main class="flex-1 overflow-y-auto px-10 py-8">
        <div class="max-w-1400px mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 自定义最大宽度类 */
.max-w-1400px {
  max-width: 1400px;
}
</style>
