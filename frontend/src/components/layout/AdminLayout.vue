<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// 初始化主题和认证状态
onMounted(() => {
  // 初始化主题
  themeStore.initTheme()

  // 检查并刷新token
  if (authStore.isAuthenticated) {
    authStore.checkAndRefreshToken()
  }
})

const isCollapsed = ref(false)

// 菜单项配置
const menuItems = [
  {
    key: 'dashboard',
    title: '仪表板',
    icon: 'tachometer-alt',
    path: '/admin/dashboard',
  },
  {
    key: 'users',
    title: '用户管理',
    icon: 'users',
    path: '/admin/users',
  },
  {
    key: 'domains',
    title: '域名管理',
    icon: 'globe',
    path: '/admin/domains',
  },
  {
    key: 'emails',
    title: '邮件审查',
    icon: 'envelope-open',
    path: '/admin/emails',
  },
  {
    key: 'logs',
    title: '日志审计',
    icon: 'file-alt',
    path: '/admin/logs',
  },
  {
    key: 'redeem-codes',
    title: '兑换码管理',
    icon: 'ticket-alt',
    path: '/admin/redeem-codes',
  },
]

// 当前激活的菜单项
const activeMenuItem = computed(() => {
  const currentPath = route.path
  return menuItems.find((item) => currentPath.startsWith(item.path))?.key || 'dashboard'
})

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// 导航到指定路径
const navigateTo = (path: string) => {
  router.push(path)
}

// 退出登录
const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

// 返回用户端
const goToUserDashboard = () => {
  router.push('/dashboard')
}
</script>

<template>
  <div id="admin-layout" class="admin-layout min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 侧边栏 -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-lg',
        isCollapsed ? 'w-16' : 'w-64',
        '-translate-x-full lg:translate-x-0',
      ]"
    >
      <!-- 侧边栏头部 -->
      <div
        class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700"
      >
        <div v-if="!isCollapsed" class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="shield-alt" class="text-white text-sm" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-gray-100"> 管理后台 </span>
        </div>
        <button
          @click="toggleSidebar"
          class="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <font-awesome-icon
            :icon="isCollapsed ? 'chevron-right' : 'chevron-left'"
            class="text-gray-500 dark:text-gray-400"
          />
        </button>
      </div>

      <!-- 菜单列表 -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          v-for="item in menuItems"
          :key="item.key"
          @click="navigateTo(item.path)"
          :class="[
            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            activeMenuItem === item.key
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <font-awesome-icon
            :icon="item.icon"
            :class="['flex-shrink-0', isCollapsed ? 'mx-auto' : 'mr-3']"
          />
          <span v-if="!isCollapsed">{{ item.title }}</span>
        </button>
      </nav>

      <!-- 侧边栏底部 -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <div v-if="!isCollapsed" class="space-y-2">
          <button
            @click="goToUserDashboard"
            class="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <font-awesome-icon icon="arrow-left" class="mr-3" />
            返回用户端
          </button>
          <button
            @click="logout"
            class="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <font-awesome-icon icon="sign-out-alt" class="mr-3" />
            退出登录
          </button>
        </div>
        <div v-else class="space-y-2">
          <button
            @click="goToUserDashboard"
            class="w-full flex justify-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="返回用户端"
          >
            <font-awesome-icon icon="arrow-left" />
          </button>
          <button
            @click="logout"
            class="w-full flex justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="退出登录"
          >
            <font-awesome-icon icon="sign-out-alt" />
          </button>
        </div>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div :class="['main-content', isCollapsed ? 'collapsed' : 'expanded']">
      <!-- 顶部导航栏 -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
        <div class="flex items-center justify-between h-full px-4">
          <!-- 移动端菜单按钮 -->
          <button
            @click="toggleMobileMenu"
            class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <font-awesome-icon icon="bars" class="text-gray-500 dark:text-gray-400" />
          </button>

          <!-- 页面标题 -->
          <div class="flex-1 lg:flex-none">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {{ menuItems.find((item) => item.key === activeMenuItem)?.title || '管理后台' }}
            </h1>
          </div>

          <!-- 右侧操作区 -->
          <div class="flex items-center space-x-4">
            <!-- 主题切换 -->
            <button
              @click="themeStore.toggleTheme"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="切换主题"
            >
              <font-awesome-icon
                :icon="themeStore.isDark ? 'sun' : 'moon'"
                class="text-gray-500 dark:text-gray-400"
              />
            </button>

            <!-- 用户信息 -->
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <font-awesome-icon icon="user" class="text-white text-sm" />
              </div>
              <div class="hidden sm:block">
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ authStore.user?.email }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">管理员</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
#admin-layout {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  background-color: #f9fafb;
  /* 确保管理后台布局完全独立 */
  position: relative;
  z-index: 1;
}

.dark #admin-layout {
  background-color: #111827;
}

.admin-layout {
  min-height: 100vh;
}

/* 侧边栏样式 */
aside {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.dark aside {
  background-color: #1f2937;
  border-right-color: #374151;
}

/* 主内容区域 */
.main-content {
  transition: margin-left 0.3s ease;
}

/* 自定义滚动条 */
nav::-webkit-scrollbar {
  width: 4px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>
