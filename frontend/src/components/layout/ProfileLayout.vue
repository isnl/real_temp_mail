<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const isMobile = useMediaQuery('(max-width: 820px)')

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
    path: '/profile/quota',
    name: 'profile-quota',
    title: '配额管理',
    icon: 'chart-pie',
    description: '查看配额使用情况'
  },
  {
    path: '/profile/security',
    name: 'profile-security',
    title: '安全设置',
    icon: 'user-lock',
    description: '管理本地登录密码'
  }
]

// 当前激活的菜单项
const activeMenuItem = computed(() => {
  return menuItems.find(item => item.name === route.name) || menuItems[0]
})

// 侧边栏折叠状态
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const isSidebarCollapsed = computed(() => !isMobile.value && sidebarCollapsed.value)

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
}

watch(() => route.fullPath, () => {
  mobileSidebarOpen.value = false
})

watch(isMobile, (mobile) => {
  if (!mobile) mobileSidebarOpen.value = false
})
</script>

<template>
  <div id="profile-layout" class="profile-layout flex min-h-full bg-gray-50 dark:bg-gray-900">
    <button
      v-if="isMobile && mobileSidebarOpen"
      class="profile-sidebar-backdrop"
      type="button"
      aria-label="关闭账户菜单"
      @click="mobileSidebarOpen = false"
    />

    <!-- 侧边栏 -->
    <aside
      :class="[
        'profile-sidebar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col',
        isSidebarCollapsed ? 'w-16' : 'w-64',
        { 'mobile-open': mobileSidebarOpen },
      ]"
      aria-label="账户中心导航"
      :aria-hidden="isMobile && !mobileSidebarOpen"
      :inert="isMobile && !mobileSidebarOpen ? true : undefined"
    >
      <!-- 侧边栏头部 - Logo区域 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div v-if="!isSidebarCollapsed" class="flex items-center space-x-3">
            <router-link
              to="/"
              class="flex items-center space-x-2 no-underline hover:no-underline focus:no-underline"
            >
              <h1 class="app-brand-title">临时邮箱管理</h1>
            </router-link>
          </div>
          <el-button
            @click="toggleSidebar"
            size="small"
            text
            class="!p-1"
            :aria-label="isMobile ? '关闭账户菜单' : (sidebarCollapsed ? '展开侧边栏' : '收起侧边栏')"
          >
            <font-awesome-icon
              :icon="['fas', isSidebarCollapsed ? 'chevron-right' : 'chevron-left']"
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
              isSidebarCollapsed ? 'mx-auto' : 'mr-3'
            ]"
          />
          <div v-if="!isSidebarCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">返回控制台</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">回到邮箱管理</p>
          </div>
        </router-link>

        <!-- 分隔线 -->
        <div v-if="!isSidebarCollapsed" class="border-t border-gray-200 dark:border-gray-600 my-3"></div>

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
              isSidebarCollapsed ? 'mx-auto' : 'mr-3',
              route.name === item.name
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            ]"
          />
          <div v-if="!isSidebarCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ item.title }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ item.description }}</p>
          </div>
        </router-link>
      </nav>

      <!-- 侧边栏底部 - 用户信息区域 -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <!-- 展开状态下的用户信息 -->
        <div v-if="!isSidebarCollapsed" class="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
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
    </aside>

    <!-- 主内容区域 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 内容头部 -->
      <div class="profile-content-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div class="flex items-center gap-3">
          <el-button
            class="profile-mobile-menu"
            text
            aria-label="打开账户菜单"
            :aria-expanded="mobileSidebarOpen"
            @click="mobileSidebarOpen = true"
          >
            <font-awesome-icon :icon="['fas', 'bars']" />
          </el-button>
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
      <main id="main-content" class="flex-1 overflow-y-auto px-10 py-8" tabindex="-1">
        <div class="max-w-1400px mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  position: relative;
  min-height: 100dvh;
  color: var(--text-primary);
  background: var(--page-bg);
}

.profile-sidebar {
  flex: 0 0 auto;
  overflow-y: auto;
  border-color: var(--border);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-sm);
  transition: width var(--transition-fast), transform var(--transition-fast);
}

.profile-content-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-color: var(--border);
  background: var(--surface-elevated);
  backdrop-filter: blur(16px);
}

.profile-mobile-menu,
.profile-sidebar-backdrop {
  display: none;
}

.max-w-1400px {
  max-width: 1400px;
}

@media (max-width: 820px) {
  .profile-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(84vw, 280px) !important;
    transform: translateX(-105%);
  }

  .profile-sidebar.mobile-open {
    transform: translateX(0);
  }

  .profile-mobile-menu {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .profile-sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: rgba(2, 15, 19, 0.52);
    backdrop-filter: blur(2px);
  }

  main {
    padding: 24px 20px;
  }
}

@media (max-width: 520px) {
  .profile-content-header {
    padding: 13px 12px;
  }

  .profile-content-header h1 {
    font-size: 1.05rem;
  }

  .profile-content-header p {
    font-size: 0.78rem;
  }

  main {
    padding: 18px 12px 28px;
  }
}
</style>
