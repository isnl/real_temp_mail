import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const baseTitle = '临时邮箱系统'

// 页面标题映射
const pageTitleMap: Record<string, string> = {
  // 主要页面
  'home': '首页',
  'features': '功能特色',
  'about': '关于我们',
  'terms': '服务条款',
  'privacy': '隐私政策',
  'not-found': '页面未找到',
  
  // 认证页面
  'login': '用户登录',
  'register': '用户注册',
  
  // 邮箱管理
  'dashboard': '邮箱管理',
  
  // 个人中心
  'profile-overview': '个人概览',
  'profile-quota': '配额管理',
  'profile-checkin': '每日签到',
  'profile-security': '安全设置',
  
  // 管理后台
  'admin-dashboard': '管理后台',
  'admin-users': '用户管理',
  'admin-domains': '域名管理',
  'admin-emails': '邮件管理',
  'admin-logs': '日志审计',
  'admin-redeem-codes': '兑换码管理',
  'admin-quota-logs': '配额日志',
  'admin-settings': '系统设置'
}

export function usePageTitle(customTitle?: string) {
  const route = useRoute()
  const currentTitle = ref('')

  const updateTitle = (title?: string) => {
    if (title) {
      currentTitle.value = `${title} - ${baseTitle}`
    } else {
      const routeName = route.name as string
      const pageTitle = pageTitleMap[routeName] || '未知页面'
      currentTitle.value = `${pageTitle} - ${baseTitle}`
    }
    
    // 更新document.title
    if (typeof document !== 'undefined') {
      document.title = currentTitle.value
    }
  }

  // 监听路由变化
  const stopWatcher = watch(
    () => route.name,
    () => {
      if (!customTitle) {
        updateTitle()
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    updateTitle(customTitle)
  })

  onUnmounted(() => {
    stopWatcher()
  })

  return {
    currentTitle,
    updateTitle,
    setTitle: (title: string) => updateTitle(title)
  }
}

// 导出页面标题映射，供其他地方使用
export { pageTitleMap, baseTitle }
