import { getGitHubCallbackUrl } from '@/utils/site-url'
import type {
  Env,
  PublicSystemSettings,
  SystemSetting,
  SystemSettingKey
} from '@/types'
import { ValidationError } from '@/types'

type SettingKind = 'boolean' | 'integer' | 'string' | 'url' | 'username' | 'password'

interface SettingDefinition {
  defaultValue: string
  description: string
  kind: SettingKind
  secret?: boolean
}

export const SECRET_MASK = '********'

export const SYSTEM_SETTING_DEFINITIONS: Record<SystemSettingKey, SettingDefinition> = {
  default_user_quota: {
    defaultValue: '5',
    description: '新用户默认配额',
    kind: 'integer'
  },
  registration_enabled: {
    defaultValue: 'true',
    description: '允许新用户注册',
    kind: 'boolean'
  },
  turnstile_enabled: {
    defaultValue: 'false',
    description: '启用 Cloudflare Turnstile',
    kind: 'boolean'
  },
  turnstile_site_key: {
    defaultValue: '',
    description: 'Cloudflare Turnstile Site Key',
    kind: 'string'
  },
  turnstile_secret_key: {
    defaultValue: '',
    description: 'Cloudflare Turnstile Secret Key',
    kind: 'string',
    secret: true
  },
  turnstile_login_enabled: {
    defaultValue: 'false',
    description: '登录时要求人机验证',
    kind: 'boolean'
  },
  turnstile_register_enabled: {
    defaultValue: 'false',
    description: '注册时要求人机验证',
    kind: 'boolean'
  },
  turnstile_redeem_enabled: {
    defaultValue: 'false',
    description: '使用兑换码时要求人机验证',
    kind: 'boolean'
  },
  turnstile_public_inbox_enabled: {
    defaultValue: 'false',
    description: '首次访问公开收件箱时要求人机验证',
    kind: 'boolean'
  },
  github_oauth_enabled: {
    defaultValue: 'false',
    description: '启用 GitHub 登录',
    kind: 'boolean'
  },
  github_client_id: {
    defaultValue: '',
    description: 'GitHub OAuth Client ID',
    kind: 'string'
  },
  github_client_secret: {
    defaultValue: '',
    description: 'GitHub OAuth Client Secret',
    kind: 'string',
    secret: true
  },
  github_callback_url: {
    defaultValue: '',
    description: 'GitHub OAuth 回调地址（由站点自动生成）',
    kind: 'url'
  },
  admin_username: {
    defaultValue: 'admin',
    description: '主管理员登录账号',
    kind: 'username'
  },
  admin_password: {
    defaultValue: '',
    description: '主管理员新密码（只写，留空保持不变）',
    kind: 'password',
    secret: true
  }
}

const SETTING_KEYS = Object.keys(SYSTEM_SETTING_DEFINITIONS) as SystemSettingKey[]

export class SystemSettingsService {
  private settingsPromise?: Promise<Map<SystemSettingKey, string>>

  constructor(private env: Env) {}

  isKnownKey(key: string): key is SystemSettingKey {
    return Object.prototype.hasOwnProperty.call(SYSTEM_SETTING_DEFINITIONS, key)
  }

  async getAllValues(): Promise<Map<SystemSettingKey, string>> {
    if (!this.settingsPromise) {
      this.settingsPromise = this.loadValues()
    }
    return await this.settingsPromise
  }

  async getValue(key: SystemSettingKey): Promise<string> {
    const values = await this.getAllValues()
    return values.get(key) ?? SYSTEM_SETTING_DEFINITIONS[key].defaultValue
  }

  async getBoolean(key: SystemSettingKey): Promise<boolean> {
    return (await this.getValue(key)) === 'true'
  }

  async getInteger(key: SystemSettingKey): Promise<number> {
    const parsed = Number.parseInt(await this.getValue(key), 10)
    return Number.isFinite(parsed) ? parsed : Number.parseInt(SYSTEM_SETTING_DEFINITIONS[key].defaultValue, 10)
  }

