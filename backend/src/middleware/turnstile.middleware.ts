import type { Env, TurnstileResponse, ValidationError } from '@/types'

export class TurnstileService {
  constructor(private env: Env) {}

  async verifyToken(token: string, remoteIP?: string): Promise<boolean> {
    // 开发环境跳过验证
    if (this.env.ENVIRONMENT === 'development') {
      return true
    }

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret: this.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: remoteIP
        })
      })

      if (!response.ok) {
        console.error('Turnstile API error:', response.status, response.statusText)
        return false
      }

      const result: TurnstileResponse = await response.json()
      
      if (!result.success) {
        console.error('Turnstile verification failed:', result['error-codes'])
        return false
      }

      return true
    } catch (error) {
      console.error('Turnstile verification error:', error)
      return false
    }
  }
}

export function createTurnstileMiddleware(env: Env) {
  const turnstileService = new TurnstileService(env)

  return async function turnstileMiddleware(
    request: Request,
    next: () => Promise<Response>
  ): Promise<Response> {
    // 只对需要验证的端点进行检查
    const url = new URL(request.url)
    const needsVerification = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/email/create',
      '/api/redeem'
    ].some(path => url.pathname === path)

    if (!needsVerification) {
      return next()
    }

    // 只对POST请求进行验证
    if (request.method !== 'POST') {
      return next()
    }

    try {
      const body = await request.json() as any
      const turnstileToken = body.turnstileToken

      if (!turnstileToken) {
        return new Response(JSON.stringify({
          success: false,
          error: '缺少人机验证令牌'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 获取客户端IP
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      request.headers.get('X-Real-IP')

      const isValid = await turnstileService.verifyToken(turnstileToken, clientIP || undefined)

      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: '人机验证失败，请重试'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 验证通过，继续处理请求
      // 重新构造请求，因为body已经被读取
      const newRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body)
      })

      return next()
    } catch (error) {
      console.error('Turnstile middleware error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: '验证过程中发生错误'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
