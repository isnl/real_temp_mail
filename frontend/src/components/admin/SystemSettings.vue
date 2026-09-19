<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemSettings, updateSystemSettings, type SystemSetting } from '@/api/admin'
import { loadPublicSettings } from '@/composables/usePublicSettings'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import PricingContentEditor from './PricingContentEditor.vue'
import { mergePricingGroup, validatePricingContent, type PricingPart } from '@/utils/pricing'

type FieldType =
  | 'switch'
  | 'text'
  | 'password'
  | 'number'
  | 'url'
  | 'readonly'
  | 'email'
  | 'pricing'

interface SettingField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  min?: number
  max?: number
  maxLength?: number
  pricingPart?: PricingPart
}

interface SettingSection {
  key: string
  title: string
  fields: SettingField[]
}

interface SettingTab {
  key: string
  title: string
  sectionKeys: string[]
}

const settingTabs: SettingTab[] = [
  { key: 'site', title: '站点设置', sectionKeys: ['site', 'quota', 'plans', 'faqs'] },
  { key: 'security', title: '账号与安全', sectionKeys: ['access', 'github', 'turnstile'] },
]

const sections: SettingSection[] = [
  {
    key: 'site',
    title: '站点信息',
    fields: [
      { key: 'site_name', label: '系统名称', type: 'text', maxLength: 40 },
      {
        key: 'contact_email',
        label: '管理员联系邮箱',
        type: 'email',
        placeholder: 'admin@example.com',
        maxLength: 254,
      },
      { key: 'contact_email_enabled', label: '前台展示管理员邮箱', type: 'switch' },
    ],
  },
  {
    key: 'plans',
    title: '价格套餐',
    fields: [{ key: 'pricing_plans', label: '价格套餐', type: 'pricing', pricingPart: 'plans' }],
  },
  {
    key: 'faqs',
    title: '常见问题',
    fields: [{ key: 'pricing_faqs', label: '常见问题', type: 'pricing', pricingPart: 'faqs' }],
  },
  {
    key: 'access',
    title: '账号与访问',
    fields: [
      { key: 'registration_enabled', label: '开放新用户注册', type: 'switch' },
      { key: 'admin_username', label: '管理员账号', type: 'text', placeholder: 'admin' },
      {
        key: 'admin_password',
        label: '新管理员密码',
        type: 'password',
        placeholder: '留空则不修改',
      },
    ],
  },
  {
    key: 'github',
    title: '第三方登录',
    fields: [
      { key: 'github_oauth_enabled', label: '启用 GitHub 登录', type: 'switch' },
      { key: 'github_client_id', label: '应用标识', type: 'text', placeholder: 'GitHub Client ID' },
      {
        key: 'github_client_secret',
        label: '应用密钥',
        type: 'password',
        placeholder: '留空则不修改',
      },
      {
        key: 'github_callback_url',
        label: '授权回调地址',
        type: 'readonly',
      },
    ],
  },
  {
    key: 'turnstile',
    title: '人机验证',
    fields: [
      { key: 'turnstile_enabled', label: '启用人机验证', type: 'switch' },
      { key: 'turnstile_site_key', label: '站点密钥', type: 'text', placeholder: '0x4AAAA…' },
      {
        key: 'turnstile_secret_key',
        label: '验证密钥',
        type: 'password',
        placeholder: '留空则不修改',
      },
      { key: 'turnstile_login_enabled', label: '登录时验证', type: 'switch' },
      { key: 'turnstile_register_enabled', label: '注册时验证', type: 'switch' },
      { key: 'turnstile_redeem_enabled', label: '兑换配额时验证', type: 'switch' },
      { key: 'turnstile_public_inbox_enabled', label: '公开收件箱验证', type: 'switch' },
    ],
  },
  {
    key: 'quota',
    title: '配额策略',
    fields: [
      { key: 'default_user_quota', label: '新用户默认配额', type: 'number', min: 0, max: 1000 },
    ],
  },
]

const secretKeys = new Set(['admin_password', 'github_client_secret', 'turnstile_secret_key'])
const knownKeys = new Set([
  'pricing_content',
  ...sections.flatMap((section) => section.fields.map((field) => field.key)),
])
const retiredKeys = new Set(['daily_checkin_quota'])
const activeTab = ref('site')
const visibleSections = computed(() =>
  (settingTabs.find((tab) => tab.key === activeTab.value)?.sectionKeys ?? [])
    .map((key) => sections.find((section) => section.key === key))
    .filter((section): section is SettingSection => Boolean(section)),
)
const loading = ref(false)
const savingSection = ref('')
const settings = ref<SystemSetting[]>([])
const values = reactive<Record<string, string>>({})
const originalValues = reactive<Record<string, string>>({})
const savedPricingContent = ref('')
const configuredSecrets = reactive<Record<string, boolean>>({})
const adminPasswordConfirmation = ref('')
const authStore = useAuthStore()
let loadVersion = 0