  async getPublicSettings(): Promise<PublicSystemSettings> {
    const values = await this.getAllValues()
    const value = (key: SystemSettingKey) => values.get(key) ?? SYSTEM_SETTING_DEFINITIONS[key].defaultValue
    const enabled = (key: SystemSettingKey) => value(key) === 'true'
    // Expose the administrator's security intent even if a key later becomes
    // unavailable. Middleware then fails closed with 503 instead of silently
    // disabling a configured challenge.
    const turnstileEnabled = enabled('turnstile_enabled')
    const githubConfigured = Boolean(value('github_client_id') && value('github_client_secret'))

    return {
      registrationEnabled: enabled('registration_enabled'),
      githubEnabled: enabled('github_oauth_enabled') && githubConfigured,
      turnstileEnabled,
      turnstileSiteKey: turnstileEnabled ? value('turnstile_site_key') : '',
      turnstileLoginEnabled: turnstileEnabled && enabled('turnstile_login_enabled'),
      turnstileRegisterEnabled: turnstileEnabled && enabled('turnstile_register_enabled'),
      turnstileRedeemEnabled: turnstileEnabled && enabled('turnstile_redeem_enabled'),
      turnstilePublicInboxEnabled: turnstileEnabled && enabled('turnstile_public_inbox_enabled')
    }
  }

  async getAdminSettings(requestUrl?: string): Promise<SystemSetting[]> {
    const result = await this.env.DB.prepare(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings
      WHERE setting_key IN (${SETTING_KEYS.map(() => '?').join(', ')})
      ORDER BY setting_key
    `).bind(...SETTING_KEYS).all<SystemSetting>()

    const rows = new Map((result.results ?? []).map(row => [row.setting_key, row]))
    const output: SystemSetting[] = []

    for (const key of SETTING_KEYS) {
      const definition = SYSTEM_SETTING_DEFINITIONS[key]
      const row = rows.get(key)
      const raw = key === 'github_callback_url' ? getGitHubCallbackUrl(this.env, requestUrl) : (row?.setting_value ?? definition.defaultValue)
      const decrypted = definition.secret && raw ? await this.decrypt(raw) : raw
      const configured = key === 'admin_password'
        ? await this.hasPrimaryAdminPassword()
        : Boolean(decrypted)

      output.push({
        id: row?.id ?? 0,
        setting_key: key,
        setting_value: definition.secret ? (configured ? SECRET_MASK : '') : decrypted,
        description: row?.description ?? definition.description,
        created_at: row?.created_at ?? '',
        updated_at: row?.updated_at ?? '',
        is_secret: Boolean(definition.secret),
        is_configured: configured
      })
    }

    return output
  }

  async setValue(key: SystemSettingKey, input: string): Promise<'updated' | 'preserved'> {
    const result = await this.setValues({ [key]: input })
    return result[key] ?? 'preserved'
  }

  async setValues(
    inputs: Partial<Record<SystemSettingKey, string>>,
    additionalStatements: D1PreparedStatement[] = []
  ): Promise<Partial<Record<SystemSettingKey, 'updated' | 'preserved'>>> {
    const current = new Map(await this.getAllValues())
    const normalized = new Map<SystemSettingKey, string>()
    const result: Partial<Record<SystemSettingKey, 'updated' | 'preserved'>> = {}

    for (const [untypedKey, input] of Object.entries(inputs)) {
      if (!this.isKnownKey(untypedKey)) throw new ValidationError(`未知的系统设置: ${untypedKey}`)
      if (typeof input !== 'string') throw new ValidationError(`${untypedKey} 的值必须是字符串`)
      if (untypedKey === 'github_callback_url') throw new ValidationError('GitHub 回调地址由站点自动生成，不能修改')
      const key = untypedKey
      const definition = SYSTEM_SETTING_DEFINITIONS[key]
      if (
        (definition.secret && input === SECRET_MASK) ||
        (key === 'admin_password' && input.trim() === '')
      ) {
        result[key] = 'preserved'
        continue
      }
      const value = this.validateAndNormalize(key, input)
      normalized.set(key, value)
      current.set(key, value)
      result[key] = 'updated'
    }

    this.validateEffectiveConfiguration(current)

    const statements = [...additionalStatements]
    for (const [key, value] of normalized) {
      // The administrator password is write-only and is stored only as a hash
      // on the user record by AdminService.
      if (key === 'admin_password') continue
      const definition = SYSTEM_SETTING_DEFINITIONS[key]
      const storedValue = definition.secret && value ? await this.encrypt(value) : value
      statements.push(this.env.DB.prepare(`
        INSERT INTO system_settings (setting_key, setting_value, description, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          description = excluded.description,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key, storedValue, definition.description))
    }

