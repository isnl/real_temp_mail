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
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- 侧边栏头部 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div v-if="!sidebarCollapsed" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <font-awesome-icon 
                :icon="['fas', 'user']" 
                class="text-white text-lg"
              />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ user?.email }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
              </p>
            </div>
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
      <nav class="p-2">
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
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
