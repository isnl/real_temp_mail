<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { emailApi } from '@/api/email'
import { usePageTitle } from '@/composables/usePageTitle'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import EmailList from '@/components/email/EmailList.vue'
import type { EmailMessage, PublicEmailSummary } from '@/types'

usePageTitle()

const route = useRoute()
const router = useRouter()
const turnstile = useTurnstile('public-inbox')

const emailInput = ref('')
const loadedEmail = ref('')
const emails = ref<PublicEmailSummary[]>([])
const totalEmails = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const hasLoaded = ref(false)
const pendingQueryAfterVerify = ref(false)
const publicAccessToken = ref('')
const publicAccessTokenExpiresAt = ref('')
const publicAccessEmail = ref('')
const accessStateVersion = ref(0)
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const managedMeta: Array<{
  element: HTMLMetaElement
  created: boolean
  previousContent: string | null
}> = []

const applyPrivatePageMeta = (name: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  const created = !element
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }
  managedMeta.push({ element, created, previousContent: element.getAttribute('content') })
  element.content = content
}

onMounted(() => {
  applyPrivatePageMeta('robots', 'noindex,nofollow,noarchive')
  applyPrivatePageMeta('referrer', 'no-referrer')
})

onBeforeUnmount(() => {
  for (const { element, created, previousContent } of managedMeta.splice(0)) {
    if (created) {
      element.remove()
    } else if (previousContent === null) {
      element.removeAttribute('content')
    } else {
      element.content = previousContent
    }
  }
})

const queryEmail = computed(() => {
  const email = route.query.email
  return typeof email === 'string' ? email.trim() : ''
})

const canSubmit = computed(() => !!emailInput.value.trim() && !loading.value)
const currentEmail = computed(() => emailInput.value.trim().toLowerCase())

const hasPublicAccessForEmail = (email: string) => {
  return Boolean(
    email &&
      publicAccessEmail.value === email &&
      publicAccessToken.value &&
      publicAccessTokenExpiresAt.value &&
      new Date(publicAccessTokenExpiresAt.value).getTime() > Date.now(),
  )
}

const hasPublicAccess = computed(() => hasPublicAccessForEmail(currentEmail.value))

const requiresChallenge = computed(() => turnstile.required.value && !hasPublicAccess.value)
const canAccessInbox = computed(() => !requiresChallenge.value || hasPublicAccess.value)

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const updateQueryEmail = async (targetEmail: string) => {
  if (queryEmail.value !== targetEmail) {
    await router.replace({
      name: 'public-inbox',
      query: { email: targetEmail },
    })
  }
}

const clearPublicAccess = () => {
  publicAccessToken.value = ''
  publicAccessTokenExpiresAt.value = ''
  publicAccessEmail.value = ''
}

const resetTurnstileChallenge = () => {
  turnstile.reset()
  turnstileRef.value?.reset()
}

const resetLoadedInbox = () => {
  hasLoaded.value = false
  loadedEmail.value = ''
  emails.value = []
  totalEmails.value = 0
  page.value = 1
}

const resetAccessForEmailChange = () => {
  accessStateVersion.value += 1
  loading.value = false
  clearPublicAccess()
  resetTurnstileChallenge()
  resetLoadedInbox()
}

