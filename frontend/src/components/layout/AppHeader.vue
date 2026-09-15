<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import BrandLogo from './BrandLogo.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ElMessage } from 'element-plus'
import { usePublicSettings } from '@/composables/usePublicSettings'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const publicSettings = usePublicSettings()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)

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
  router.push('/profile/overview')
}

const goToAdmin = () => {
  router.push('/admin/dashboard')
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

onMounted(() => {
  void publicSettings.load().catch(() => undefined)
})
</script>

<template>
  <header class="app-header">
    <div class="public-bar">
      <BrandLogo />
      <nav class="public-navigation" aria-label="前台导航">
        <router-link to="/" exact-active-class="is-active">首页</router-link>
        <router-link to="/pricing" active-class="is-active">价格</router-link>
      </nav>
      <div class="public-actions">
        <button
          class="header-theme-button"
          :aria-label="`切换主题，当前为${themeDisplayName}`"
          :title="`切换主题，当前为${themeDisplayName}`"
          @click="toggleTheme"
        >
          <font-awesome-icon :icon="themeIcon" />
        </button>
        <router-link to="/profile" class="header-console-link">控制台</router-link>
        <el-dropdown v-if="isLoggedIn" @command="handleCommand">
          <button type="button" class="user-menu-trigger" aria-label="打开用户菜单">
            <span class="header-avatar"><font-awesome-icon icon="user" /></span
            ><span class="header-user-email">{{ user?.email }}</span
            ><font-awesome-icon icon="chevron-down" class="header-user-chevron" />
          </button>
          <template #dropdown
            ><el-dropdown-menu>
              <el-dropdown-item command="profile"
                ><font-awesome-icon icon="user" class="mr-2" />个人中心</el-dropdown-item
              >
              <el-dropdown-item v-if="user?.role === 'admin'" command="admin"
                ><font-awesome-icon icon="cog" class="mr-2" />管理后台</el-dropdown-item
              >
              <el-dropdown-item divided command="logout"
                ><font-awesome-icon icon="sign-out-alt" class="mr-2" />退出登录</el-dropdown-item
              >
            </el-dropdown-menu></template
          >
        </el-dropdown>
        <router-link v-else to="/login" class="header-login-link">登录</router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.public-bar {
  display: flex;
  align-items: center;
  gap: 40px;
  max-width: 1500px;
  min-height: 72px;
  margin: auto;
  padding: 12px 32px;
}
.public-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
}
.public-navigation a {
  padding: 8px 14px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 550;
}
.public-navigation a:hover,
.public-navigation .is-active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.public-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.header-console-link {
  padding: 8px 13px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 7px;
}
.header-console-link:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.header-theme-button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  color: var(--text-secondary);
  background: transparent;
}
.header-theme-button:hover {
  background: var(--surface-muted);
}
.header-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.header-user-email {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}
.header-user-chevron {
  width: 10px;
}
.header-login-link {
  padding: 8px 15px;
  border-radius: 8px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-size: 14px;
}
@media (max-width: 1100px) {
  .header-user-email {
    display: none;
  }
  .public-bar {
    gap: 24px;
  }
}
@media (max-width: 700px) {
  .public-bar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 16px;
  }
  .public-bar > .brand-logo {
    flex-basis: 100%;
  }
  .public-navigation {
    display: flex;
  }
  .public-navigation a {
    padding: 7px 10px;
  }
  .public-actions {
    gap: 6px;
  }
  .user-menu-trigger {
    padding: 0;
  }
  .header-user-chevron {
    display: none;
  }
  .header-console-link {
    padding: 7px 10px;
  }
}
</style>
