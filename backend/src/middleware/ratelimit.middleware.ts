import type { Env, SystemSettingKey } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { SystemSettingsService } from '@/modules/settings/settings.service'
import { normalizeIpForRateLimit } from '@/utils/ip'

export interface RateLimitRule {
  endpoint: string
  windowMs: number
  maxRequests: number
  turnstileSetting?: SystemSettingKey
}

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    endpoint: '/api/auth/bootstrap',
    windowMs: 15 * 60 * 1000,
    maxRequests: 5
  },
  {
    endpoint: '/api/auth/register',
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    turnstileSetting: 'turnstile_register_enabled'
  },
  {
    endpoint: '/api/auth/login',
    windowMs: 15 * 60 * 1000,
    maxRequests: 8,
    turnstileSetting: 'turnstile_login_enabled'
  },
  {
    endpoint: '/api/auth/github',
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  },
  {
    endpoint: '/api/auth/github/callback',
    windowMs: 15 * 60 * 1000,
    maxRequests: 10
  },
  {
    endpoint: '/api/auth/change-password',
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  },
  {
    endpoint: '/api/email/redeem',
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    turnstileSetting: 'turnstile_redeem_enabled'
  },
  {
    endpoint: '/api/email/public-inbox',
    windowMs: 5 * 60 * 1000,
    maxRequests: 30,
    turnstileSetting: 'turnstile_public_inbox_enabled'
  }
]

const TURNSTILE_ACTION_BY_ENDPOINT: Readonly<Record<string, string>> = {
  '/api/auth/login': 'login',
  '/api/auth/register': 'register',
  '/api/email/redeem': 'redeem',
  '/api/email/public-inbox': 'public-inbox'
}
const TURNSTILE_REQUEST_TIMEOUT_MS = 8_000

export function createRateLimitMiddleware(env: Env) {
  const dbService = new DatabaseService(env.DB)
  const settings = new SystemSettingsService(env)

  return {
    async checkRateLimit(
      request: Request,
      endpoint: string,
      userId?: number,
      options: { skipTurnstile?: boolean } = {}
    ): Promise<void> {
      const rule = RATE_LIMIT_RULES.find(candidate => candidate.endpoint === endpoint)
      if (!rule) return

      const identifier = generateIdentifier(request, userId)
      const currentCount = await dbService.createOrUpdateRateLimit(
        identifier,
        endpoint,
        rule.windowMs
      )

      if (currentCount > rule.maxRequests) {
        throw jsonError('请求过于频繁，请稍后再试', 429, {
          'Retry-After': String(Math.ceil(rule.windowMs / 1000))
        })
      }

      if (!options.skipTurnstile) {
        await this.checkTurnstile(request, endpoint)
      }
    },

    async checkTurnstile(request: Request, endpoint: string): Promise<void> {
      const rule = RATE_LIMIT_RULES.find(candidate => candidate.endpoint === endpoint)
      if (!rule?.turnstileSetting) return

      const publicSettings = await settings.getPublicSettings()
      const requiresTurnstile = rule.turnstileSetting === 'turnstile_login_enabled'
        ? publicSettings.turnstileLoginEnabled
        : rule.turnstileSetting === 'turnstile_register_enabled'
          ? publicSettings.turnstileRegisterEnabled
          : rule.turnstileSetting === 'turnstile_redeem_enabled'
            ? publicSettings.turnstileRedeemEnabled
            : rule.turnstileSetting === 'turnstile_public_inbox_enabled'
              ? publicSettings.turnstilePublicInboxEnabled
              : false
      if (requiresTurnstile) {
        const expectedAction = TURNSTILE_ACTION_BY_ENDPOINT[endpoint]
        if (!expectedAction) throw jsonError('人机验证路由配置无效', 500)
        await verifyTurnstile(request, settings, expectedAction)
      }
    }
  }
}

async function verifyTurnstile(
  request: Request,
  settings: SystemSettingsService,
  expectedAction: string
): Promise<void> {
  let body: { turnstileToken?: unknown }
  try {
    body = await request.clone().json() as { turnstileToken?: unknown }
  } catch {
    throw jsonError('请求体必须是有效 JSON', 400)
  }

  if (typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 4096) {
    throw jsonError('缺少或无效的人机验证令牌', 400)
  }

  const secret = await settings.getValue('turnstile_secret_key')
  if (!secret) {
    console.error('Turnstile is enabled but its secret key is not configured')
    throw jsonError('人机验证服务尚未正确配置', 503)
  }

  let response: Response
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: body.turnstileToken,
        remoteip: clientIp(request)
      }),
      signal: AbortSignal.timeout(TURNSTILE_REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    console.error('Turnstile request failed:', error)
    throw jsonError('人机验证服务暂时不可用', 503)
  }

  if (!response.ok) {
    console.error('Turnstile returned HTTP', response.status)
    throw jsonError('人机验证服务暂时不可用', 503)
  }

  const result = await response.json() as {
    success?: boolean
    action?: string
    hostname?: string
    'error-codes'?: string[]
  }
  if (!result.success) {
    console.warn('Turnstile verification rejected', result['error-codes'] ?? [])
    throw jsonError('人机验证失败，请重试', 400)
  }

  const expectedHostname = new URL(request.url).hostname.toLowerCase()
  if (
    result.action !== expectedAction ||
    typeof result.hostname !== 'string' ||
    result.hostname.toLowerCase() !== expectedHostname
  ) {
    console.warn('Turnstile verification rejected: action or hostname mismatch')
    throw jsonError('人机验证与当前操作不匹配，请重试', 400)
  }
}

function generateIdentifier(request: Request, userId?: number): string {
  const ip = normalizeIpForRateLimit(clientIp(request)).slice(0, 128)
  return userId === undefined ? `ip:${ip}` : `user:${userId}:${ip}`
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
  return request.headers.get('CF-Connecting-IP') || forwarded || 'unknown'
}

function jsonError(message: string, status: number, extraHeaders?: HeadersInit): Response {
  return Response.json(
    { success: false, error: message },
    { status, headers: extraHeaders }
  )
}

export function withRateLimit(env: Env, endpoint: string) {
  const middleware = createRateLimitMiddleware(env)
  return function rateLimitDecorator<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
    return (async function(request: Request, ...args: any[]): Promise<Response> {
      try {
        const principal = args.find(argument =>
          argument && typeof argument === 'object' && typeof argument.userId === 'number'
        ) as { userId?: number } | undefined
        await middleware.checkRateLimit(request, endpoint, principal?.userId)
        return await handler(request, ...args)
      } catch (error) {
        if (error instanceof Response) return error
        console.error('Rate limit middleware error:', error)
        return jsonError('限流检查过程中发生错误', 500)
      }
    }) as T
  }
}
