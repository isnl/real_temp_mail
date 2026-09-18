<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onClickOutside, onKeyStroke, useMediaQuery } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import BrandLogo from './BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const theme = useThemeStore()
const header = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)
const mobileOpen = ref(false)
const isMobile = useMediaQuery('(max-width: 760px)')
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)
const navigation = [
  { path: '/', label: '首页' },
  { path: '/pricing', label: '价格' },
]

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
watch(isMobile, () => {
  mobileOpen.value = false
})
onClickOutside(header, () => {
  mobileOpen.value = false
})
onKeyStroke('Escape', () => {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  menuButton.value?.focus()
})

const handleLogout = async () => {
  try {
    await auth.logout()
    ElMessage.success('登出成功')
    await router.push('/login')
  } catch {
    ElMessage.error('登出失败')
  }
}
const handleCommand = (command: string) => {
  if (command === 'profile') void router.push('/profile/overview')
  if (command === 'admin') void router.push('/admin/dashboard')
  if (command === 'logout') void handleLogout()
}
</script>

<template>
  <header ref="header" class="app-header public-header">
    <div class="public-bar">
      <BrandLogo />
      <nav class="public-navigation" aria-label="前台导航">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{ 'is-active': route.path === item.path }"
          :aria-current="route.path === item.path ? 'page' : undefined"
          >{{ item.label }}</router-link
        >
      </nav>
      <div class="public-actions">
        <button
          class="header-icon-button header-theme-button"
          :aria-label="`切换主题，当前为${theme.getThemeDisplayName()}`"
          :title="`切换主题，当前为${theme.getThemeDisplayName()}`"
          @click="theme.toggleTheme"
        >
          <font-awesome-icon :icon="theme.getThemeIcon()" />
        </button>
        <span class="header-action-divider" aria-hidden="true" />
        <router-link to="/profile" class="header-console-link mint-solid-button">
          控制台
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </router-link>
        <el-dropdown
          v-if="isLoggedIn"
          class="header-account"
          trigger="click"
          @command="handleCommand"
        >
          <button
            type="button"
            class="user-menu-trigger"
            aria-label="打开用户菜单"
            :title="user?.email"
          >
            <span class="header-avatar"><font-awesome-icon icon="user" /></span>
            <font-awesome-icon icon="chevron-down" class="header-user-chevron" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile"
                ><font-awesome-icon icon="user" class="mr-2" />个人中心</el-dropdown-item
              >
              <el-dropdown-item v-if="auth.isAdmin" command="admin"
                ><font-awesome-icon icon="cog" class="mr-2" />管理后台</el-dropdown-item
              >
              <el-dropdown-item divided command="logout"
                ><font-awesome-icon icon="sign-out-alt" class="mr-2" />退出登录</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <router-link v-else to="/login" class="header-login-link">登录</router-link>
        <button
          ref="menuButton"
          class="header-icon-button public-menu-toggle"
          :aria-label="mobileOpen ? '关闭前台菜单' : '打开前台菜单'"
          :aria-expanded="mobileOpen"
          aria-controls="public-mobile-menu"
          @click="mobileOpen = !mobileOpen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path v-if="mobileOpen" d="m6 6 12 12M6 18 18 6" stroke-linecap="round" />
            <path v-else d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
    <div v-if="isMobile && mobileOpen" id="public-mobile-menu" class="public-mobile-menu">
      <nav class="mobile-navigation" aria-label="移动端前台导航">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{ 'is-active': route.path === item.path }"
          :aria-current="route.path === item.path ? 'page' : undefined"
          >{{ item.label }}<font-awesome-icon icon="chevron-right"
        /></router-link>
      </nav>
      <div v-if="isLoggedIn" class="mobile-account-links">
        <p>{{ user?.email }}</p>
        <router-link to="/profile/overview">个人中心</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/dashboard">管理后台</router-link>
        <button @click="handleLogout">退出登录</button>
      </div>
      <div class="mobile-primary-actions">
        <router-link to="/profile" class="header-console-link mint-solid-button"
          >控制台<font-awesome-icon icon="chevron-right"
        /></router-link>
        <router-link v-if="!isLoggedIn" to="/login" class="mobile-login-link">登录账号</router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.public-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  backdrop-filter: none;
}
.public-bar {
  display: grid;
  grid-template-columns: minmax(270px, 1fr) auto minmax(270px, 1fr);
  align-items: center;
  gap: 32px;
  max-width: 1408px;
  min-height: 88px;
  margin: auto;
  padding: 0 40px;
}
.public-bar :deep(.brand-logo) {
  gap: 12px;
  justify-self: start;
}
.public-bar :deep(.brand-logo img) {
  width: 42px;
  height: 42px;
}
.public-bar :deep(.brand-logo span) {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.65px;
}
.public-navigation {
  display: flex;
  align-items: center;
  gap: 28px;
  align-self: stretch;
}
.public-navigation a {
  position: relative;
  display: flex;
  align-items: center;
  align-self: stretch;
  padding: 0 12px;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 550;
  letter-spacing: 0.02em;
}
.public-navigation a::after {
  position: absolute;
  bottom: 19px;
  left: 12px;
  right: 12px;
  height: 3px;
  border-radius: 3px;
  background: transparent;
  content: '';
}
.public-navigation a:hover,
.public-navigation a.is-active {
  color: var(--text-primary);
}
.public-navigation a.is-active::after {
  background: var(--brand-500);
}
.public-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.header-action-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
}
.header-console-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  min-height: 42px;
  padding: 0 19px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 650;
  white-space: nowrap;
  transition: background-color 160ms ease;
}
.header-console-link svg {
  width: 16px;
  height: 16px;
}
.header-icon-button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  color: var(--text-secondary);
  background: transparent;
}
.header-icon-button:hover {
  color: var(--text-primary);
  background: var(--surface-muted);
}
.header-icon-button svg {
  width: 18px;
  height: 18px;
}
.user-menu-trigger {
  padding: 3px 0 3px 3px;
  gap: 8px;
}
.user-menu-trigger:hover {
  background: transparent;
}
.header-avatar {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--brand-link);
  background: var(--brand-soft);
}
.header-user-chevron {
  width: 9px;
  color: var(--text-tertiary);
}
.header-login-link {
  padding: 10px 3px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.header-login-link:hover {
  color: var(--brand-link);
}
.public-menu-toggle {
  display: none;
}
.public-mobile-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: calc(100dvh - 72px);
  overflow-y: auto;
  padding: 12px 22px 22px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 16px 24px rgba(18, 59, 50, 0.06);
}
.mobile-navigation {
  display: grid;
  gap: 4px;
}
.mobile-navigation a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
}
.mobile-navigation a svg {
  width: 10px;
  color: var(--text-tertiary);
}
.mobile-navigation a.is-active {
  background: var(--brand-soft);
  color: var(--brand-link);
}
.mobile-account-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin: 14px 0;
  padding: 18px 12px 4px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-secondary);
}
.mobile-account-links p {
  flex-basis: 100%;
  overflow-wrap: anywhere;
  color: var(--text-tertiary);
  font-size: 12px;
}
.mobile-account-links a {
  color: var(--text-secondary);
}
.mobile-account-links button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
}
.mobile-primary-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.mobile-primary-actions > a {
  flex: 1;
}
.mobile-login-link {
  display: grid;
  place-items: center;
  min-height: 44px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}
