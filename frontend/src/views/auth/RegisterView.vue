<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Lock as LockIcon, Message as MessageIcon, User as UserIcon } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePublicSettings } from '@/composables/usePublicSettings'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import UserAgreement from '@/components/legal/UserAgreement.vue'
import PrivacyPolicy from '@/components/legal/PrivacyPolicy.vue'

usePageTitle()

const router = useRouter()
const authStore = useAuthStore()
const publicSettings = usePublicSettings()
const turnstile = useTurnstile('register')
const formRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const userAgreementRef = ref<InstanceType<typeof UserAgreement>>()
const privacyPolicyRef = ref<InstanceType<typeof PrivacyPolicy>>()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  accepted: false,
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  callback(value === form.password ? undefined : new Error('两次输入的密码不一致'))
}

const rules: FormRules = {
  username: [
    { min: 3, max: 64, message: '用户名长度应为 3–64 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_.-]*$/, message: '用户名仅支持字母、数字、点、横线和下划线', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码长度应为 8–128 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: ['blur', 'change'] },
  ],
}

const passwordStrength = computed(() => {
  const password = form.password
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
})

const resetChallenge = () => {
  turnstile.reset()
  turnstileRef.value?.reset()
}

const handleRegister = async () => {
  if (!publicSettings.settings.value.registrationEnabled) {
    ElMessage.warning('系统当前未开放新用户注册')
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!form.accepted) {
    ElMessage.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  if (!turnstile.isVerified.value) {
    ElMessage.warning('请先完成人机验证')
    return
  }
  if (turnstile.configurationError.value) {
    ElMessage.error(turnstile.configurationError.value)
    return
  }

  try {
    await authStore.register({
      username: form.username.trim() || undefined,
      email: form.email.trim().toLowerCase(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      turnstileToken: turnstile.required.value ? turnstile.turnstileToken.value : undefined,
    })
    ElMessage.success('账号创建成功')
    await router.replace('/profile')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败，请稍后重试')
    if (turnstile.required.value) resetChallenge()
  }
}

onMounted(() => {
  void publicSettings.load().catch(() => undefined)
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <section class="auth-intro" aria-labelledby="register-heading">
        <div class="auth-brand-mark" aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'user-shield']" />
        </div>
        <p class="auth-eyebrow">创建账号</p>
        <h1 id="register-heading">一个清爽、安全的临时收件箱</h1>
        <p>用独立账号管理邮箱与配额，不让一次性注册打扰你的常用邮箱。</p>
        <ul class="auth-benefits" aria-label="注册权益">
          <li><font-awesome-icon :icon="['fas', 'inbox']" /> 多临时邮箱集中管理</li>
          <li><font-awesome-icon :icon="['fas', 'key']" /> 快速提取邮件验证码</li>
          <li><font-awesome-icon :icon="['fas', 'clock-rotate-left']" /> 清晰的配额与操作记录</li>
        </ul>
      </section>

      <section class="auth-card" aria-label="注册表单">
        <el-skeleton v-if="publicSettings.loading.value && !publicSettings.loaded.value" :rows="7" animated />

        <div v-else-if="publicSettings.error.value" class="auth-state-panel" role="alert">
          <div class="auth-state-icon"><font-awesome-icon :icon="['fas', 'cloud-arrow-down']" /></div>
          <h2>暂时无法读取注册策略</h2>
          <p>{{ publicSettings.error.value }}</p>
          <el-button type="primary" @click="publicSettings.load(true)">重新加载</el-button>
          <router-link to="/login">返回登录</router-link>
        </div>

        <div v-else-if="!publicSettings.settings.value.registrationEnabled" class="auth-state-panel">
          <div class="auth-state-icon"><font-awesome-icon :icon="['fas', 'user-lock']" /></div>
          <p class="auth-eyebrow">注册暂未开放</p>
          <h2>系统当前关闭了新用户注册</h2>
          <p>已有账号仍可正常登录。如需开通账号，请联系系统管理员。</p>
          <el-button type="primary" @click="router.push('/login')">返回登录</el-button>
        </div>

        <template v-else>
          <div class="auth-card-heading">
            <p class="auth-eyebrow">新用户注册</p>
            <h2>创建你的账号</h2>
            <p>用户名可选；之后可以使用用户名或邮箱登录。</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            size="large"
            @submit.prevent="handleRegister"
          >
            <el-form-item label="用户名（可选）" prop="username">
              <el-input
                v-model.trim="form.username"
                maxlength="64"
                autocomplete="username"
                placeholder="3–64 个字符"
                :prefix-icon="UserIcon"
              />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model.trim="form.email"
                maxlength="254"
                inputmode="email"
                autocomplete="email"
                placeholder="name@example.com"
                :prefix-icon="MessageIcon"
              />
            </el-form-item>
            <div class="auth-form-grid">
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  maxlength="128"
                  autocomplete="new-password"
                  show-password
                  placeholder="至少 8 位"
                  :prefix-icon="LockIcon"
                />
                <div v-if="form.password" class="password-strength" aria-live="polite">
                  <span :class="{ active: passwordStrength >= 1 }" />
                  <span :class="{ active: passwordStrength >= 2 }" />
                  <span :class="{ active: passwordStrength >= 3 }" />
                  <span :class="{ active: passwordStrength >= 4 }" />
                  <small>{{ passwordStrength < 3 ? '建议混合大小写、数字和符号' : '密码强度良好' }}</small>
                </div>
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="form.confirmPassword"
                  type="password"
                  maxlength="128"
                  autocomplete="new-password"
                  show-password
                  placeholder="再次输入密码"
                  :prefix-icon="LockIcon"
                />
              </el-form-item>
            </div>

            <el-form-item v-if="turnstile.required.value" label="人机验证" required>
              <div class="auth-turnstile">
                <TurnstileWidget
                  v-if="turnstile.siteKey.value"
                  ref="turnstileRef"
                  :site-key="turnstile.siteKey.value"
                  action="register"
                  :theme="turnstile.theme.value"
                  @success="turnstile.handleSuccess"
                  @error="turnstile.handleError"
                  @expired="turnstile.handleExpired"
                  @timeout="turnstile.handleTimeout"
                  @before-interactive="turnstile.handleBeforeInteractive"
                  @after-interactive="turnstile.handleAfterInteractive"
                  @unsupported="turnstile.handleUnsupported"
                />
                <p
                  v-if="turnstile.configurationError.value || turnstile.error.value"
                  class="auth-field-error"
                  role="alert"
                >
                  {{ turnstile.configurationError.value || turnstile.error.value }}
                </p>
              </div>
            </el-form-item>

            <div class="auth-agreement">
              <el-checkbox v-model="form.accepted">
                我已阅读并同意
              </el-checkbox>
              <button type="button" @click="userAgreementRef?.open()">用户协议</button>
              <span>和</span>
              <button type="button" @click="privacyPolicyRef?.open()">隐私政策</button>
            </div>

            <el-button
              type="primary"
              native-type="submit"
              size="large"
              class="auth-primary-button"
              :loading="authStore.isLoading"
              :disabled="!turnstile.isVerified.value || !!turnstile.configurationError.value"
            >
              创建账号
            </el-button>
          </el-form>

          <p class="auth-switch-copy">
            已有账号？
            <router-link to="/login">直接登录</router-link>
          </p>
        </template>
      </section>
    </div>

    <UserAgreement ref="userAgreementRef" />
    <PrivacyPolicy ref="privacyPolicyRef" />
  </div>
</template>
