---
type: "always_apply"
---

# 临时邮箱系统编码规范

## 一、项目架构规范

### 前端技术栈
- **Vue 3** + **Composition API** + **TypeScript**
- **Vite** 构建工具
- **UnoCSS** 原子化CSS框架（优先使用）
- **Element Plus** UI组件库
- **Pinia** 状态管理 + 持久化插件
- **FontAwesome** 图标库
- **VueUse** 工具库

### 后端技术栈
- **Cloudflare Workers** + **TypeScript**
- **D1 数据库** (SQLite兼容)
- **Email Routing** 邮件路由
- **Turnstile** 人机验证

## 二、前端编码规范

### 2.1 Vite 配置规范

#### 路径别名配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/views': resolve(__dirname, 'src/views'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/api': resolve(__dirname, 'src/api'),
      '@/assets': resolve(__dirname, 'src/assets')
    }
  }
})
```

### 2.2 Vue 组件规范

#### 组件结构顺序（强制）
```vue
<script lang="ts" setup>
// 1. script 标签必须位于最顶部
// 2. 导入语句
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 3. 类型定义
interface Props {
  title: string
  count?: number
}

// 4. Props 和 Emits
const props = defineProps<Props>()
const emit = defineEmits<{
  submit: [data: FormData]
}>()

// 5. 响应式数据
const isLoading = ref(false)

// 6. 计算属性
const displayTitle = computed(() => props.title.toUpperCase())

// 7. 方法
const handleSubmit = () => {
  // 处理逻辑
}

// 8. 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <!-- 2. template 标签位于 script 之后 -->
  <div class="container">
    <!-- 组件内容 -->
  </div>
</template>

<style scoped>
/* 3. style 标签位于最底部（仅在必要时使用） */
/* 优先使用 UnoCSS，实在不行再写 CSS */
</style>
```

#### 组件代码量限制
- **单个组件不超过 300 行**（Vue 官方最佳实践）
- 超过 300 行时必须拆分为多个子组件
- 复杂逻辑抽取为 Composables

### 2.3 样式规范

#### UnoCSS 优先原则（强制）
```vue
<template>
  <!-- ✅ 优先使用 UnoCSS 原子化类 -->
  <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">标题</h2>
    <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
      按钮
    </button>
  </div>
  
  <!-- ❌ 避免直接写 CSS，除非 UnoCSS 无法实现 -->
</template>

<style scoped>
/* 仅在 UnoCSS 无法实现时才写 CSS */
.custom-animation {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
```

#### UnoCSS 配置规范
```typescript
// uno.config.ts
import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify()
  ],
  darkMode: 'class',
  shortcuts: {
    // 定义常用样式快捷方式
    'btn-primary': 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors',
    'card-base': 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md',
    'text-base': 'text-gray-900 dark:text-gray-100',
    'bg-base': 'bg-white dark:bg-gray-900'
  }
})
```

### 2.4 TypeScript 规范

#### 类型定义
```typescript
// types/index.ts
export interface User {
  id: number
  email: string
  role: 'user' | 'admin'
  quota: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TempEmail {
  id: number
  userId: number
  email: string
  domainId: number
  createdAt: string
  active: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
```

#### 组件 Props 类型
```typescript
// 使用 interface 定义 Props
interface EmailItemProps {
  email: TempEmail
  showActions?: boolean
  onDelete?: (id: number) => void
}

const props = withDefaults(defineProps<EmailItemProps>(), {
  showActions: true
})
```

### 2.5 Pinia 状态管理规范

#### Store 结构
```typescript
// stores/auth.ts
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: '',
    refreshToken: '',
    isAuthenticated: false
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    userEmail: (state) => state.user?.email || ''
  },

  actions: {
    async login(email: string, password: string) {
      try {
        const response = await authApi.login({ email, password })
        this.setTokens(response.data)
        this.user = response.data.user
        this.isAuthenticated = true
      } catch (error) {
        throw new Error('登录失败')
      }
    },

    setTokens(tokens: { accessToken: string; refreshToken: string }) {
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
    },

    logout() {
      this.user = null
      this.accessToken = ''
      this.refreshToken = ''
      this.isAuthenticated = false
    }
  },

  persist: {
    key: 'auth-store',
    storage: localStorage,
    paths: ['accessToken', 'refreshToken', 'user']
  }
})
```

## 三、后端编码规范

### 3.1 项目结构
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   └── types.ts
│   ├── email/
│   │   ├── email.service.ts
│   │   ├── parser.service.ts
│   │   └── types.ts
│   └── shared/
│       ├── database.service.ts
│       ├── utils.ts
│       └── types.ts
├── handlers/
├── middleware/
└── index.ts
```

### 3.2 TypeScript 模块化设计
```typescript
// modules/auth/types.ts
export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  turnstileToken: string
}

export interface LoginRequest {
  email: string
  password: string
  turnstileToken: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}
```

### 3.3 错误处理规范
```typescript
// shared/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, 'AUTH_ERROR')
  }
}
```

## 四、命名规范

### 4.1 文件命名
- **组件文件**: PascalCase (UserProfile.vue)
- **页面文件**: PascalCase (LoginPage.vue)
- **工具文件**: camelCase (dateUtils.ts)
- **Store文件**: camelCase (authStore.ts)
- **类型文件**: camelCase (userTypes.ts)

### 4.2 变量命名
- **变量/函数**: camelCase (userName, getUserInfo)
- **常量**: UPPER_SNAKE_CASE (API_BASE_URL)
- **类名**: PascalCase (EmailService)
- **接口**: PascalCase (UserInterface)

### 4.3 CSS 类命名
- **UnoCSS**: 使用原子化类名
- **自定义CSS**: kebab-case (email-item, user-profile)

## 五、代码质量规范

### 5.1 注释规范
```typescript
/**
 * 创建临时邮箱
 * @param userId 用户ID
 * @param domainId 域名ID
 * @returns 临时邮箱信息
 * @throws {ValidationError} 当配额不足时抛出
 */
async function createTempEmail(userId: number, domainId: number): Promise<TempEmail> {
  // 实现逻辑
}
```

### 5.2 函数规范
- 单个函数不超过 50 行
- 函数职责单一
- 参数不超过 5 个，超过时使用对象参数

### 5.3 导入规范
```typescript
// 1. Node.js 内置模块
import { resolve } from 'path'

// 2. 第三方库
import { defineConfig } from 'vite'
import { ref, computed } from 'vue'

// 3. 项目内部模块（使用别名）
import { useAuthStore } from '@/stores/auth'
import { UserService } from '@/services/user'
import type { User } from '@/types'
```

## 六、安全规范

### 6.1 API 安全
- 所有敏感接口必须使用 Turnstile 验证
- 实施 API 限流
- JWT Token 双重验证机制
- 输入验证和 SQL 注入防护

## 其他

合理利用 Context 7 获取相关技术最新文档、合理利用Playwright查看页面内容以便于更好的调试


**注意**: 此编码规范基于项目需求文档制定，所有开发人员必须严格遵守。