@media (max-width: 1100px) {
  .public-bar {
    gap: 20px;
    padding: 0 28px;
    grid-template-columns: minmax(230px, 1fr) auto minmax(230px, 1fr);
  }
  .public-bar :deep(.brand-logo span) {
    font-size: 18px;
  }
  .public-navigation {
    gap: 12px;
  }
  .public-actions {
    gap: 10px;
  }
}
@media (max-width: 760px) {
  .public-bar {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    min-height: 72px;
    padding: 0 20px;
  }
  .public-bar :deep(.brand-logo) {
    gap: 9px;
  }
  .public-bar :deep(.brand-logo img) {
    width: 34px;
    height: 34px;
  }
  .public-bar :deep(.brand-logo span) {
    font-size: 17px;
    letter-spacing: -0.5px;
  }
  .public-navigation,
  .header-action-divider,
  .public-actions > .header-console-link,
  .header-account,
  .header-login-link {
    display: none;
  }
  .public-actions {
    gap: 4px;
  }
  .public-menu-toggle {
    display: grid;
  }
  .header-icon-button {
    width: 34px;
    height: 38px;
  }
}
@media (max-width: 360px) {
  .public-bar {
    padding: 0 12px;
  }
  .public-bar :deep(.brand-logo span) {
    font-size: 15px;
  }
}
</style>
