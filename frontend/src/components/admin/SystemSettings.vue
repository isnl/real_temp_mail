<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemSettings, updateSystemSettings, type SystemSetting } from '@/api/admin'
import { loadPublicSettings } from '@/composables/usePublicSettings'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

type FieldType = 'switch' | 'text' | 'password' | 'number' | 'url'

interface SettingField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  min?: number
  max?: number
}

interface SettingSection {
  key: string
  title: string
  fields: SettingField[]
}

const sections: SettingSection[] = [
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
    title: 'GitHub OAuth',
    fields: [
      { key: 'github_oauth_enabled', label: '启用 GitHub 登录', type: 'switch' },
      { key: 'github_client_id', label: 'Client ID', type: 'text', placeholder: 'Ov23li…' },
      {
        key: 'github_client_secret',
        label: 'Client Secret',
        type: 'password',
        placeholder: '留空则不修改',
      },
      {
        key: 'github_callback_url',
        label: 'Callback URL',
        type: 'url',
        placeholder: 'https://example.com/api/auth/github/callback',
      },
    ],
  },
  {
    key: 'turnstile',
    title: 'Cloudflare Turnstile',
    fields: [
      { key: 'turnstile_enabled', label: '启用 Turnstile', type: 'switch' },
      { key: 'turnstile_site_key', label: 'Site Key', type: 'text', placeholder: '0x4AAAA…' },
      {
        key: 'turnstile_secret_key',
        label: 'Secret Key',
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
const knownKeys = new Set(sections.flatMap((section) => section.fields.map((field) => field.key)))
const retiredKeys = new Set(['daily_checkin_quota'])
const activeSection = ref('access')
const visibleSections = computed(() =>
  sections.filter((section) => section.key === activeSection.value),
)
const loading = ref(false)
const savingSection = ref('')
const settings = ref<SystemSetting[]>([])
const values = reactive<Record<string, string>>({})
const originalValues = reactive<Record<string, string>>({})
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

const isFieldDirty = (field: SettingField) => {
  const value = values[field.key] ?? ''
  if (secretKeys.has(field.key)) return Boolean(value)
  const normalized = field.type === 'switch' ? normalizeBoolean(value) : value.trim()
  return normalized !== (originalValues[field.key] ?? '')
}

const isSectionDirty = (section: SettingSection) => section.fields.some(isFieldDirty)

const loadSettings = async () => {
  const requestVersion = ++loadVersion
  loading.value = true
  try {
    const response = await getSystemSettings()
    if (requestVersion !== loadVersion) return
    if (!response.success || !response.data) throw new Error(response.error || '获取系统设置失败')

    settings.value = response.data
    const byKey = new Map(response.data.map((setting) => [setting.setting_key, setting]))
    for (const section of sections) {
      for (const field of section.fields) {
        const setting = byKey.get(field.key)
        if (secretKeys.has(field.key)) {
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
    if (!values.github_client_id?.trim()) return '启用 GitHub 登录前请填写 Client ID'
    if (!configuredSecrets.github_client_secret && !values.github_client_secret)
      return '启用 GitHub 登录前请填写 Client Secret'
  }
  if (section.key === 'turnstile' && toBoolean(values.turnstile_enabled)) {
    if (!values.turnstile_site_key?.trim()) return '启用 Turnstile 前请填写 Site Key'
    if (!configuredSecrets.turnstile_secret_key && !values.turnstile_secret_key)
      return '启用 Turnstile 前请填写 Secret Key'
  }
  return ''
}

const saveSection = async (section: SettingSection) => {
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
  const payload = Object.fromEntries(
    changedFields.map((field) => {
      const rawValue = values[field.key] ?? ''
      const value = field.type === 'switch' ? normalizeBoolean(rawValue) : rawValue.trim()
      return [field.key, value]
    }),
  )

  try {
    const response = await updateSystemSettings(payload)
    if (!response.success) throw new Error(response.error || '保存系统设置失败')
    const adminPasswordChanged = changedFields.some((field) => field.key === 'admin_password')
    for (const field of changedFields) {
      const value = payload[field.key]
      if (secretKeys.has(field.key)) {
        configuredSecrets[field.key] = true
        values[field.key] = ''
        if (field.key === 'admin_password') adminPasswordConfirmation.value = ''
      } else {
        originalValues[field.key] = value ?? ''
        values[field.key] = value ?? ''
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

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <el-tabs v-model="activeSection" class="settings-tabs" aria-label="设置分类">
      <el-tab-pane v-for="section in sections" :key="section.key" :name="section.key">
        <template #label>
          <span class="settings-tab-label"
            >{{ section.title
            }}<span
              v-if="isSectionDirty(section)"
              class="settings-tab-dot"
              aria-label="有未保存修改"
          /></span>
        </template>
      </el-tab-pane>
      <el-tab-pane v-if="unknownSettings.length" name="other" label="其他配置" />
    </el-tabs>

    <div v-if="loading && !settings.length" class="settings-skeleton" aria-label="正在加载系统设置">
      <el-skeleton v-for="index in 3" :key="index" :rows="4" animated />
    </div>

    <div v-else class="settings-sections">
      <section
        v-for="section in visibleSections"
        :key="section.key"
        class="settings-section"
        :aria-label="section.title"
      >
        <div class="settings-fields">
          <div v-for="field in section.fields" :key="field.key" class="settings-field">
            <div class="settings-field-copy">
              <label :for="`setting-${field.key}`">{{ field.label }}</label>
              <span v-if="secretKeys.has(field.key)" class="secret-status">
                <font-awesome-icon
                  :icon="['fas', configuredSecrets[field.key] ? 'circle-check' : 'circle-minus']"
                />
                {{ configuredSecrets[field.key] ? '已配置' : '未配置' }}
              </span>
            </div>

            <div class="settings-control">
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
              <el-input
                v-else
                :id="`setting-${field.key}`"
                v-model="values[field.key]"
                :type="field.type === 'password' ? 'password' : 'text'"
                :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
                :show-password="field.type === 'password'"
                :placeholder="field.placeholder"
                maxlength="512"
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
            保存设置
          </el-button>
        </footer>
      </section>

      <section
        v-if="activeSection === 'other' && unknownSettings.length"
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
    </div>
  </div>
</template>
