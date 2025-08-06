import type {
  Env,
  TempEmail,
  Email,
  Domain,
  CreateEmailRequest,
  RedeemRequest,
  PaginationParams,
  PaginatedResponse
} from '@/types'
import { ValidationError, NotFoundError } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { EmailParserService } from './parser.service'

export class EmailService {
  private parserService: EmailParserService

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {
    this.parserService = new EmailParserService()
  }

  async createTempEmail(userId: number, request: CreateEmailRequest): Promise<TempEmail> {
    // 1. 检查用户剩余配额
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    console.log(`用户 ${userId} 当前剩余配额: ${user.quota}`)

    if (user.quota <= 0) {
      console.log(`用户 ${userId} 配额不足，当前剩余: ${user.quota}`)
      throw new ValidationError('剩余配额不足，无法创建临时邮箱')
    }

    // 2. 验证域名
    const domain = await this.dbService.getDomainById(request.domainId)
    if (!domain || domain.status !== 1) {
      throw new ValidationError('无效的域名')
    }

    // 3. 生成随机邮箱前缀
    const prefix = this.generateEmailPrefix()
    const email = `${prefix}@${domain.domain}`

    // 4. 检查邮箱是否已存在
    const existingEmail = await this.dbService.getTempEmailByEmail(email)
    if (existingEmail) {
      // 如果存在，重新生成
      return this.createTempEmail(userId, request)
    }

    // 5. 原子操作：扣除剩余配额并创建邮箱
    const success = await this.dbService.decrementUserQuota(userId)
    if (!success) {
      throw new ValidationError('剩余配额不足，无法创建临时邮箱')
    }

    try {
      const tempEmail = await this.dbService.createTempEmail(userId, email, request.domainId)

      // 6. 创建配额消费记录
      await this.dbService.createQuotaLog({
        userId,
        type: 'consume',
        amount: 1,
        source: 'create_email',
        description: `创建临时邮箱: ${email}`,
        relatedId: tempEmail.id
      })

      // 7. 记录日志
      await this.dbService.createLog({
        userId,
        action: 'CREATE_EMAIL',
        details: `Created temp email: ${email}`
      })

      return tempEmail
    } catch (error) {
      // 如果创建失败，恢复剩余配额（加回被扣除的1个配额）
      await this.dbService.updateUserQuota(userId, user.quota)
      throw error
    }
  }

  async getTempEmails(userId: number): Promise<TempEmail[]> {
    return await this.dbService.getTempEmailsByUserId(userId)
  }

  async deleteTempEmail(userId: number, emailId: number): Promise<void> {
    const success = await this.dbService.deleteTempEmail(emailId, userId)
    if (!success) {
      throw new NotFoundError('临时邮箱不存在或无权限删除')
    }

    // 记录日志
    await this.dbService.createLog({
      userId,
      action: 'DELETE_EMAIL',
      details: `Deleted temp email ID: ${emailId}`
    })
  }

  async getEmailsForTempEmail(
    userId: number, 
    tempEmailId: number, 
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Email>> {
    // 验证临时邮箱是否属于当前用户
    const tempEmails = await this.dbService.getTempEmailsByUserId(userId)
    const tempEmail = tempEmails.find(email => email.id === tempEmailId)
    
    if (!tempEmail) {
      throw new NotFoundError('临时邮箱不存在或无权限访问')
    }

    return await this.dbService.getEmailsForTempEmail(tempEmailId, pagination)
  }

  async deleteEmail(userId: number, emailId: number): Promise<void> {
    // 这里需要验证邮件是否属于用户的临时邮箱
    // 为简化，暂时直接删除，实际应用中需要添加权限检查
    const success = await this.dbService.deleteEmail(emailId)
    if (!success) {
      throw new NotFoundError('邮件不存在')
    }

    // 记录日志
    await this.dbService.createLog({
      userId,
      action: 'DELETE_EMAIL_CONTENT',
      details: `Deleted email ID: ${emailId}`
    })
  }

  async getActiveDomains(): Promise<Domain[]> {
    return await this.dbService.getActiveDomains()
  }

  async redeemCode(userId: number, request: RedeemRequest): Promise<{ quota: number }> {
    // 1. 验证兑换码
    const redeemCode = await this.dbService.getRedeemCode(request.code)
    if (!redeemCode) {
      throw new ValidationError('兑换码不存在')
    }

    if (redeemCode.used) {
      throw new ValidationError('兑换码已被使用')
    }

    if (new Date(redeemCode.valid_until) < new Date()) {
      throw new ValidationError('兑换码已过期')
    }

    // 2. 使用兑换码
    const success = await this.dbService.useRedeemCode(request.code, userId)
    if (!success) {
      throw new ValidationError('兑换码使用失败')
    }

    // 3. 更新用户配额
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const newQuota = user.quota + redeemCode.quota
    await this.dbService.updateUserQuota(userId, newQuota)

    // 4. 创建配额获得记录
    await this.dbService.createQuotaLog({
      userId,
      type: 'earn',
      amount: redeemCode.quota,
      source: 'redeem_code',
      description: `兑换码奖励: ${request.code}`
    })

    // 5. 记录日志
    await this.dbService.createLog({
      userId,
      action: 'REDEEM_CODE',
      details: `Redeemed code: ${request.code}, quota: ${redeemCode.quota}`
    })

    return { quota: newQuota }
  }

  // 处理接收到的邮件（由Email Routing触发）
  async handleIncomingEmail(rawEmail: string | ArrayBuffer, recipientEmail: string): Promise<void> {
    try {
      console.log('Processing incoming email for:', recipientEmail)

      // 1. 查找对应的临时邮箱
      const tempEmail = await this.dbService.getTempEmailByEmail(recipientEmail)
      if (!tempEmail || !tempEmail.active) {
        console.log('Temp email not found or inactive:', recipientEmail)
        return
      }

      // 2. 解析邮件内容
      const parsedEmail = await this.parserService.parseEmail(rawEmail)

      // 3. 存储邮件到数据库
      const email = await this.dbService.createEmail({
        tempEmailId: tempEmail.id,
        sender: parsedEmail.from.address,
        subject: parsedEmail.subject,
        content: parsedEmail.text,
        htmlContent: parsedEmail.html,
        verificationCode: parsedEmail.verificationCode
      })

      console.log('Email stored successfully:', email.id)

      // 4. 这里可以添加实时推送逻辑（WebSocket等）
      // await this.notifyUser(tempEmail.user_id, email)

    } catch (error) {
      console.error('Error handling incoming email:', error)
    }
  }

  private generateEmailPrefix(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    // 生成8-12位随机字符串
    const length = Math.floor(Math.random() * 5) + 8
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  }

  // 获取用户信息
  async getUserById(userId: number) {
    return await this.dbService.getUserById(userId)
  }

  // 获取用户配额信息
  async getQuotaInfo(userId: number): Promise<{ quota: number; used: number }> {
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 基于 quota_logs 计算已使用配额
    const used = await this.dbService.getUsedQuotaFromLogs(userId)

    return {
      quota: user.quota, // 现在 quota 字段表示剩余配额
      used
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
    // 这里需要实现复杂的搜索逻辑
    // 为简化，暂时返回空结果
    return {
      data: [],
      total: 0,
      page: params.page,
      limit: params.limit,
      totalPages: 0
    }
  }
}
