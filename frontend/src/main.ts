import 'normalize.css'
import './assets/main.css'
import 'uno.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faEnvelope,
  faTrash,
  faCopy,
  faSun,
  faMoon,
  faCircleHalfStroke,
  faUser,
  faSignOutAlt,
  faCog,
  faPlus,
  faRefresh,
  faEye,
  faEyeSlash,
  faSearch,
  faFilter,
  faBars,
  faTimes,
  faUserPlus,
  faSignInAlt,
  faTachometerAlt,
  faShieldAlt,
  faClock,
  faGlobe,
  faCode,
  faTrashAlt,
  faMobileAlt,
  faGift,
  faCheckCircle,
  faExclamationTriangle,
  faInbox,
  faEnvelopeOpen,
  faKey,
  faChevronDown,
  faUsers,
  faFileAlt,
  faTicketAlt,
  faChevronLeft,
  faChevronRight,
  faArrowLeft,
  faDownload,
  faShare,
  faEdit
} from '@fortawesome/free-solid-svg-icons'

import App from './App.vue'
import router from './router'

// 添加图标到库
library.add(
  faEnvelope,
  faTrash,
  faCopy,
  faSun,
  faMoon,
  faCircleHalfStroke,
  faUser,
  faSignOutAlt,
  faCog,
  faPlus,
  faRefresh,
  faEye,
  faEyeSlash,
  faSearch,
  faFilter,
  faBars,
  faTimes,
  faUserPlus,
  faSignInAlt,
  faTachometerAlt,
  faShieldAlt,
  faClock,
  faGlobe,
  faCode,
  faTrashAlt,
  faMobileAlt,
  faGift,
  faCheckCircle,
  faExclamationTriangle,
  faInbox,
  faEnvelopeOpen,
  faKey,
  faChevronDown,
  faUsers,
  faFileAlt,
  faTicketAlt,
  faChevronLeft,
  faChevronRight,
  faArrowLeft,
  faDownload,
  faShare,
  faEdit
)

const app = createApp(App)

// 配置Pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册FontAwesome组件
app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')
