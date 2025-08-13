<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { RegisterRequest } from '@/types'
import { usePageTitle } from '@/composables/usePageTitle'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

// 设置页面标题
usePageTitle()

const router = useRouter()
const authStore = useAuthStore()
const turnstile = useTurnstile()

// 注册步骤：1-邮箱输入，2-验证码和密码输入
const currentStep = ref(1)
const registerFormRef = ref<FormInstance>()
const emailFormRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const loading = ref(false)
const sendingCode = ref(false)
const codeExpiresAt = ref<Date | null>(null)
const countdown = ref(0)

// 邮箱表单
const emailForm = reactive({
  email: '',
  turnstileToken: ''
})

// 注册表单
const registerForm = reactive<RegisterRequest>({
  email: '',
  password: '',
  confirmPassword: '',
  turnstileToken: '',
  verificationCode: ''
})

// 倒计时显示
const countdownText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}秒后可重新发送`
  }
  return '重新发送验证码'
})

// 启动倒计时
const startCountdown = (seconds: number) => {
  countdown.value = seconds
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!emailFormRef.value) return

  const valid = await emailFormRef.value.validate().catch(() => false)
  if (!valid) return

  // 检查 Turnstile 验证
  if (!turnstile.isVerified.value) {
    ElMessage.warning('请完成人机验证')
    return
  }

  sendingCode.value = true

  try {
    const response = await authApi.sendVerificationCode({
      email: emailForm.email,
      turnstileToken: turnstile.turnstileToken.value
    })

    if (response.success && response.data) {
      ElMessage.success('验证码已发送到您的邮箱，请查收')
      codeExpiresAt.value = new Date(response.data.expiresAt)
      
      // 复制邮箱到注册表单
      registerForm.email = emailForm.email
      
      // 进入下一步
      currentStep.value = 2
      
      // 启动60秒倒计时
      startCountdown(60)
    } else {
      ElMessage.error(response.message || '发送验证码失败')
    }
  } catch (error: any) {
    console.error('Send verification code error:', error)
    ElMessage.error(error.message || '发送验证码失败')
  } finally {
    sendingCode.value = false
    // 重置 Turnstile
    turnstileRef.value?.reset()
    turnstile.reset()
  }
}

// 返回上一步
const goBackToEmailStep = () => {
  currentStep.value = 1
  countdown.value = 0
  codeExpiresAt.value = null
  registerForm.verificationCode = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 邮箱表单验证规则
const emailRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const registerRules: FormRules = {
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    { max: 128, message: '密码长度不能超过128位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async (formEl: FormInstance | undefined) => {
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
    registerForm.turnstileToken = turnstile.turnstileToken.value

    await authStore.register(registerForm)
    ElMessage.success('注册成功，欢迎使用临时邮箱服务！')

    // 跳转到仪表板
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Register error:', error)
    ElMessage.error(error.message || '注册失败')

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
  registerForm.turnstileToken = token
}

// 处理 Turnstile 验证失败
const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
  registerForm.turnstileToken = ''
}

const goToLogin = () => {
  router.push('/login')
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
          创建账户
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          注册即可免费获得5个临时邮箱配额
        </p>
      </div>

      <!-- 步骤指示器 -->
      <div class="flex justify-center">
        <el-steps :active="currentStep - 1" finish-status="success" simple>
          <el-step title="邮箱验证" />
          <el-step title="设置密码" />
        </el-steps>
      </div>

      <!-- 步骤1：邮箱输入和验证码发送 -->
      <div v-if="currentStep === 1" class="card-base p-8">
        <div class="text-center mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            验证您的邮箱地址
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            我们将向您的邮箱发送验证码
          </p>
        </div>

        <el-form
          ref="emailFormRef"
          :model="emailForm"
          :rules="emailRules"
          label-position="top"
          size="large"
          @submit.prevent="sendVerificationCode"
        >
          <el-form-item label="邮箱地址" prop="email">
            <el-input
              v-model="emailForm.email"
              type="email"
              placeholder="请输入邮箱地址"
              :prefix-icon="ElIconMessage"
              autocomplete="email"
            />
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              用于接收验证码和重要通知
            </div>
          </el-form-item>

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

              <!-- 仅显示错误信息 -->
              <div v-if="turnstile.error.value" class="text-red-500 text-sm mt-2">
                <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="mr-1" />
                {{ turnstile.error.value }}
              </div>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="sendingCode"
              :disabled="!turnstile.isVerified.value || sendingCode"
              @click="sendVerificationCode"
              class="w-full"
            >
              <font-awesome-icon 
                v-if="!sendingCode" 
                :icon="['fas', 'paper-plane']" 
                class="mr-2" 
              />
              <span v-if="!sendingCode">发送验证码</span>
              <span v-else>发送中...</span>
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤2：验证码和密码输入 -->
      <div v-if="currentStep === 2" class="card-base p-8">
        <div class="text-center mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            输入验证码和设置密码
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            验证码已发送至 <span class="font-medium">{{ registerForm.email }}</span>
          </p>
        </div>

        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="top"
          size="large"
          @submit.prevent="handleRegister(registerFormRef)"
        >
          <el-form-item label="邮箱验证码" prop="verificationCode">
            <el-input
              v-model="registerForm.verificationCode"
              placeholder="请输入6位验证码"
              :prefix-icon="ElIconKey"
              maxlength="6"
              show-word-limit
            />
            <div class="flex justify-between items-center mt-2">
              <div class="text-xs text-gray-500 dark:text-gray-400">
                请查收邮箱中的验证码
              </div>
              <el-button
                type="primary"
                link
                size="small"
                :disabled="countdown > 0"
                @click="goBackToEmailStep"
              >
                {{ countdownText }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码（至少6位）"
              :prefix-icon="ElIconLock"
              autocomplete="new-password"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              :prefix-icon="ElIconLock"
              autocomplete="new-password"
              show-password
            />
          </el-form-item>

          <!-- Terms and Privacy -->
          <div class="mb-6">
            <el-checkbox required>
              我已阅读并同意
              <router-link
                to="/terms"
                class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                服务条款
              </router-link>
              和
              <router-link
                to="/privacy"
                class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                隐私政策
              </router-link>
            </el-checkbox>
          </div>

          <div class="flex gap-3">
            <el-button
              size="large"
              @click="goBackToEmailStep"
              class="flex-1"
            >
              <font-awesome-icon :icon="['fas', 'arrow-left']" class="mr-2" />
              返回上一步
            </el-button>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              :disabled="loading"
              @click="handleRegister(registerFormRef)"
              class="flex-1"
            >
              <font-awesome-icon 
                v-if="!loading" 
                :icon="['fas', 'user-plus']" 
                class="mr-2" 
              />
              <span v-if="!loading">创建账户</span>
              <span v-else>注册中...</span>
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- Login Link -->
      <div class="text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          已有账户？
          <el-button
            @click="goToLogin"
            type="primary"
            link
            class="font-medium"
          >
            立即登录
          </el-button>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Message as ElIconMessage, Lock as ElIconLock, Key as ElIconKey } from '@element-plus/icons-vue'

export default {
  components: {
    ElIconMessage,
    ElIconLock,
    ElIconKey
  }
}
</script>
