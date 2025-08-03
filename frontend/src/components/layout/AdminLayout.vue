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

// 当前激活的菜单路径（用于el-menu）
const activeMenuPath = computed(() => {
  const currentPath = route.path
  return menuItems.find((item) => currentPath.startsWith(item.path))?.path || '/admin/dashboard'
})

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// 菜单选择处理
const handleMenuSelect = (path: string) => {
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
        isCollapsed ? 'w-16' : 'w-280',
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
        <el-button
          @click="toggleSidebar"
          text
          class="!p-2"
        >
          <font-awesome-icon
            :icon="isCollapsed ? 'chevron-right' : 'chevron-left'"
            class="text-gray-500 dark:text-gray-400"
          />
        </el-button>
      </div>



      <!-- 主菜单 -->
      <div class="flex-1">
        <el-menu
          :default-active="activeMenuPath"
          :collapse="isCollapsed"
          :unique-opened="true"
          background-color="transparent"
          text-color="var(--el-text-color-primary)"
          active-text-color="var(--el-color-primary)"
          @select="handleMenuSelect"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.key"
            :index="item.path"
          >
            <font-awesome-icon :icon="item.icon" class="text-gray-600 dark:text-gray-400"/>
            <template #title>
              <span>{{ item.title }}</span>
            </template>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 侧边栏底部操作 -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <!-- 展开状态下的底部区域 -->
        <div v-if="!isCollapsed" class="flex flex-col gap-3">
          <!-- 主题切换 -->
          <el-button
            @click="themeStore.toggleTheme"
            text
            class="w-full justify-start !p-2"
            :title="themeStore.isDark ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <font-awesome-icon
              :icon="themeStore.isDark ? 'sun' : 'moon'"
              class="text-gray-500 dark:text-gray-400 mr-3"
            />
            {{ themeStore.isDark ? '亮色模式' : '暗色模式' }}
          </el-button>

          <!-- 用户信息和退出登录整合 -->
          <div class="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <font-awesome-icon icon="user" class="text-white text-xs" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ authStore.user?.email }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">管理员</div>
            </div>
            <el-button
              @click="logout"
              text
              type="danger"
              class="!p-2"
              title="退出登录"
            >
              <font-awesome-icon icon="sign-out-alt" class="text-red-500" />
            </el-button>
          </div>
        </div>

        <!-- 折叠状态下的底部区域 -->
        <div v-else class="flex flex-col gap-3">
          <!-- 主题切换 -->
          <el-button
            @click="themeStore.toggleTheme"
            text
            class="w-full !p-2"
            :title="themeStore.isDark ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <font-awesome-icon
              :icon="themeStore.isDark ? 'sun' : 'moon'"
              class="text-gray-500 dark:text-gray-400"
            />
          </el-button>

          <!-- 用户信息和退出登录整合 -->
          <div class="flex flex-col items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <font-awesome-icon icon="user" class="text-white text-xs" />
            </div>
            <el-button
              @click="logout"
              text
              type="danger"
              class="!p-1"
              title="退出登录"
            >
              <font-awesome-icon icon="sign-out-alt" class="text-red-500 text-sm" />
            </el-button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div :class="['main-content', isCollapsed ? 'collapsed' : 'expanded']">
      <!-- 简化的顶部导航栏 -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
        <div class="flex items-center h-full px-6">
          <!-- 页面标题 -->
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ menuItems.find((item) => item.key === activeMenuItem)?.title || '管理后台' }}
          </h1>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="p-6 w-full max-w-none">
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
  min-height: 100vh;
  background-color: #f9fafb;
}

.dark .main-content {
  background-color: #111827;
}

.main-content.expanded {
  margin-left: 280px; /* 280px 侧边栏宽度 */
}

.main-content.collapsed {
  margin-left: 64px; /* 64px 折叠侧边栏宽度 */
}

/* 针对1080p及更高分辨率设备优化，移除响应式代码 */
main {
  width: 100%;
  max-width: none;
  padding: 32px 40px;
  min-height: calc(100vh - 64px); /* 减去header高度 */
}

/* 确保内容区域有合适的最大宽度，但不限制在1280px */
main > * {
  max-width: 1600px; /* 提高到1600px，适合高分辨率显示器 */
  margin: 0 auto;
}

.main-content.collapsed {
  margin-left: 64px; /* 64px 折叠侧边栏宽度 */
}


.dark .main-content {
  background-color: #111827;
}

/* 确保内容区域有合适的最大宽度 */
main > * {
  max-width: 1400px;
  margin: 0 auto;
}

/* 自定义滚动条 */
.el-menu::-webkit-scrollbar {
  width: 4px;
}

.el-menu::-webkit-scrollbar-track {
  background: transparent;
}

.el-menu::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
}

.el-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}

/* Element Plus Menu 自定义样式 */
:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  margin: 4px 12px;
  border-radius: 8px;
  height: 44px;
  line-height: 44px;
}

:deep(.el-menu-item:hover) {
  background-color: var(--el-color-primary-light-9);
}

:deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

/* 菜单图标样式 */
:deep(.el-menu-item svg) {
  margin-right: 12px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 折叠状态下的图标居中 */
:deep(.el-menu--collapse .el-menu-item) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  padding: 0 10px !important;
}

:deep(.el-menu--collapse .el-menu-item svg) {
  margin: 0 !important;
  position: relative;
  left: 0;
  right: 0;
}

/* 确保折叠状态下隐藏文字 */
:deep(.el-menu--collapse .el-menu-item .el-tooltip__trigger) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
}

/* 额外的居中保证 */
:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 0 !important;
}

:deep(.el-menu--collapse .el-menu-item > *) {
  margin: 0 auto !important;
}

/* 自定义宽度类 */
.w-280 {
  width: 280px;
}
</style>