const handleSubmit = async (options: { force?: boolean } = {}) => {
  const targetEmail = currentEmail.value

  if (!isValidEmail(targetEmail)) {
    ElMessage.warning('请输入有效的邮箱地址')
    return
  }

  const hasEmailPublicAccess = hasPublicAccessForEmail(targetEmail)
  const turnstileToken =
    hasEmailPublicAccess || !turnstile.required.value
      ? undefined
      : turnstile.turnstileToken.value || undefined

  if (turnstile.required.value && !hasEmailPublicAccess && !turnstileToken) {
    pendingQueryAfterVerify.value = true
    hasLoaded.value = false
    loadedEmail.value = targetEmail
    await updateQueryEmail(targetEmail)
    return
  }

  if (!options.force && loadedEmail.value === targetEmail && hasLoaded.value) {
    return
  }

  loading.value = true
  const requestVersion = accessStateVersion.value

  try {
    const response = await emailApi.getPublicInbox({
      email: targetEmail,
      turnstileToken,
      publicAccessToken: hasEmailPublicAccess ? publicAccessToken.value : undefined,
      page: page.value,
      limit: pageSize,
    })

    const inbox = response.data
    if (requestVersion !== accessStateVersion.value || currentEmail.value !== targetEmail) {
      return
    }

    emails.value = inbox?.emails.data || []
    totalEmails.value = inbox?.emails.total || 0
    page.value = inbox?.emails.page || page.value
    loadedEmail.value = inbox?.tempEmail.email || targetEmail
    publicAccessToken.value = inbox?.publicAccessToken || ''
    publicAccessTokenExpiresAt.value = inbox?.publicAccessTokenExpiresAt || ''
    publicAccessEmail.value = (inbox?.tempEmail.email || targetEmail).toLowerCase()
    hasLoaded.value = true
    pendingQueryAfterVerify.value = false
    await updateQueryEmail(targetEmail)

    ElMessage.success('公开收件箱已加载')
  } catch (error) {
    if (requestVersion !== accessStateVersion.value || currentEmail.value !== targetEmail) {
      return
    }

    clearPublicAccess()
    resetLoadedInbox()
    loadedEmail.value = targetEmail
    pendingQueryAfterVerify.value = true
    console.error('Get public inbox error:', error)
    ElMessage.error(error instanceof Error ? error.message : '公开收件箱不存在或未开启')
  } finally {
    if (requestVersion === accessStateVersion.value && turnstileToken) {
      resetTurnstileChallenge()
    }
    if (requestVersion === accessStateVersion.value) {
      loading.value = false
    }
  }
}

const handleTurnstileSuccess = (token: string) => {
  turnstile.handleSuccess(token)

  if (emailInput.value.trim()) {
    pendingQueryAfterVerify.value = false
    handleSubmit({ force: true })
  }
}

const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
}

const loadPublicEmailDetail = async (email: EmailMessage): Promise<EmailMessage> => {
  const targetEmail = loadedEmail.value.trim().toLowerCase()
  const token = publicAccessToken.value
  const requestVersion = accessStateVersion.value
  if (!hasPublicAccessForEmail(targetEmail) || !token) {
    resetAccessForEmailChange()
    throw new Error('公开收件箱访问已过期，请重新验证')
  }

  const response = await emailApi.getPublicEmailDetail(email.id, {
    email: targetEmail,
    publicAccessToken: token,
  })
  if (
    requestVersion !== accessStateVersion.value ||
    targetEmail !== loadedEmail.value.toLowerCase()
  ) {
    throw new Error('收件箱已切换，请重新打开邮件')
  }
  if (!response.success || !response.data) {
    throw new Error(response.error || '获取公开邮件详情失败')
  }
  return response.data
}

const handlePageChange = (nextPage: number) => {
  if (loading.value || nextPage === page.value) return
  page.value = nextPage
  void handleSubmit({ force: true })
}

watch(
  () => emailInput.value,
  (email) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      resetAccessForEmailChange()
      return
    }

    if (
      (publicAccessEmail.value && publicAccessEmail.value !== normalizedEmail) ||
      (loadedEmail.value && loadedEmail.value !== normalizedEmail)
    ) {
      resetAccessForEmailChange()
    }
  },
)

