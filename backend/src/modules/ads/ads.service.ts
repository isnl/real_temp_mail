import type { Env, GenerateQRCodeResponse, VerifyAdStatusResponse } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { ValidationError } from '@/types'

export class AdsService {
  private db: DatabaseService

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB)
  }

  /**
   * 生成广告二维码
   */
  async generateQRCode(userId: number): Promise<GenerateQRCodeResponse> {
    try {
      console.log(`Generating QR code for user ${userId}`)

      // 调用小程序后台API生成二维码
      const response = await fetch('https://ai.iiter.cn/mp/ads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'Temp41*6_Key!@'
        },
        body: JSON.stringify({
          userId: userId,
          source: 'temp-email',
          page: 'pages/ads/index'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string }
        throw new ValidationError(errorData.message || '生成二维码失败')
      }

      // 获取响应头中的code
      const code = response.headers.get('X-Ad-Code')
      if (!code) {
        throw new ValidationError('未能获取广告码')
      }

      // 获取二维码图片数据
      const qrCodeBuffer = await response.arrayBuffer()
      
      // 将二维码转换为base64数据URL
      const base64 = btoa(String.fromCharCode(...new Uint8Array(qrCodeBuffer)))
      const qrCodeUrl = `data:image/png;base64,${base64}`

      console.log(`QR code generated successfully for user ${userId}, code: ${code}`)

      return {
        qrCodeUrl,
        code
      }
    } catch (error: any) {
      console.error('Generate QR code error:', error)
      throw new ValidationError(error.message || '生成二维码失败')
    }
  }

  /**
   * 验证广告观看状态并发放奖励
   */
  async verifyAdStatus(userId: number, code: string): Promise<VerifyAdStatusResponse> {
    try {
      console.log(`Verifying ad status for user ${userId}, code: ${code}`)

      // 调用小程序后台API验证状态
      const response = await fetch(`https://ai.iiter.cn/mp/ads/status/${code}`, {
        method: 'GET',
        headers: {
          'x-api-key': 'Temp41*6_Key!@'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string }
        throw new ValidationError(errorData.message || '验证广告状态失败')
      }

      const data = await response.json() as {
        code: number
        message?: string
        data?: {
          userId: number
          status: boolean
        }
      }

      if (data.code !== 200) {
        throw new ValidationError(data.message || '验证广告状态失败')
      }

      const adRecord = data.data

      if (!adRecord) {
        throw new ValidationError('广告记录不存在')
      }

      // 检查广告是否已观看完成
      if (!adRecord.status) {
        return {
          success: false,
          message: '广告尚未观看完成，请完整观看广告后再试'
        }
      }

      // 检查用户ID是否匹配
      if (adRecord.userId !== userId) {
        throw new ValidationError('用户ID不匹配')
      }

      // 检查是否已经发放过奖励（防止重复发放）
      const { logs } = await this.db.getUserQuotaLogs(userId, 1, 100)
      const existingReward = logs.find(log =>
        log.source === 'ad_reward' &&
        log.description?.includes(code)
      )

      if (existingReward) {
        return {
          success: false,
          message: '该广告奖励已经发放过了'
        }
      }

      // 发放2个永久配额奖励
      const rewardQuota = 2

      // 创建配额记录
      await this.db.createQuotaLog({
        userId,
        type: 'earn',
        amount: rewardQuota,
        source: 'ad_reward',
        description: `观看广告获得配额奖励 (code: ${code})`
      })

      // 创建配额余额记录
      await this.db.createQuotaBalance({
        userId,
        quotaType: 'permanent',
        amount: rewardQuota,
        source: 'ad_reward'
      })

      // 获取用户最新配额
      const quotaInfo = await this.db.getUserTotalQuota(userId)

      // 更新用户表中的配额字段（保持向后兼容）
      await this.db.updateUserQuota(userId, quotaInfo.available)

      return {
        success: true,
        message: `恭喜！观看广告完成，获得 ${rewardQuota} 个永久配额`,
        quota: quotaInfo.available
      }
    } catch (error: any) {
      console.error('Verify ad status error:', error)
      throw new ValidationError(error.message || '验证广告状态失败')
    }
  }
}
