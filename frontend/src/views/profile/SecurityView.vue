<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { authApi } from '@/api/auth'
import { usePageTitle } from '@/composables/usePageTitle'
import { useAuthStore } from '@/stores/auth'

// 设置页面标题
usePageTitle()

const router = useRouter()
const authStore = useAuthStore()
const canChangePassword = computed(() => authStore.user?.provider !== 'github')

// 修改密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordFormRef = ref<FormInstance>()
const passwordLoading = ref(false)

// 密码验证规则
const passwordRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码长度应为 8–128 位', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        callback(value === passwordForm.value.currentPassword
          ? new Error('新密码不能与当前密码相同')
          : undefined)
      },
      trigger: ['blur', 'change'],
    },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value || !canChangePassword.value) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    await authApi.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
      confirmPassword: passwordForm.value.confirmPassword,
    })

    // 后端会撤销该用户的全部刷新令牌，前端也立即结束旧会话。
    await authStore.logout()
    ElMessage.success('密码已更新，请使用新密码重新登录')
    await router.replace('/login')
  } catch (error) {
    console.error('Change password error:', error)
    ElMessage.error(error instanceof Error ? error.message : '密码修改失败，请重试')
  } finally {
    passwordLoading.value = false
  }
}

// 密码强度检测
const getPasswordStrength = (password: string) => {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[@$!%*?&]/.test(password)) strength++

  return strength
}

const getPasswordStrengthText = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return '弱'
    case 2:
    case 3:
      return '中等'
    case 4:
    case 5:
      return '强'
    default:
      return '弱'
  }
}

const getPasswordStrengthColor = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return 'text-red-600 dark:text-red-400'
    case 2:
    case 3:
      return 'text-orange-600 dark:text-orange-400'
    case 4:
    case 5:
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-red-600 dark:text-red-400'
  }
}
</script>

<template>
  <div class="security-page">
    <div v-if="!canChangePassword" class="security-provider-card surface-card" role="status">
      <span class="security-provider-icon" aria-hidden="true">
        <font-awesome-icon :icon="['fab', 'github']" />
      </span>
      <div>
        <p class="page-eyebrow">GitHub account</p>
        <h3>此账号使用 GitHub 登录</h3>
        <p>当前账号尚未设置本地密码，因此不能在这里修改密码。请继续通过 GitHub 登录。</p>
      </div>
    </div>

    <!-- 修改密码 -->
    <div v-else class="security-password-card surface-card">
      <header>
        <span aria-hidden="true"><font-awesome-icon :icon="['fas', 'key']" /></span>
        <div>
          <p class="page-eyebrow">Password</p>
          <h3>修改登录密码</h3>
          <p>保存后当前会话会安全退出，请使用新密码重新登录。</p>
        </div>
      </header>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
        class="security-form"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            class="max-w-md"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <div class="w-full">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
              class="max-w-md"
            />

            <!-- 密码强度显示 -->
            <div v-if="passwordForm.newPassword" class="mt-3 max-w-md">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">密码强度:</span>
                <span
                  :class="[
                    'text-sm font-medium',
                    getPasswordStrengthColor(getPasswordStrength(passwordForm.newPassword)),
                  ]"
                >
                  {{ getPasswordStrengthText(getPasswordStrength(passwordForm.newPassword)) }}
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  :class="[
                    'h-2 rounded-full transition-all duration-300',
                    getPasswordStrength(passwordForm.newPassword) <= 1
                      ? 'bg-red-500'
                      : getPasswordStrength(passwordForm.newPassword) <= 3
                        ? 'bg-orange-500'
                        : 'bg-green-500',
                  ]"
                  :style="{ width: `${(getPasswordStrength(passwordForm.newPassword) / 5) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- 密码要求说明 -->
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-md">
              密码长度为 8–128 位；建议混合大小写字母、数字和符号。
            </p>
          </div>
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            class="max-w-md"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="passwordLoading" @click="changePassword">
            <font-awesome-icon :icon="['fas', 'key']" class="mr-1" />
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.security-page {
  display: grid;
  max-width: 820px;
  gap: 20px;
}

.security-password-card,
.security-provider-card {
  padding: clamp(20px, 4vw, 32px);
}

.security-password-card > header,
.security-provider-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.security-password-card > header {
  padding-bottom: 23px;
  border-bottom: 1px solid var(--border);
}

.security-password-card > header > span,
.security-provider-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  color: var(--brand-700);
  background: var(--brand-100);
}

.security-password-card h3,
.security-provider-card h3 {
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 1.12rem;
}

.security-password-card header p:last-child,
.security-provider-card p:last-child {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.security-form {
  max-width: 560px;
  padding-top: 24px;
}

.dark .security-password-card > header > span,
.dark .security-provider-icon {
  color: var(--brand-400);
  background: color-mix(in srgb, var(--brand-500) 14%, transparent);
}

@media (max-width: 520px) {
  .security-password-card,
  .security-provider-card {
    padding: 18px;
  }
}
</style>
