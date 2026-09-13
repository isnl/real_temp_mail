<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const isMobile = useMediaQuery('(max-width: 900px)')

const isCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const isSidebarCollapsed = computed(() => !isMobile.value && isCollapsed.value)

watch(() => route.fullPath, () => {
  mobileSidebarOpen.value = false
})

watch(isMobile, (mobile) => {
  if (!mobile) mobileSidebarOpen.value = false
})

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
    key: 'announcements',
    title: '公告管理',
    icon: 'bullhorn',
    path: '/admin/announcements',
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
  {
    key: 'quota-logs',
    title: '配额记录',
    icon: 'coins',
    path: '/admin/quota-logs',
  },
  {
    key: 'settings',
    title: '系统设置',
    icon: 'cog',
    path: '/admin/settings',
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
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
    return
  }
  isCollapsed.value = !isCollapsed.value
}

// 菜单选择处理
const handleMenuSelect = (path: string) => {
  mobileSidebarOpen.value = false
  router.push(path)
}

// 退出登录
const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

</script>

<template>
  <div id="admin-layout" class="admin-layout min-h-screen bg-gray-50 dark:bg-gray-900">
    <button
      v-if="isMobile && mobileSidebarOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="关闭管理菜单"
      @click="mobileSidebarOpen = false"
    />

    <!-- 侧边栏 -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-lg',
        isSidebarCollapsed ? 'w-16' : 'w-280',
        { 'mobile-open': mobileSidebarOpen },
      ]"
      aria-label="管理后台导航"
      :aria-hidden="isMobile && !mobileSidebarOpen"
      :inert="isMobile && !mobileSidebarOpen ? true : undefined"
    >
      <!-- 侧边栏头部 -->
      <div
        class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700"
      >
        <div v-if="!isSidebarCollapsed" class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="shield-alt" class="text-white text-sm" />
          </div>
          <span class="text-lg font-semibold text-gray-900 dark:text-gray-100"> 管理后台 </span>
        </div>
        <el-button
          @click="toggleSidebar"
          text
          class="sidebar-collapse-button !p-2"
          :aria-label="isMobile ? '关闭管理菜单' : (isCollapsed ? '展开侧边栏' : '收起侧边栏')"
        >
          <font-awesome-icon
            :icon="isSidebarCollapsed ? 'chevron-right' : 'chevron-left'"
            class="text-gray-500 dark:text-gray-400"
          />
        </el-button>
      </div>



      <!-- 主菜单 -->
      <div class="flex-1">
        <el-menu
          :default-active="activeMenuPath"
          :collapse="isSidebarCollapsed"
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
        <div v-if="!isSidebarCollapsed" class="flex flex-col gap-3">
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
    <div :class="['main-content', isSidebarCollapsed ? 'collapsed' : 'expanded']">
      <!-- 简化的顶部导航栏 -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
        <div class="flex items-center h-full gap-3 px-6">
          <el-button
            class="mobile-menu-button"
            text
            aria-label="打开管理菜单"
            :aria-expanded="mobileSidebarOpen"
            @click="mobileSidebarOpen = true"
          >
            <font-awesome-icon icon="bars" />
          </el-button>
          <!-- 页面标题 -->
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ menuItems.find((item) => item.key === activeMenuItem)?.title || '管理后台' }}
          </h1>
        </div>
      </header>

      <!-- 页面内容 -->
      <main id="main-content" class="p-6 w-full max-w-none" tabindex="-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
#admin-layout {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  background: var(--page-bg);
}

aside {
  overflow-y: auto;
  border-color: var(--border);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-md);
  transition: width var(--transition-fast), transform var(--transition-fast);
}

.main-content {
  min-width: 0;
  min-height: 100dvh;
  background: var(--page-bg);
  transition: margin-left var(--transition-fast);
}

.main-content.expanded {
  margin-left: 280px;
}

.main-content.collapsed {
  margin-left: 64px;
}

header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-color: var(--border);
  background: var(--surface-elevated);
  backdrop-filter: blur(16px);
}

main {
  width: 100%;
  padding: 32px 40px;
  min-height: calc(100dvh - 64px);
}

main > * {
  max-width: 1480px;
  margin: 0 auto;
}

.mobile-menu-button,
.sidebar-backdrop {
  display: none;
}

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

:deep(.el-menu-item svg) {
  margin-right: 12px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

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

:deep(.el-menu--collapse .el-menu-item .el-tooltip__trigger) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 0 !important;
}

:deep(.el-menu--collapse .el-menu-item > *) {
  margin: 0 auto !important;
}

.w-280 {
  width: 280px;
}

@media (max-width: 900px) {
  aside {
    width: min(84vw, 280px) !important;
    transform: translateX(-105%);
  }

  aside.mobile-open {
    transform: translateX(0);
  }

  .main-content.expanded,
  .main-content.collapsed {
    margin-left: 0;
  }

  .mobile-menu-button {
    display: inline-flex;
  }

  .sidebar-backdrop {
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
  header > div {
    padding-inline: 12px;
  }

  header h1 {
    font-size: 1.05rem;
  }

  main {
    padding: 18px 12px 28px;
  }
}
</style>
