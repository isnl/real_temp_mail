import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 用户端路由 - 使用 UserLayout
    {
      path: '/',
      component: () => import('@/components/layout/UserLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { requiresGuest: true },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
          meta: { requiresGuest: true },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/email/DashboardView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'features',
          name: 'features',
          component: () => import('@/views/FeaturesView.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue'),
        },
        {
          path: 'terms',
          name: 'terms',
          component: () => import('@/views/TermsView.vue'),
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('@/views/PrivacyView.vue'),
        },
      ],
    },
    {
      path: '/profile',
      component: () => import('@/components/layout/ProfileLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/profile/overview',
        },
        {
          path: 'overview',
          name: 'profile-overview',
          component: () => import('@/views/profile/OverviewView.vue'),
        },
        {
          path: 'settings',
          name: 'profile-settings',
          component: () => import('@/views/profile/SettingsView.vue'),
        },
        {
          path: 'quota',
          name: 'profile-quota',
          component: () => import('@/views/profile/QuotaView.vue'),
        },
        {
          path: 'checkin',
          name: 'profile-checkin',
          component: () => import('@/views/profile/CheckinView.vue'),
        },
        {
          path: 'security',
          name: 'profile-security',
          component: () => import('@/views/profile/SecurityView.vue'),
        },
      ],
    },
    // 管理后台路由 - 使用 AdminLayout
    {
      path: '/admin',
      component: () => import('@/components/layout/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/dashboard',
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UsersView.vue'),
        },
        {
          path: 'domains',
          name: 'admin-domains',
          component: () => import('@/views/admin/DomainsView.vue'),
        },
        {
          path: 'emails',
          name: 'admin-emails',
          component: () => import('@/views/admin/EmailsView.vue'),
        },
        {
          path: 'logs',
          name: 'admin-logs',
          component: () => import('@/views/admin/LogsView.vue'),
        },
        {
          path: 'redeem-codes',
          name: 'admin-redeem-codes',
          component: () => import('@/views/admin/RedeemCodesView.vue'),
        },
        {
          path: 'quota-logs',
          name: 'admin-quota-logs',
          component: () => import('@/views/admin/QuotaLogsView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/SettingsView.vue'),
        },
      ],
    },
    // 404 页面 - 使用 UserLayout
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/components/layout/UserLayout.vue'),
      children: [
        {
          path: '',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'dashboard' })
    return
  }

  // 检查是否需要游客状态（已登录用户不能访问登录/注册页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
