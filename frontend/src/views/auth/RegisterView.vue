<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { RegisterRequest } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const registerForm = reactive<RegisterRequest>({
  email: '',
  password: '',
  confirmPassword: '',
  turnstileToken: 'dev-token' // 开发环境使用假token
})

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
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

  loading.value = true
  
  try {
    await authStore.register(registerForm)
    ElMessage.success('注册成功，欢迎使用临时邮箱服务！')
    
    // 跳转到仪表板
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Register error:', error)
    ElMessage.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
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

      <!-- Register Form -->
      <div class="card-base p-8">
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent="handleRegister(registerFormRef)"
        >
          <el-form-item label="邮箱地址" prop="email">
            <el-input
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱地址"
              :prefix-icon="ElIconMessage"
              autocomplete="email"
            />
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              用于接收重要通知和密码重置
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

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleRegister(registerFormRef)"
              class="w-full"
            >
              <span v-if="!loading">创建账户</span>
              <span v-else>注册中...</span>
            </el-button>
          </el-form-item>
        </el-form>

        <!-- Login Link -->
        <div class="text-center mt-6">
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

      <!-- Benefits -->
      <div class="card-base p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
          注册即享受
        </h3>
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <font-awesome-icon 
                :icon="['fas', 'gift']" 
                class="text-green-500 text-sm"
              />
            </div>
            <span class="text-sm text-gray-700 dark:text-gray-300">
              免费获得5个临时邮箱配额
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <font-awesome-icon 
                :icon="['fas', 'clock']" 
                class="text-blue-500 text-sm"
              />
            </div>
            <span class="text-sm text-gray-700 dark:text-gray-300">
              实时邮件接收和推送
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <font-awesome-icon 
                :icon="['fas', 'shield-alt']" 
                class="text-purple-500 text-sm"
              />
            </div>
            <span class="text-sm text-gray-700 dark:text-gray-300">
              安全加密，保护隐私
            </span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <font-awesome-icon 
                :icon="['fas', 'code']" 
                class="text-orange-500 text-sm"
              />
            </div>
            <span class="text-sm text-gray-700 dark:text-gray-300">
              智能验证码识别
            </span>
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