    if (statements.length > 0) await this.env.DB.batch(statements)
    this.settingsPromise = undefined
    return result
  }

  private validateEffectiveConfiguration(values: Map<SystemSettingKey, string>): void {
    const get = (key: SystemSettingKey) => values.get(key) ?? SYSTEM_SETTING_DEFINITIONS[key].defaultValue
    if (get('turnstile_enabled') === 'true' && (!get('turnstile_site_key') || !get('turnstile_secret_key'))) {
      throw new ValidationError('启用 Turnstile 前必须先配置 Site Key 和 Secret Key')
    }
    if (get('github_oauth_enabled') === 'true' && (!get('github_client_id') || !get('github_client_secret'))) {
      throw new ValidationError('启用 GitHub 登录前必须先配置 Client ID 和 Client Secret')
    }
  }

  validateAndNormalize(key: SystemSettingKey, input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('设置值必须是字符串')
    }

    const value = input.trim()
    const definition = SYSTEM_SETTING_DEFINITIONS[key]

    switch (definition.kind) {
      case 'boolean': {
        const lower = value.toLowerCase()
        if (!['true', 'false', '1', '0'].includes(lower)) {
          throw new ValidationError(`${key} 必须是布尔值`)
        }
        return lower === 'true' || lower === '1' ? 'true' : 'false'
      }
      case 'integer': {
        if (!/^\d+$/.test(value)) {
          throw new ValidationError(`${key} 必须是非负整数`)
        }
        const parsed = Number(value)
        if (!Number.isSafeInteger(parsed) || parsed > 100000) {
          throw new ValidationError(`${key} 超出允许范围`)
        }
        return String(parsed)
      }
      case 'url': {
        if (!value) return ''
        let url: URL
        try {
          url = new URL(value)
        } catch {
          throw new ValidationError(`${key} 必须是有效 URL`)
        }
        const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
        if (url.protocol !== 'https:' && !localHttp) {
          throw new ValidationError(`${key} 必须使用 HTTPS`)
        }
        return url.toString()
      }
      case 'username':
        if (!/^[A-Za-z0-9_.-]{3,64}$/.test(value)) {
          throw new ValidationError('管理员账号须为 3-64 位字母、数字、点、下划线或短横线')
        }
        return value.toLowerCase()
      case 'password':
        if (value && (value.length < 8 || value.length > 128)) {
          throw new ValidationError('管理员密码长度须为 8-128 位')
        }
        return value
      default:
        if (value.length > 2048) {
          throw new ValidationError(`${key} 长度不能超过 2048`)
        }
        return value
    }
  }

  private async loadValues(): Promise<Map<SystemSettingKey, string>> {
    const result = await this.env.DB.prepare(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key IN (${SETTING_KEYS.map(() => '?').join(', ')})
    `).bind(...SETTING_KEYS).all<Pick<SystemSetting, 'setting_key' | 'setting_value'>>()

    const values = new Map<SystemSettingKey, string>()
    for (const row of result.results ?? []) {
      if (!this.isKnownKey(row.setting_key)) continue
      const definition = SYSTEM_SETTING_DEFINITIONS[row.setting_key]
      values.set(
        row.setting_key,
        definition.secret && row.setting_value ? await this.decrypt(row.setting_value) : row.setting_value
      )
    }
    return values
  }

  private async hasPrimaryAdminPassword(): Promise<boolean> {
    const row = await this.env.DB.prepare(`
      SELECT password_hash FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    `).first<{ password_hash: string | null }>()
    return Boolean(row?.password_hash)
  }

  private async encryptionKey(): Promise<CryptoKey> {
    if (!this.env.JWT_SECRET || this.env.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET must be configured with at least 16 characters')
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.env.JWT_SECRET))
    return await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  }

  private async encrypt(value: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.encryptionKey(),
      new TextEncoder().encode(value)
    )
    return `enc:v1:${this.encodeBytes(iv)}.${this.encodeBytes(new Uint8Array(encrypted))}`
  }

  private async decrypt(value: string): Promise<string> {
    if (!value.startsWith('enc:v1:')) {
      return value
    }
    const [ivPart, encryptedPart] = value.slice('enc:v1:'.length).split('.')
    if (!ivPart || !encryptedPart) {
      throw new Error('Invalid encrypted setting value')
    }
    const ivBytes = this.decodeBytes(ivPart)
    const encryptedBytes = this.decodeBytes(encryptedPart)
    const iv = ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer
    const encrypted = encryptedBytes.buffer.slice(
      encryptedBytes.byteOffset,
      encryptedBytes.byteOffset + encryptedBytes.byteLength
    ) as ArrayBuffer
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await this.encryptionKey(),
      encrypted
    )
    return new TextDecoder().decode(decrypted)
  }

  private encodeBytes(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private decodeBytes(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='))
    return Uint8Array.from(binary, character => character.charCodeAt(0))
  }
}