watch(
  queryEmail,
  (email) => {
    if (email) {
      const normalizedEmail = email.toLowerCase()
      if (
        (publicAccessEmail.value && publicAccessEmail.value !== normalizedEmail) ||
        (loadedEmail.value && loadedEmail.value !== normalizedEmail)
      ) {
        resetAccessForEmailChange()
      }
      emailInput.value = normalizedEmail
      pendingQueryAfterVerify.value = !canAccessInbox.value
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="public-inbox-page h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="max-w-1200px mx-auto h-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
      <section class="flex-shrink-0">
        <div class="flex flex-col gap-3 sm:flex-row">
          <el-input
            v-model="emailInput"
            size="large"
            placeholder="输入临时邮箱地址"
            clearable
            class="public-email-input min-w-0 flex-1"
            @keyup.enter="handleSubmit({ force: true })"
          >
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'at']" class="text-primary-500 text-lg" />
            </template>
          </el-input>

          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!canSubmit"
            class="public-query-button w-full sm:w-auto"
            @click="handleSubmit({ force: true })"
          >
            <font-awesome-icon v-if="!loading" :icon="['fas', 'magnifying-glass']" class="mr-2" />
            查询
          </el-button>
        </div>
      </section>

      <section
        class="flex-1 min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col"
      >
        <div
          class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">邮件列表</h2>
              <span
                v-if="hasLoaded && canAccessInbox"
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              >
                <font-awesome-icon :icon="['fas', 'circle-check']" class="mr-1" />
                {{ turnstile.required.value ? '已验证' : '无需验证' }}
              </span>
            </div>
            <p v-if="loadedEmail" class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {{ loadedEmail }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div
              v-if="hasLoaded"
              class="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <font-awesome-icon :icon="['fas', 'inbox']" class="text-green-500" />
              <span>共 {{ totalEmails }} 封</span>
            </div>
            <el-button
              v-if="hasLoaded"
              size="default"
              circle
              :loading="loading"
              :disabled="!canAccessInbox"
              title="刷新邮件列表"
              @click="handleSubmit({ force: true })"
            >
              <font-awesome-icon v-if="!loading" :icon="['fas', 'refresh']" />
            </el-button>
          </div>
        </div>

        <div class="flex-1 min-h-0">
          <div v-if="requiresChallenge" class="h-full flex items-center justify-center p-8">
            <div class="w-full max-w-sm">
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5"
              >
                <TurnstileWidget
                  v-if="turnstile.siteKey.value"
                  ref="turnstileRef"
                  :site-key="turnstile.siteKey.value"
                  action="public-inbox"
                  :theme="turnstile.theme.value"
                  @success="handleTurnstileSuccess"
                  @error="handleTurnstileError"
                  @expired="turnstile.handleExpired"
                  @timeout="turnstile.handleTimeout"
                  @before-interactive="turnstile.handleBeforeInteractive"
                  @after-interactive="turnstile.handleAfterInteractive"
                  @unsupported="turnstile.handleUnsupported"
                />
              </div>

              <div
                v-if="turnstile.configurationError.value || turnstile.error.value"
                class="mt-3 text-sm text-red-600 dark:text-red-400 text-center"
                role="alert"
              >
                <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-1" />
                {{ turnstile.configurationError.value || turnstile.error.value }}
              </div>
            </div>
          </div>

          <EmailList
            v-else-if="hasLoaded"
            :temp-email-id="0"
            :emails="emails"
            :loading="loading"
            :detail-loader="loadPublicEmailDetail"
            :page="page"
            :page-size="pageSize"
            :total="totalEmails"
            readonly
            @page-change="handlePageChange"
          />

          <div v-else class="h-full flex items-center justify-center p-8">
            <div class="text-center max-w-sm">
              <div
                class="w-24 h-24 mx-auto mb-6 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center"
              >
                <font-awesome-icon :icon="['fas', 'inbox']" class="text-3xl text-primary-500" />
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">等待查询</h3>
              <p
                v-if="pendingQueryAfterVerify"
                class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
              >
                验证通过后会自动加载邮件列表。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.public-email-input :deep(.el-input__wrapper) {
  min-height: 64px;
  padding: 0 22px;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(18, 59, 50, 0.08);
  border: 1px solid var(--border);
  background: #ffffff;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.public-email-input :deep(.el-input__wrapper:hover),
.public-email-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--focus);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--brand-500) 16%, transparent);
}

.public-email-input :deep(.el-input__inner) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.public-query-button {
  min-width: 128px;
  min-height: 64px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--brand-500) 16%, transparent);
}

.dark .public-email-input :deep(.el-input__wrapper) {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: none;
}

.dark .public-email-input :deep(.el-input__wrapper:hover),
.dark .public-email-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--focus);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--brand-400) 14%, transparent);
}

.dark .public-email-input :deep(.el-input__inner) {
  color: #f8fafc;
}
</style>
