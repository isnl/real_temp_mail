import type {
  Env,
  TempEmail,
  Email,
  Domain,
  CreateEmailRequest,
  PublicInboxResponse,
  RedeemRequest,
  PaginationParams,
  PaginatedResponse,
  PublicEmailDetail
} from '@/types'
import { AppError, ValidationError, NotFoundError } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { generateEmailPrefix } from '@/utils/crypto'

export class EmailService {
  private readonly PUBLIC_INBOX_ACCESS_EXPIRES = 10 * 60
  private readonly EMAIL_GENERATION_ATTEMPTS = 8

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {}

  async createTempEmail(userId: number, request: CreateEmailRequest, httpRequest?: Request): Promise<TempEmail> {
    if (!request || !Number.isSafeInteger(request.domainId) || request.domainId <= 0) {
      throw new ValidationError('无效的域名')
    }

    const domain = await this.dbService.getDomainById(request.domainId)
    if (!domain || domain.status !== 1) {
      throw new ValidationError('无效的域名')
    }

    const audit = httpRequest
      ? {
          ipAddress: this.clientIp(httpRequest).slice(0, 128),
          userAgent: (httpRequest.headers.get('User-Agent') || 'unknown').slice(0, 512)
        }
      : undefined

    for (let attempt = 0; attempt < this.EMAIL_GENERATION_ATTEMPTS; attempt++) {
      const email = `${generateEmailPrefix(12)}@${domain.domain}`
      try {
        const tempEmail = await this.dbService.createTempEmailWithQuota(
          userId,
          email,
          request.domainId,
          audit
        )
        if (!tempEmail) {
          throw new ValidationError('剩余配额不足，无法创建临时邮箱')
        }
        return tempEmail
      } catch (error) {
        if (this.dbService.isUniqueConstraintError(error) && attempt + 1 < this.EMAIL_GENERATION_ATTEMPTS) {
          continue
        }
        if (this.dbService.isUniqueConstraintError(error)) {
          throw new AppError('暂时无法生成唯一邮箱地址，请稍后重试', 503)
        }
        throw error
      }
    }

    throw new AppError('暂时无法生成邮箱地址，请稍后重试', 503)
  }

  async getTempEmails(userId: number): Promise<TempEmail[]> {
    return await this.dbService.getTempEmailsByUserId(userId)
  }

  async deleteTempEmail(userId: number, emailId: number): Promise<void> {
    const success = await this.dbService.deleteTempEmail(emailId, userId)
    if (!success) {
      throw new NotFoundError('临时邮箱不存在或无权限删除')
    }
  }

  async updateTempEmailPublicInbox(
    userId: number,
    emailId: number,
    publicInboxEnabled: boolean
  ): Promise<TempEmail> {
    const tempEmail = await this.dbService.updateTempEmailPublicInbox(
      emailId,
      userId,
      publicInboxEnabled
    )

    if (!tempEmail) {
      throw new NotFoundError('临时邮箱不存在或无权限修改')
    }

    return tempEmail
  }

  async getEmailsForTempEmail(
    userId: number, 
    tempEmailId: number, 
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Email>> {
    const tempEmail = await this.dbService.getTempEmailForUser(tempEmailId, userId)
    if (!tempEmail) {
      throw new NotFoundError('临时邮箱不存在或无权限访问')
    }

    return await this.dbService.getEmailsForTempEmail(tempEmailId, pagination, userId)
  }

  async getPublicInbox(
    emailAddress: string,
    pagination: PaginationParams,
    existingAccess?: { token: string; expiresAt: string }
  ): Promise<PublicInboxResponse> {
    const normalizedEmail = (emailAddress || '').trim().toLowerCase()

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ValidationError('请输入有效的邮箱地址')
    }

    const snapshot = await this.dbService.getPublicInboxSnapshot(normalizedEmail, pagination)
    if (!snapshot) {
      throw new NotFoundError('公开收件箱不存在或未开启')
    }
    const { tempEmail, emails } = snapshot

    let publicAccessToken = existingAccess?.token
    let publicAccessTokenExpiresAt = existingAccess?.expiresAt
    if (!publicAccessToken || !publicAccessTokenExpiresAt) {
      const tokenPayload = this.createPublicInboxAccessPayload(tempEmail.email)
      publicAccessToken = await this.signPublicInboxAccessToken(tokenPayload)
      publicAccessTokenExpiresAt = new Date(tokenPayload.exp * 1000).toISOString()
    }

    return {
      tempEmail: {
        email: tempEmail.email,
        created_at: tempEmail.created_at,
        public_inbox_enabled: tempEmail.public_inbox_enabled
      },
      emails,
      publicAccessToken,
      publicAccessTokenExpiresAt
    }
  }

  async getPublicEmailDetail(emailAddress: string, emailId: number): Promise<PublicEmailDetail> {
    const normalizedEmail = (emailAddress || '').trim().toLowerCase()
    if (!normalizedEmail || normalizedEmail.length > 254) {
      throw new ValidationError('请输入有效的邮箱地址')
    }
    const email = await this.dbService.getPublicEmailForInbox(emailId, normalizedEmail)
    if (!email) {
      throw new NotFoundError('邮件不存在或公开收件箱已关闭')
    }
    return email
  }

