import type { Env, JWTPayload, TokenPair, User } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'

export class JWTService {
  private readonly ACCESS_TOKEN_EXPIRES = 15 * 60
  private readonly REFRESH_TOKEN_EXPIRES = 30 * 24 * 60 * 60

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {}

  async generateTokenPair(user: Pick<User, 'id' | 'email' | 'role'>): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(user, 'access', this.ACCESS_TOKEN_EXPIRES),
      this.generateToken(user, 'refresh', this.REFRESH_TOKEN_EXPIRES)
    ])
    await this.storeRefreshToken(user.id, refreshToken)
    return { accessToken, refreshToken }
  }

  private async generateToken(
    user: Pick<User, 'id' | 'email' | 'role'>,
    type: 'access' | 'refresh',
    lifetime: number
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return await this.signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      type,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + lifetime
    })
  }

  private async signJWT(payload: JWTPayload): Promise<string> {
    const key = await this.signingKey(['sign'])
    const encodedHeader = this.base64UrlEncode(
      new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    )
    const encodedPayload = this.base64UrlEncode(
      new TextEncoder().encode(JSON.stringify(payload))
    )
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    const signature = await crypto.subtle.sign('HMAC', key, data)
    return `${encodedHeader}.${encodedPayload}.${this.base64UrlEncode(new Uint8Array(signature))}`
  }

  async verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
      if (token.length > 8192) return null
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const [encodedHeader, encodedPayload, encodedSignature] = parts
      if (!encodedHeader || !encodedPayload || !encodedSignature) return null

      const header = JSON.parse(this.decodeText(encodedHeader)) as { alg?: unknown; typ?: unknown }
      if (header.alg !== 'HS256' || header.typ !== 'JWT') return null

      const signatureBytes = this.base64UrlDecode(encodedSignature)
      const signature = signatureBytes.buffer.slice(
        signatureBytes.byteOffset,
        signatureBytes.byteOffset + signatureBytes.byteLength
      ) as ArrayBuffer
      const validSignature = await crypto.subtle.verify(
        'HMAC',
        await this.signingKey(['verify']),
        signature,
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
      )
      if (!validSignature) return null

      const payload = JSON.parse(this.decodeText(encodedPayload)) as Partial<JWTPayload>
      const now = Math.floor(Date.now() / 1000)
      if (
        !Number.isSafeInteger(payload.userId) ||
        typeof payload.email !== 'string' ||
        !['user', 'admin'].includes(payload.role || '') ||
        !['access', 'refresh'].includes(payload.type || '') ||
        typeof payload.jti !== 'string' ||
        payload.jti.length < 16 ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.iat > now + 300 ||
        payload.exp <= now - 30 ||
        payload.exp <= payload.iat
      ) {
        return null
      }
      return payload as JWTPayload
    } catch (error) {
      console.warn('JWT verification rejected:', error instanceof Error ? error.message : error)
      return null
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.verifyJWT(refreshToken)
    if (!payload || payload.type !== 'refresh') return null

    const tokenHash = await this.hashToken(refreshToken)
    const consumedUserId = await this.dbService.consumeRefreshToken(tokenHash)
    if (consumedUserId !== payload.userId) return null

    const user = await this.dbService.getAuthPrincipalById(payload.userId)
    if (!user || !user.is_active) return null

    return await this.generateTokenPair(user)
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    if (!refreshToken || refreshToken.length > 8192) return
    await this.dbService.revokeRefreshToken(await this.hashToken(refreshToken))
  }

  private async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES * 1000).toISOString()
    await this.dbService.storeRefreshToken(userId, await this.hashToken(refreshToken), expiresAt)
  }

  private async signingKey(usages: KeyUsage[]): Promise<CryptoKey> {
    if (!this.env.JWT_SECRET || this.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters')
    }
    return await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      usages
    )
  }

  private async hashToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private base64UrlDecode(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='))
    return Uint8Array.from(binary, character => character.charCodeAt(0))
  }

  private decodeText(value: string): string {
    return new TextDecoder().decode(this.base64UrlDecode(value))
  }
}
