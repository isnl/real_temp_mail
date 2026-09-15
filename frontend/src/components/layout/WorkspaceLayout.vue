<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import BrandLogo from './BrandLogo.vue'
import '@/assets/workspace.css'

const props = defineProps<{
  area: 'admin' | 'profile'
  items: { path: string; title: string; icon: string }[]
}>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const isMobile = useMediaQuery('(max-width: 900px)')
const collapsed = ref(false)
const mobileOpen = ref(false)
const isCollapsed = computed(() => !isMobile.value && collapsed.value)
const activePath = computed(
  () =>
    props.items.find((item) => route.path.replace(/\/$/, '') === item.path)?.path ||
    props.items[0]?.path,
)
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
watch(isMobile, () => {
  mobileOpen.value = false
})
const toggleSidebar = () => {
  if (isMobile.value) mobileOpen.value = !mobileOpen.value
  else collapsed.value = !collapsed.value
}
const logout = async () => {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div :id="`${area}-layout`" class="workspace-shell" :class="{ 'is-collapsed': isCollapsed }">
    <button
      v-if="isMobile && mobileOpen"
      class="workspace-backdrop"
      aria-label="关闭菜单"
      @click="mobileOpen = false"
    />
    <aside
      class="workspace-sidebar"
      :class="{ 'mobile-open': mobileOpen }"
      :aria-label="area === 'admin' ? '管理后台导航' : '个人中心导航'"
      :aria-hidden="isMobile && !mobileOpen"
      :inert="isMobile && !mobileOpen ? true : undefined"
    >
      <div class="workspace-brand-row">
        <BrandLogo v-if="!isCollapsed" />
        <button
          class="workspace-icon-button sidebar-collapse-button"
          :aria-label="isMobile ? '关闭菜单' : isCollapsed ? '展开侧边栏' : '收起侧边栏'"
          :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <font-awesome-icon :icon="isCollapsed ? 'chevron-right' : 'chevron-left'" />
        </button>
      </div>
      <nav class="workspace-navigation">
        <router-link
          v-for="item in items"
          :key="item.path"
          :to="item.path"
          class="workspace-menu-item"
          :class="{ 'is-active': activePath === item.path }"
          :aria-current="activePath === item.path ? 'page' : undefined"
          :aria-label="item.title"
          :title="isCollapsed ? item.title : undefined"
        >
          <font-awesome-icon :icon="item.icon" /><span v-if="!isCollapsed">{{ item.title }}</span>
        </router-link>
      </nav>
      <div class="workspace-sidebar-footer">
        <router-link
          v-if="area === 'profile' && auth.isAdmin"
          to="/admin/dashboard"
          class="workspace-menu-item"
          aria-label="管理后台"
          :title="isCollapsed ? '管理后台' : undefined"
          ><font-awesome-icon icon="shield-alt" /><span v-if="!isCollapsed"
            >管理后台</span
          ></router-link
        >
        <router-link
          v-if="area === 'admin'"
          to="/profile"
          class="workspace-menu-item"
          aria-label="个人中心"
          :title="isCollapsed ? '个人中心' : undefined"
          ><font-awesome-icon icon="user" /><span v-if="!isCollapsed">个人中心</span></router-link
        >
        <button
          class="workspace-menu-item"
          :aria-label="theme.isDark ? '切换亮色模式' : '切换暗色模式'"
          @click="theme.toggleTheme"
        >
          <font-awesome-icon :icon="theme.isDark ? 'sun' : 'moon'" /><span v-if="!isCollapsed">{{
            theme.isDark ? '亮色模式' : '暗色模式'
          }}</span>
        </button>
        <div class="workspace-account">
          <span v-if="!isCollapsed" class="workspace-avatar"
            ><font-awesome-icon icon="user"
          /></span>
          <div v-if="!isCollapsed" class="workspace-account-copy">
            <span>{{ auth.user?.email }}</span
            ><small>{{ auth.isAdmin ? '管理员' : '普通用户' }}</small>
          </div>
          <button
            class="workspace-icon-button"
            aria-label="退出登录"
            title="退出登录"
            @click="logout"
          >
            <font-awesome-icon icon="sign-out-alt" />
          </button>
        </div>
      </div>
    </aside>
    <div class="workspace-content">
      <div v-if="isMobile" class="workspace-mobile-bar">
        <button
          class="workspace-icon-button"
          aria-label="打开菜单"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = true"
        >
          <font-awesome-icon icon="bars" /></button
        ><BrandLogo />
      </div>
      <main id="main-content" tabindex="-1">
        <div class="workspace-page"><router-view /></div>
      </main>
    </div>
  </div>
</template>
