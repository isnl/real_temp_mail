<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { LoginRequest } from '@/types'
import { usePageTitle } from '@/composables/usePageTitle'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

// 设置页面标题
usePageTitle()

const router = useRouter()
const authStore = useAuthStore()
const turnstile = useTurnstile()

const loginFormRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const loading = ref(false)

const loginForm = reactive<LoginRequest>({
  email: '',
  password: '',
  turnstileToken: ''
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return

  const valid = await formEl.validate().catch(() => false)
  if (!valid) return

  // 检查 Turnstile 验证
  if (!turnstile.isVerified.value) {
    ElMessage.warning('请完成人机验证')
    return
  }

  loading.value = true

  try {
    // 设置 Turnstile token
    loginForm.turnstileToken = turnstile.turnstileToken.value

    await authStore.login(loginForm)
    ElMessage.success('登录成功')

    // 跳转到仪表板或之前访问的页面
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/dashboard')
  } catch (error: any) {
    console.error('Login error:', error)
    ElMessage.error(error.message || '登录失败')

    // 重置 Turnstile
    turnstileRef.value?.reset()
    turnstile.reset()
  } finally {
    loading.value = false
  }
}

// 处理 Turnstile 验证成功
const handleTurnstileSuccess = (token: string) => {
  turnstile.handleSuccess(token)
  loginForm.turnstileToken = token
}

// 处理 Turnstile 验证失败
const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
  loginForm.turnstileToken = ''
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-4 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full flex flex-col gap-8">
      <!-- Header -->
      <div class="text-center">
        <div class="flex justify-center">
          <font-awesome-icon 
            :icon="['fas', 'envelope']" 
            class="text-6xl text-blue-500 dark:text-blue-400"
          />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
          登录账户
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          使用您的邮箱和密码登录
        </p>
      </div>

      <!-- Login Form -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-8">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent="handleLogin(loginFormRef)"
        >
          <el-form-item label="邮箱地址" prop="email">
            <el-input
              v-model="loginForm.email"
              type="email"
              placeholder="请输入邮箱地址"
              :prefix-icon="ElIconMessage"
              autocomplete="email"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="ElIconLock"
              autocomplete="current-password"
              show-password
            />
          </el-form-item>

          <div class="flex items-center justify-between mb-6">
            <el-checkbox>记住我</el-checkbox>
            <router-link
              to="/forgot-password"
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              忘记密码？
            </router-link>
          </div>

          <!-- Turnstile 人机验证 -->
          <el-form-item label="人机验证" required>
            <div class="w-full">
              <TurnstileWidget
                ref="turnstileRef"
                :site-key="turnstile.siteKey"
                :theme="turnstile.theme.value"
                @success="handleTurnstileSuccess"
                @error="handleTurnstileError"
                @expired="turnstile.handleExpired"
                @timeout="turnstile.handleTimeout"
                @before-interactive="turnstile.handleBeforeInteractive"
                @after-interactive="turnstile.handleAfterInteractive"
                @unsupported="turnstile.handleUnsupported"
              />

              <!-- 验证状态显示 -->
              <div class="mt-2">
                <div v-if="turnstile.isLoading.value" class="text-blue-500 text-sm">
                  <i class="fas fa-spinner fa-spin mr-1"></i>
                  正在加载人机验证...
                </div>
                <div v-else-if="turnstile.isVerified.value" class="text-green-500 text-sm">
                  <i class="fas fa-check-circle mr-1"></i>
                  人机验证已完成
                </div>
                <div v-else class="text-gray-500 text-sm">
                  <i class="fas fa-shield-alt mr-1"></i>
                  请完成人机验证
                </div>
              </div>

              <!-- 错误信息显示 -->
              <div v-if="turnstile.error.value" class="text-red-500 text-sm mt-2">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                {{ turnstile.error.value }}
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin(loginFormRef)"
              class="w-full"
            >
              <span v-if="!loading">登录</span>
              <span v-else>登录中...</span>
            </el-button>
          </el-form-item>
        </el-form>

        <!-- Register Link -->
        <div class="text-center mt-6">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            还没有账户？
            <el-button
              @click="goToRegister"
              type="primary"
              link
              class="font-medium"
            >
              立即注册
            </el-button>
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          安全 • 快速 • 免费的临时邮箱服务
        </p>
        <div class="flex justify-center space-x-6 mt-4">
          <div class="flex items-center space-x-1">
            <font-awesome-icon 
              :icon="['fas', 'shield-alt']" 
              class="text-green-500 text-sm"
            />
            <span class="text-xs text-gray-600 dark:text-gray-400">安全加密</span>
          </div>
          <div class="flex items-center space-x-1">
            <font-awesome-icon 
              :icon="['fas', 'clock']" 
              class="text-blue-500 text-sm"
            />
            <span class="text-xs text-gray-600 dark:text-gray-400">实时接收</span>
          </div>
          <div class="flex items-center space-x-1">
            <font-awesome-icon 
              :icon="['fas', 'globe']" 
              class="text-purple-500 text-sm"
            />
            <span class="text-xs text-gray-600 dark:text-gray-400">多域名支持</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Message as ElIconMessage, Lock as ElIconLock } from '@element-plus/icons-vue'

export default {
  components: {
    ElIconMessage,
    ElIconLock
  }
}
</script>
