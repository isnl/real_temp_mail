import type { 
  Env, 
  CheckinRequest, 
  CheckinResponse,
  UserCheckin,
  QuotaLog
} from '@/types'

import { 
  ValidationError, 
  NotFoundError 
} from '@/types'

import { DatabaseService } from '@/modules/shared/database.service'

export class CheckinService {
  private dbService: DatabaseService

  constructor(private env: Env) {
    this.dbService = new DatabaseService(env.DB)
  }

  /**
   * 用户签到
   */
  async checkin(userId: number, request?: Request): Promise<CheckinResponse> {
    // 1. 检查用户是否存在
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 2. 检查今日是否已签到
    const todayCheckin = await this.dbService.getTodayCheckin(userId)
    if (todayCheckin) {
      throw new ValidationError('今日已签到，请明天再来')
    }

    // 3. 获取签到奖励配额设置
    const setting = await this.dbService.getSystemSetting('daily_checkin_quota')
    const quotaReward = parseInt(setting?.setting_value || '1')

    // 4. 开始事务：创建签到记录、创建配额余额、创建配额记录
    try {
      // 创建签到记录
      const checkinRecord = await this.dbService.createCheckin(userId, quotaReward)

      // 计算当天24点过期时间（中国时区）
      const now = new Date()
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const endOfDay = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate(), 23, 59, 59, 999)
      const expiresAt = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000).toISOString() // 转回UTC时间

      // 创建配额余额记录（当天24点过期）
      await this.dbService.createQuotaBalance({
        userId,
        quotaType: 'daily',
        amount: quotaReward,
        expiresAt,
        source: 'checkin',
        sourceId: checkinRecord.id
      })

      // 创建配额获得记录
      await this.dbService.createQuotaLog({
        userId,
        type: 'earn',
        amount: quotaReward,
        source: 'checkin',
        description: `每日签到奖励 +${quotaReward} 配额`,
        relatedId: checkinRecord.id,
        expiresAt,
        quotaType: 'daily'
      })

      // 更新用户剩余配额（保持向后兼容）
      const totalQuota = await this.dbService.getUserTotalQuota(userId)
      await this.dbService.updateUserQuota(userId, totalQuota.available)

      // 记录操作日志（包含IP地址和User-Agent）
      if (request) {
        await this.dbService.createLogWithRequest(request, {
          userId,
          action: 'CHECKIN',
          details: `Daily checkin completed, reward: ${quotaReward} quota, expires at: ${expiresAt}`
        })
      } else {
        await this.dbService.createLog({
          userId,
          action: 'CHECKIN',
          details: `Daily checkin completed, reward: ${quotaReward} quota, expires at: ${expiresAt}`
        })
      }

      return {
        success: true,
        quota_reward: quotaReward,
        total_quota: totalQuota.available, // 返回新的剩余配额
        message: `签到成功！获得 ${quotaReward} 个配额（当天24点过期）`
      }
    } catch (error) {
      console.error('Checkin error:', error)
      throw new Error('签到失败，请稍后重试')
    }
  }

  /**
   * 检查用户今日签到状态
   */
  async getCheckinStatus(userId: number): Promise<{
    hasCheckedIn: boolean
    checkinRecord?: UserCheckin
    nextCheckinTime?: string
  }> {
    const todayCheckin = await this.dbService.getTodayCheckin(userId)
    
    if (todayCheckin) {
      return {
        hasCheckedIn: true,
        checkinRecord: todayCheckin
      }
    }

    // 计算下次签到时间（北京时间明天0点）
    const now = new Date()
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const tomorrow = new Date(beijingTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // 转换回UTC时间用于前端显示
    const tomorrowUTC = new Date(tomorrow.getTime() - 8 * 60 * 60 * 1000)

    return {
      hasCheckedIn: false,
      nextCheckinTime: tomorrowUTC.toISOString()
    }
  }

  /**
   * 获取用户签到历史
   */
  async getCheckinHistory(userId: number, limit: number = 30): Promise<UserCheckin[]> {
    return await this.dbService.getUserCheckinHistory(userId, limit)
  }

  /**
   * 获取签到统计信息
   */
  async getCheckinStats(userId: number): Promise<{
    totalCheckins: number
    currentStreak: number
    longestStreak: number
    thisMonthCheckins: number
  }> {
    const history = await this.dbService.getUserCheckinHistory(userId, 365) // 获取一年内的记录

    const totalCheckins = history.length
    
    // 计算连续签到天数
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // 按日期排序（最新的在前）
    history.sort((a, b) => new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime())
    
    // 计算当前连续签到
    for (let i = 0; i < history.length; i++) {
      const record = history[i]
      if (!record) continue

      const checkinDate = new Date(record.checkin_date)
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      
      if (checkinDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        currentStreak++
      } else {
        break
      }
    }
    
    // 计算最长连续签到
    let lastDate: Date | null = null
    for (const record of history.reverse()) { // 从最早的开始
      const currentDate = new Date(record.checkin_date)
      
      if (lastDate && currentDate.getTime() - lastDate.getTime() === 24 * 60 * 60 * 1000) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
      
      lastDate = currentDate
    }
    longestStreak = Math.max(longestStreak, tempStreak)
    
    // 计算本月签到次数
    const thisMonth = today.getMonth()
    const thisYear = today.getFullYear()
    const thisMonthCheckins = history.filter(record => {
      const recordDate = new Date(record.checkin_date)
      return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear
    }).length

    return {
      totalCheckins,
      currentStreak,
      longestStreak,
      thisMonthCheckins
    }
  }
}