const toBoolean = (value: string) => value === 'true' || value === '1'
const normalizeBoolean = (value: string) => (toBoolean(value) ? 'true' : 'false')

const unknownSettings = computed(() =>
  settings.value.filter(
    (setting) => !knownKeys.has(setting.setting_key) && !retiredKeys.has(setting.setting_key),
  ),
)

const tabs = computed<SettingTab[]>(() => [
  ...settingTabs,
  ...(unknownSettings.value.length ? [{ key: 'other', title: '其他配置', sectionKeys: [] }] : []),
])
const activeTabIndex = computed(() =>
  Math.max(
    0,
    tabs.value.findIndex((tab) => tab.key === activeTab.value),
  ),
)

const handleTabKeydown = async (event: KeyboardEvent, index: number) => {
  let nextIndex = index
  if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.value.length
  else if (event.key === 'ArrowLeft')
    nextIndex = (index - 1 + tabs.value.length) % tabs.value.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.value.length - 1
  else return

  event.preventDefault()
  const tabList = (event.currentTarget as HTMLElement).parentElement
  activeTab.value = tabs.value[nextIndex]!.key
  await nextTick()
  const button = tabList?.querySelector<HTMLButtonElement>(`#settings-tab-${activeTab.value}`)
  button?.focus({ preventScroll: true })
  button?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

const isFieldDirty = (field: SettingField) => {
  if (field.type === 'readonly') return false
  const value = values[field.key] ?? ''
  if (secretKeys.has(field.key)) return Boolean(value)
  const normalized = field.type === 'switch' ? normalizeBoolean(value) : value.trim()
  return normalized !== (originalValues[field.key] ?? '')
}

const isSectionDirty = (section: SettingSection) => section.fields.some(isFieldDirty)
const isTabDirty = (tab: SettingTab) =>
  sections.some((section) => tab.sectionKeys.includes(section.key) && isSectionDirty(section))

const loadSettings = async () => {
  const requestVersion = ++loadVersion
  loading.value = true
  try {
    const response = await getSystemSettings()
    if (requestVersion !== loadVersion) return
    if (!response.success || !response.data) throw new Error(response.error || '获取系统设置失败')

    settings.value = response.data
    const byKey = new Map(response.data.map((setting) => [setting.setting_key, setting]))
    savedPricingContent.value =
      byKey.get('pricing_content')?.setting_value ?? '{"plans":[],"faqs":[]}'
    for (const section of sections) {
      for (const field of section.fields) {
        const setting = byKey.get(field.key)
        if (field.pricingPart) {
          values[field.key] = JSON.stringify(
            JSON.parse(savedPricingContent.value)[field.pricingPart],
          )
          originalValues[field.key] = values[field.key]
        } else if (secretKeys.has(field.key)) {
          values[field.key] = ''
          originalValues[field.key] = ''
          configuredSecrets[field.key] = Boolean(
            setting?.is_configured ||
              (setting?.setting_value && setting.setting_value === '********'),
          )
        } else {
          const fallback = field.type === 'switch' ? 'false' : ''
          const value = setting?.setting_value ?? fallback
          values[field.key] = field.type === 'switch' ? normalizeBoolean(value) : value
          originalValues[field.key] = values[field.key]
        }
      }
    }
    adminPasswordConfirmation.value = ''
  } catch (error) {
    if (requestVersion === loadVersion) {
      ElMessage.error(error instanceof Error ? error.message : '获取系统设置失败')
    }
  } finally {
    if (requestVersion === loadVersion) loading.value = false
  }
}

const validateSection = (section: SettingSection): string => {
  if (section.key === 'site') {
    if (!values.site_name?.trim() || values.site_name.trim().length > 40)
      return '系统名称须为 1–40 个字符'
    const email = values.contact_email?.trim() || ''
    if (email && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
      return '请输入有效的管理员联系邮箱'
    if (toBoolean(values.contact_email_enabled) && !email) return '展示管理员邮箱前请先填写联系邮箱'
  }
  const pricingField = section.fields.find((field) => field.pricingPart)
  if (pricingField?.pricingPart) {
    try {
      return validatePricingContent(
        mergePricingGroup(
          savedPricingContent.value,
          pricingField.pricingPart,
          values[pricingField.key] || '[]',
        ),
      )
    } catch {
      return '价格内容加载失败，请重新打开设置'
    }
  }
  for (const field of section.fields) {
    const value = values[field.key] ?? ''
    if (field.type === 'number' && value) {
      const number = Number(value)
      if (
        !Number.isInteger(number) ||
        number < (field.min ?? 0) ||
        number > (field.max ?? Number.MAX_SAFE_INTEGER)
      ) {
        return `${field.label}必须是 ${field.min ?? 0}–${field.max} 之间的整数`
      }
    }
    if (field.type === 'url' && value.trim()) {
      try {
        const url = new URL(value.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol')
      } catch {
        return `${field.label}必须是有效的 HTTP(S) 地址`
      }
    }
  }

  if (section.key === 'access') {
    if (!values.admin_username?.trim()) return '管理员账号不能为空'
    if (values.admin_password && values.admin_password.length < 8)
      return '新管理员密码至少需要 8 位'
    if (values.admin_password !== adminPasswordConfirmation.value)
      return '两次输入的管理员密码不一致'
  }
  if (section.key === 'github' && toBoolean(values.github_oauth_enabled)) {
    if (!values.github_client_id?.trim()) return '启用 GitHub 登录前请填写应用标识'
    if (!configuredSecrets.github_client_secret && !values.github_client_secret)
      return '启用 GitHub 登录前请填写应用密钥'
  }
  if (section.key === 'turnstile' && toBoolean(values.turnstile_enabled)) {
    if (!values.turnstile_site_key?.trim()) return '启用人机验证前请填写站点密钥'
    if (!configuredSecrets.turnstile_secret_key && !values.turnstile_secret_key)
      return '启用人机验证前请填写验证密钥'
  }
  return ''
}

const saveSection = async (section: SettingSection) => {
  if (savingSection.value) return
  const validationMessage = validateSection(section)
  if (validationMessage) {
    ElMessage.warning(validationMessage)
    return
  }

  const changedFields = section.fields.filter(isFieldDirty)
  if (!changedFields.length) {
    ElMessage.info('当前分组没有待保存的修改')
    return
  }

  savingSection.value = section.key
  const submittedValues = Object.fromEntries(
    changedFields.map((field) => [field.key, values[field.key] ?? '']),
  )
  const payload = Object.fromEntries(
    changedFields.map((field) => {
      const rawValue = submittedValues[field.key] ?? ''
      if (field.pricingPart) {
        return [
          'pricing_content',
          mergePricingGroup(savedPricingContent.value, field.pricingPart, rawValue),
        ]
      }
      const value = field.type === 'switch' ? normalizeBoolean(rawValue) : rawValue.trim()
      return [field.key, value]
    }),
  )

  try {
    const response = await updateSystemSettings(payload)
    if (!response.success) throw new Error(response.error || '保存系统设置失败')
    if (payload.pricing_content) savedPricingContent.value = payload.pricing_content
    const adminPasswordChanged = changedFields.some((field) => field.key === 'admin_password')
    for (const field of changedFields) {
      const value = field.pricingPart ? submittedValues[field.key] : payload[field.key]
      if (secretKeys.has(field.key)) {
        configuredSecrets[field.key] = true
        if (values[field.key] === submittedValues[field.key]) {
          values[field.key] = ''
          if (field.key === 'admin_password') adminPasswordConfirmation.value = ''
        }
      } else {
        originalValues[field.key] = value ?? ''
        if (values[field.key] === submittedValues[field.key]) values[field.key] = value ?? ''
      }
    }
    // 让当前浏览器中的页头、登录和注册入口立即使用最新公开配置。
    await loadPublicSettings(true).catch(() => undefined)
    if (adminPasswordChanged) {
      authStore.clearAuthData()
      ElMessage.success('管理员密码已更新，请使用新密码重新登录')
      await router.replace({ name: 'login', query: { reason: 'admin-password-changed' } })
      return
    }
    ElMessage.success(`已保存 ${changedFields.length} 项设置`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存系统设置失败')
  } finally {
    savingSection.value = ''
  }
}

const displayValue = (setting: SystemSetting) => {
  if (setting.is_secret || secretKeys.has(setting.setting_key)) {
    return setting.is_configured || setting.setting_value === '********' ? '已安全配置' : '未配置'
  }
  if (['true', 'false', '1', '0'].includes(setting.setting_value)) {
    return toBoolean(setting.setting_value) ? '已开启' : '已关闭'
  }
  return setting.setting_value || '未设置'
}

const copyCallbackUrl = async () => {
  try {
    await navigator.clipboard.writeText(values.github_callback_url || '')
    ElMessage.success('回调地址已复制')
  } catch {
    ElMessage.error('复制失败，请选中地址手动复制')
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <div class="settings-tabs">
      <div
        class="settings-tabs-track"
        role="tablist"
        aria-label="设置分类"
        :style="{ '--active-tab': activeTabIndex }"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="`settings-tab-${tab.key}`"
          :key="tab.key"
          type="button"
          role="tab"
          class="settings-tab"
          :class="{ 'is-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`settings-panel-${tab.key}`"
          :aria-label="`${tab.title}${isTabDirty(tab) ? '，有未保存修改' : ''}`"
          :tabindex="activeTab === tab.key ? 0 : -1"
          @click="activeTab = tab.key"
          @keydown="handleTabKeydown($event, index)"
        >
          {{ tab.title }}
          <span v-if="isTabDirty(tab)" class="settings-tab-dot" aria-hidden="true" />
        </button>
        <span class="settings-tab-indicator" aria-hidden="true" />
      </div>
    </div>

    <Transition name="settings-panel" mode="out-in">
      <div
        :id="`settings-panel-${activeTab}`"
        :key="activeTab"
        class="settings-sections"
        role="tabpanel"
        :aria-labelledby="`settings-tab-${activeTab}`"
        :aria-busy="loading"
      >
        <div
          v-if="loading && !settings.length"
          class="settings-skeleton"
          aria-label="正在加载系统设置"
        >
          <el-skeleton v-for="index in 2" :key="index" :rows="4" animated />
        </div>
        <template v-else>
          <section
            v-for="section in visibleSections"
            :key="section.key"
            class="settings-section"
            :aria-labelledby="`settings-group-${section.key}`"
          >
            <h3 :id="`settings-group-${section.key}`" class="settings-group-title">
              {{ section.title }}
            </h3>
            <div class="settings-fields">
              <div
                v-for="field in section.fields"
                :key="field.key"
                class="settings-field"
                :class="{ 'settings-field-pricing': field.type === 'pricing' }"
              >
                <PricingContentEditor
                  v-if="field.type === 'pricing' && field.pricingPart"
                  v-model="values[field.key]"
                  :part="field.pricingPart"
                  :disabled="loading || !!savingSection"
                />
                <div v-if="field.type !== 'pricing'" class="settings-field-copy">
                  <label :for="`setting-${field.key}`">{{ field.label }}</label>
                  <span v-if="secretKeys.has(field.key)" class="secret-status">
                    <font-awesome-icon
                      :icon="[
                        'fas',
                        configuredSecrets[field.key] ? 'circle-check' : 'circle-minus',
                      ]"
                    />
                    {{ configuredSecrets[field.key] ? '已配置' : '未配置' }}
                  </span>
                </div>

                <div v-if="field.type !== 'pricing'" class="settings-control">
                  <el-switch
                    v-if="field.type === 'switch'"
                    :id="`setting-${field.key}`"
                    :model-value="toBoolean(values[field.key] || 'false')"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                    @update:model-value="values[field.key] = $event ? 'true' : 'false'"
                  />
                  <el-input-number
                    v-else-if="field.type === 'number'"
                    :id="`setting-${field.key}`"
                    :model-value="Number(values[field.key] || 0)"
                    :min="field.min"
                    :max="field.max"
                    :step="1"
                    controls-position="right"
                    @update:model-value="values[field.key] = String($event ?? 0)"
                  />
                  <div v-else-if="field.type === 'readonly'" class="settings-readonly-control">
                    <el-input
                      :id="`setting-${field.key}`"
                      :model-value="values[field.key]"
                      readonly
                    />
                    <el-button
                      :disabled="!values[field.key]"
                      @click="copyCallbackUrl"
                      aria-label="复制 GitHub 回调地址"
                      >复制</el-button
                    >
                  </div>
                  <el-input
                    v-else
                    :id="`setting-${field.key}`"
                    v-model="values[field.key]"
                    :type="
                      field.type === 'password'
                        ? 'password'
                        : field.type === 'email'
                          ? 'email'
                          : 'text'
                    "
                    :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
                    :show-password="field.type === 'password'"
                    :placeholder="field.placeholder"
                    :maxlength="field.maxLength || 512"
                  />
                  <el-input
                    v-if="field.key === 'admin_password' && values.admin_password"
                    id="setting-admin-password-confirmation"
                    v-model="adminPasswordConfirmation"
                    type="password"
                    autocomplete="new-password"
                    show-password
                    placeholder="再次输入新管理员密码"
                    maxlength="128"
                    aria-label="确认新管理员密码"
                  />
                </div>
              </div>
            </div>

            <footer>
              <el-button
                type="primary"
                :loading="savingSection === section.key"
                :disabled="
                  !isSectionDirty(section) || (!!savingSection && savingSection !== section.key)
                "
                @click="saveSection(section)"
              >
                保存{{ section.title }}
              </el-button>
            </footer>
          </section>

          <section
            v-if="activeTab === 'other' && unknownSettings.length"
            class="settings-section"
            aria-label="其他配置"
          >
            <dl class="settings-unknown-list">
              <div v-for="setting in unknownSettings" :key="setting.setting_key">
                <dt>{{ setting.description || setting.setting_key }}</dt>
                <dd>{{ displayValue(setting) }}</dd>
              </div>
            </dl>
          </section>
        </template>
      </div>
    </Transition>
  </div>
</template>
