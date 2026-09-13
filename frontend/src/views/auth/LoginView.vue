<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Lock as LockIcon, User as UserIcon } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { resolveApiUrl } from '@/api/request'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePublicSettings } from '@/composables/usePublicSettings'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import UserAgreement from '@/components/legal/UserAgreement.vue'
import PrivacyPolicy from '@/components/legal/PrivacyPolicy.vue'

usePageTitle()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const publicSettings = usePublicSettings()
const turnstile = useTurnstile('login')

const formRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const userAgreementRef = ref<InstanceType<typeof UserAgreement>>()
const privacyPolicyRef = ref<InstanceType<typeof PrivacyPolicy>>()
const githubLoading = ref(false)
const callbackLoading = ref(false)
const form = reactive({ account: '', password: '' })

const rules: FormRules = {
  account: [
    { required: true, message: '请输入账号或邮箱', trigger: 'blur' },
    { min: 2, max: 254, message: '账号长度应为 2–254 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度应为 6–128 位', trigger: 'blur' },
  ],
}

const isBusy = computed(() => authStore.isLoading || callbackLoading.value)

const safeRedirect = (value: unknown, fallback = '/dashboard') => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

const resetChallenge = () => {
  turnstile.reset()
  turnstileRef.value?.reset()
}

const handleLogin = async () => {
  if (!publicSettings.loaded.value || publicSettings.error.value) {
    ElMessage.error('登录安全策略尚未加载，请先重新加载配置')
    return
  }
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!turnstile.isVerified.value) {
    ElMessage.warning('请先完成人机验证')
    return
  }
  if (turnstile.configurationError.value) {
    ElMessage.error(turnstile.configurationError.value)
    return
  }

  const account = form.account.trim()
  try {
    await authStore.login({
      account,
      email: account,
      password: form.password,
      turnstileToken: turnstile.required.value ? turnstile.turnstileToken.value : undefined,
    })
    ElMessage.success('登录成功')
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
    if (turnstile.required.value) resetChallenge()
  }
}

const handleGitHubLogin = () => {
  if (!publicSettings.settings.value.githubEnabled) return
  githubLoading.value = true
  sessionStorage.setItem('oauth_redirect', safeRedirect(route.query.redirect))
  window.location.assign(resolveApiUrl('/api/auth/github'))
}

const handleOAuthCallback = async () => {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const oauthError = typeof route.query.error === 'string' ? route.query.error : ''
  if (oauthError) {
    ElMessage.error('GitHub 登录失败，请重新发起授权')
    await router.replace({ name: 'login' })
    return
  }

  // OAuth 凭证只允许出现在 URL fragment 中，避免被服务端访问日志或
  // Referer 收集；不再兼容旧版 query token。
  const accessToken = fragment.get('token') || ''
  const refreshToken = fragment.get('refresh_token') || ''
  if (!accessToken || !refreshToken) return

  const isNewUser = fragment.get('new_user') === '1'
  // 在任何异步请求前清除 fragment。
  window.history.replaceState(window.history.state, document.title, window.location.pathname)

  callbackLoading.value = true
  try {
    authStore.setTokens({ accessToken, refreshToken })
    await authStore.fetchCurrentUser()
    const redirect = safeRedirect(sessionStorage.getItem('oauth_redirect'))
    sessionStorage.removeItem('oauth_redirect')
    ElMessage.success(isNewUser ? '账号创建成功，欢迎使用' : '登录成功')
    // replace 会立即从地址栏与历史记录中移除令牌。
    await router.replace(redirect)
  } catch (error) {
    authStore.clearAuthData()
    ElMessage.error(error instanceof Error ? error.message : 'GitHub 登录失败，请重试')
    await router.replace({ name: 'login' })
  } finally {
    callbackLoading.value = false
  }
}

onMounted(async () => {
  await Promise.allSettled([publicSettings.load(), handleOAuthCallback()])
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <section class="auth-intro" aria-labelledby="login-heading">
        <div class="auth-brand-mark" aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'envelope-open-text']" />
        </div>
        <p class="auth-eyebrow">OOOO.ICU</p>
        <h1 id="login-heading">欢迎回来</h1>
        <p>安全管理临时邮箱、验证码与配额，所有入口均由系统策略统一控制。</p>
        <ul class="auth-benefits" aria-label="服务特点">
          <li><font-awesome-icon :icon="['fas', 'shield-halved']" /> 独立账号与访问令牌保护</li>
          <li><font-awesome-icon :icon="['fas', 'bolt']" /> 实时收件与验证码识别</li>
          <li><font-awesome-icon :icon="['fas', 'layer-group']" /> 桌面与移动端一致体验</li>
        </ul>
      </section>

      <section class="auth-card" aria-label="账号登录表单">
        <div class="auth-card-heading">
          <p class="auth-eyebrow">账号登录</p>
          <h2>登录控制台</h2>
          <p>管理员可直接使用管理员账号，普通用户可使用账号或邮箱。</p>
        </div>

        <el-skeleton v-if="publicSettings.loading.value && !publicSettings.loaded.value" :rows="5" animated />

        <template v-else>
          <div v-if="publicSettings.error.value" class="auth-alert" role="alert">
            <font-awesome-icon :icon="['fas', 'circle-exclamation']" />
            <span>{{ publicSettings.error.value }}</span>
            <button type="button" @click="publicSettings.load(true)">重试</button>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            size="large"
            @submit.prevent="handleLogin"
          >
            <el-form-item label="账号或邮箱" prop="account">
              <el-input
                v-model.trim="form.account"
                autocomplete="username"
                inputmode="email"
                maxlength="254"
                placeholder="请输入管理员账号、用户名或邮箱"
                :prefix-icon="UserIcon"
              />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                maxlength="128"
                show-password
                placeholder="请输入密码"
                :prefix-icon="LockIcon"
              />
            </el-form-item>

            <el-form-item v-if="turnstile.required.value" label="人机验证" required>
              <div class="auth-turnstile">
                <TurnstileWidget
                  v-if="turnstile.siteKey.value"
                  ref="turnstileRef"
                  :site-key="turnstile.siteKey.value"
                  action="login"
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

            <el-button
              type="primary"
              native-type="submit"
              size="large"
              class="auth-primary-button"
              :loading="isBusy"
              :disabled="
                !publicSettings.loaded.value ||
                !!publicSettings.error.value ||
                !turnstile.isVerified.value ||
                !!turnstile.configurationError.value
              "
            >
              登录
            </el-button>
          </el-form>

          <div v-if="publicSettings.settings.value.githubEnabled" class="auth-divider">
            <span>或使用第三方账号</span>
          </div>

          <el-button
            v-if="publicSettings.settings.value.githubEnabled"
            size="large"
            class="auth-github-button"
            :loading="githubLoading"
            :disabled="isBusy"
            @click="handleGitHubLogin"
          >
            <font-awesome-icon :icon="['fab', 'github']" />
            使用 GitHub 登录
          </el-button>

          <p v-if="publicSettings.settings.value.registrationEnabled" class="auth-switch-copy">
            还没有账号？
            <router-link to="/register">创建账号</router-link>
          </p>

          <p class="auth-legal-copy">
            登录即表示你同意
            <button type="button" @click="userAgreementRef?.open()">用户协议</button>
            与
            <button type="button" @click="privacyPolicyRef?.open()">隐私政策</button>
          </p>
        </template>
      </section>
    </div>

    <UserAgreement ref="userAgreementRef" />
    <PrivacyPolicy ref="privacyPolicyRef" />
  </div>
</template>
