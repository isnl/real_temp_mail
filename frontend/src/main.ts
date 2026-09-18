import 'normalize.css'
import 'uno.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { VueQueryPlugin } from '@tanstack/vue-query'

// SFC 内的 Element Plus 组件由构建插件按路由自动导入；入口只保留
// 全局指令、编程式反馈样式与中文 locale，避免后台组件进入公共首包。
import { ElLoading, provideGlobalConfig } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/main.css'
import './assets/responsive.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowTrendUp,
  faAt,
  faBars,
  faBolt,
  faBrain,
  faBullhorn,
  faCalendarCheck,
  faCalendarDay,
  faCalendarMinus,
  faCalendarPlus,
  faChartBar,
  faChartPie,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircle,
  faCircleExclamation,
  faCircleHalfStroke,
  faClock,
  faClockRotateLeft,
  faCloudArrowDown,
  faCode,
  faCodeBranch,
  faCog,
  faCoins,
  faCopy,
  faDice,
  faDownload,
  faEdit,
  faEllipsis,
  faEnvelope,
  faEnvelopeOpen,
  faEnvelopeOpenText,
  faExclamationTriangle,
  faEye,
  faEyeSlash,
  faFileAlt,
  faGift,
  faGlobe,
  faHeart,
  faHome,
  faInbox,
  faInfoCircle,
  faKey,
  faLayerGroup,
  faLink,
  faList,
  faLock,
  faMagic,
  faMinus,
  faMinusCircle,
  faMobileAlt,
  faMoon,
  faPause,
  faPlay,
  faPlus,
  faPlusCircle,
  faQuestionCircle,
  faRefresh,
  faRocket,
  faRotate,
  faSearch,
  faShare,
  faShareNodes,
  faShieldAlt,
  faSignInAlt,
  faSignOutAlt,
  faSliders,
  faSun,
  faTachometerAlt,
  faTag,
  faTicket,
  faTicketAlt,
  faTrash,
  faUndo,
  faUser,
  faUserCheck,
  faUserClock,
  faUserCog,
  faUserLock,
  faUserPlus,
  faUserShield,
  faUsers,
  faUsersGear,
  faVial,
} from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

import App from './App.vue'
import router from './router'

library.add(
  faArrowTrendUp,
  faAt,
  faBars,
  faBolt,
  faBrain,
  faBullhorn,
  faCalendarCheck,
  faCalendarDay,
  faCalendarMinus,
  faCalendarPlus,
  faChartBar,
  faChartPie,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircle,
  faCircleExclamation,
  faCircleHalfStroke,
  faClock,
  faClockRotateLeft,
  faCloudArrowDown,
  faCode,
  faCodeBranch,
  faCog,
  faCoins,
  faCopy,
  faDice,
  faDownload,
  faEdit,
  faEllipsis,
  faEnvelope,
  faEnvelopeOpen,
  faEnvelopeOpenText,
  faExclamationTriangle,
  faEye,
  faEyeSlash,
  faFileAlt,
  faGift,
  faGithub,
  faGlobe,
  faHeart,
  faHome,
  faInbox,
  faInfoCircle,
  faKey,
  faLayerGroup,
  faLink,
  faList,
  faLock,
  faMagic,
  faMinus,
  faMinusCircle,
  faMobileAlt,
  faMoon,
  faPause,
  faPlay,
  faPlus,
  faPlusCircle,
  faQuestionCircle,
  faRefresh,
  faRocket,
  faRotate,
  faSearch,
  faShare,
  faShareNodes,
  faShieldAlt,
  faSignInAlt,
  faSignOutAlt,
  faSliders,
  faSun,
  faTachometerAlt,
  faTag,
  faTicket,
  faTicketAlt,
  faTrash,
  faUndo,
  faUser,
  faUserCheck,
  faUserClock,
  faUserCog,
  faUserLock,
  faUserPlus,
  faUserShield,
  faUsers,
  faUsersGear,
  faVial,
)

const app = createApp(App)

// 配置Pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)

// 配置 Vue Query
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5分钟
        gcTime: 1000 * 60 * 10, // 10分钟 (新版本用 gcTime 替代 cacheTime)
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  }
})

app.directive('loading', ElLoading.directive)
provideGlobalConfig({ locale: zhCn }, app, true)

// 注册FontAwesome组件
app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')