  async validatePublicInboxAccessToken(
    token: string | undefined,
    emailAddress: string
  ): Promise<{ token: string; expiresAt: string } | null> {
    if (!token || token.length > 2048 || !emailAddress) {
      return null
    }

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const [encodedPayload, encodedSignature, tokenEmailHash] = parts
      if (!encodedPayload || !encodedSignature || !tokenEmailHash) {
        return null
      }

      const payload = JSON.parse(this.base64UrlDecodeString(encodedPayload)) as {
        type?: string
        email?: string
        iat?: number
        exp?: number
      }

      const normalizedEmail = emailAddress.trim().toLowerCase()
      const now = Math.floor(Date.now() / 1000)
      const issuedAt = payload.iat
      const expiresAt = payload.exp
      if (
        payload.type !== 'public-inbox' ||
        payload.email !== normalizedEmail ||
        typeof issuedAt !== 'number' ||
        !Number.isInteger(issuedAt) ||
        typeof expiresAt !== 'number' ||
        !Number.isInteger(expiresAt) ||
        issuedAt > now + 60 ||
        expiresAt <= now ||
        expiresAt > issuedAt + this.PUBLIC_INBOX_ACCESS_EXPIRES
      ) {
        return null
      }

      const expectedEmailHash = await this.hashPublicInboxEmail(normalizedEmail)
      if (expectedEmailHash !== tokenEmailHash) {
        return null
      }

      const expectedSignature = await this.signPublicInboxAccessPayload(encodedPayload, tokenEmailHash)
      if (!this.safeCompare(expectedSignature, encodedSignature)) {
        return null
      }

      return {
        token,
        expiresAt: new Date(expiresAt * 1000).toISOString()
      }
    } catch (error) {
      console.warn('Public inbox token rejected:', error instanceof Error ? error.message : error)
      return null
    }
  }

  private createPublicInboxAccessPayload(emailAddress: string): {
    type: 'public-inbox'
    email: string
    iat: number
    exp: number
  } {
    const now = Math.floor(Date.now() / 1000)
    return {
      type: 'public-inbox',
      email: emailAddress.trim().toLowerCase(),
      iat: now,
      exp: now + this.PUBLIC_INBOX_ACCESS_EXPIRES
    }
  }

  private async signPublicInboxAccessToken(payload: {
    type: 'public-inbox'
    email: string
    iat: number
    exp: number
  }): Promise<string> {
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const emailHash = await this.hashPublicInboxEmail(payload.email)
    const signature = await this.signPublicInboxAccessPayload(encodedPayload, emailHash)

    return `${encodedPayload}.${signature}.${emailHash}`
  }

  private async signPublicInboxAccessPayload(encodedPayload: string, emailHash: string): Promise<string> {
    const signature = await this.hmacSha256(`${encodedPayload}.${emailHash}`)
    return this.base64UrlEncode(signature)
  }

  private async hashPublicInboxEmail(emailAddress: string): Promise<string> {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(emailAddress.trim().toLowerCase())
    )
    return this.base64UrlEncode(hash)
  }

  private async hmacSha256(value: string): Promise<ArrayBuffer> {
    if (!this.env.JWT_SECRET || this.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters')
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    return await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  }

  private base64UrlEncode(data: string | ArrayBuffer): string {
    const bytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : new Uint8Array(data)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const base64 = btoa(binary)

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  private base64UrlDecodeString(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    const binary = atob(padded)
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)))
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  async getEmailDetail(userId: number, emailId: number): Promise<Email> {
    const email = await this.dbService.getEmailForUser(emailId, userId)
    if (!email) {
      throw new NotFoundError('邮件不存在或无权限访问')
    }
    return email
  }

  async deleteEmail(userId: number, emailId: number): Promise<void> {
    const success = await this.dbService.deleteEmailForUser(emailId, userId)
    if (!success) {
      throw new NotFoundError('邮件不存在或无权限删除')
    }
  }

  async markEmailRead(userId: number, emailId: number): Promise<void> {
    const success = await this.dbService.markEmailReadForUser(emailId, userId)
    if (!success) {
      throw new NotFoundError('邮件不存在或无权限访问')
    }
  }

  async batchDeleteEmails(userId: number, emailIds: number[]): Promise<number> {
    return await this.dbService.batchDeleteEmailsForUser(emailIds, userId)
  }

  async getActiveDomains(): Promise<Domain[]> {
    return await this.dbService.getActiveDomains()
  }

  async redeemCode(userId: number, request: RedeemRequest): Promise<{ quota: number }> {
    const code = request?.code?.trim()
    if (!code || code.length > 128 || !/^[A-Za-z0-9_-]+$/.test(code)) {
      throw new ValidationError('兑换码格式无效')
    }

    const result = await this.dbService.redeemCodeAtomically(code, userId)
    if (!result) {
      throw new ValidationError('兑换码无效、已过期、次数已用尽或已兑换')
    }
    return { quota: result.quota }
  }

  // 获取用户配额信息
  async getQuotaInfo(userId: number): Promise<{ quota: number; used: number }> {
    const overview = await this.dbService.getQuotaOverview(userId)
    return {
      quota: overview.available,
      used: overview.used
    }
  }

  // 搜索邮件
  async searchEmails(
    userId: number,
    params: {
      tempEmailId?: number
      keyword?: string
      sender?: string
      dateFrom?: string
      dateTo?: string
    } & PaginationParams
  ): Promise<PaginatedResponse<Email>> {
    return await this.dbService.searchEmailsForUser(userId, params, params)
  }

  private clientIp(request: Request): string {
    const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    return request.headers.get('CF-Connecting-IP') || forwarded || 'unknown'
  }
}
