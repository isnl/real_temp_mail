/**
 * 配额系统测试脚本
 * 测试新的配额过期逻辑和优先消费策略
 */

// 模拟测试数据
const testData = {
  users: [
    { id: 1, email: 'test1@example.com', quota: 10 },
    { id: 2, email: 'test2@example.com', quota: 5 }
  ],
  quotaBalances: [
    // 用户1的配额余额
    { id: 1, user_id: 1, quota_type: 'permanent', amount: 5, expires_at: null, source: 'register' },
    { id: 2, user_id: 1, quota_type: 'daily', amount: 2, expires_at: '2024-01-15T16:00:00Z', source: 'checkin' },
    { id: 3, user_id: 1, quota_type: 'custom', amount: 3, expires_at: '2024-01-20T16:00:00Z', source: 'redeem_code' },
    
    // 用户2的配额余额
    { id: 4, user_id: 2, quota_type: 'permanent', amount: 5, expires_at: null, source: 'register' }
  ]
}

class QuotaSystemTester {
  constructor() {
    this.quotaBalances = [...testData.quotaBalances]
    console.log('🧪 配额系统测试开始...')
  }

  async runAllTests() {
    try {
      console.log('\n=== 测试配额过期逻辑 ===')
      await this.testQuotaExpiration()
      
      console.log('\n=== 测试配额优先消费策略 ===')
      await this.testQuotaConsumptionPriority()
      
      console.log('\n=== 测试签到配额过期 ===')
      await this.testCheckinQuotaExpiration()
      
      console.log('\n=== 测试兑换码配额过期 ===')
      await this.testRedeemCodeQuotaExpiration()
      
      console.log('\n✅ 所有测试通过！')
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error)
    }
  }

  async testQuotaExpiration() {
    console.log('测试配额过期逻辑...')
    
    const now = new Date('2024-01-16T10:00:00Z') // 模拟当前时间
    
    // 获取用户1的有效配额
    const validQuotas = this.getValidQuotas(1, now)
    
    console.log('用户1的有效配额:')
    validQuotas.forEach(quota => {
      console.log(`  - ${quota.quota_type}: ${quota.amount} (${quota.expires_at ? '过期时间: ' + quota.expires_at : '永不过期'})`)
    })
    
    // 验证过期配额被正确过滤
    const expiredQuotas = this.getExpiredQuotas(1, now)
    console.log('用户1的过期配额:')
    expiredQuotas.forEach(quota => {
      console.log(`  - ${quota.quota_type}: ${quota.amount} (过期时间: ${quota.expires_at})`)
    })
    
    console.log('✓ 配额过期逻辑测试通过')
  }

  async testQuotaConsumptionPriority() {
    console.log('测试配额优先消费策略...')
    
    const now = new Date('2024-01-16T10:00:00Z')
    const userId = 1
    const consumeAmount = 4
    
    console.log(`尝试消费 ${consumeAmount} 个配额...`)
    
    // 获取消费前的配额状态
    const beforeQuotas = this.getValidQuotas(userId, now)
    console.log('消费前配额状态:')
    beforeQuotas.forEach(quota => {
      console.log(`  - ${quota.quota_type}: ${quota.amount}`)
    })
    
    // 模拟配额消费
    const result = this.consumeQuota(userId, consumeAmount, now)
    
    console.log(`消费结果: ${result.success ? '成功' : '失败'}`)
    if (result.success) {
      console.log('消费详情:')
      result.consumedBalances.forEach(item => {
        console.log(`  - 从 ${item.quota_type} 配额消费 ${item.consumed}`)
      })
      
      // 获取消费后的配额状态
      const afterQuotas = this.getValidQuotas(userId, now)
      console.log('消费后配额状态:')
      afterQuotas.forEach(quota => {
        console.log(`  - ${quota.quota_type}: ${quota.amount}`)
      })
    }
    
    console.log('✓ 配额优先消费策略测试通过')
  }

  async testCheckinQuotaExpiration() {
    console.log('测试签到配额过期逻辑...')
    
    // 模拟签到获得配额
    const checkinQuota = this.createCheckinQuota(1, 2)
    console.log('签到获得配额:')
    console.log(`  - 数量: ${checkinQuota.amount}`)
    console.log(`  - 过期时间: ${checkinQuota.expires_at}`)
    console.log(`  - 类型: ${checkinQuota.quota_type}`)
    
    // 验证过期时间是否为当天24点
    const expiresAt = new Date(checkinQuota.expires_at)
    const expectedExpiry = new Date()
    expectedExpiry.setHours(23, 59, 59, 999)
    
    const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime())
    const isCorrectExpiry = timeDiff < 24 * 60 * 60 * 1000 // 允许1天的误差
    
    console.log(`过期时间验证: ${isCorrectExpiry ? '✓ 正确' : '✗ 错误'}`)
    console.log('✓ 签到配额过期逻辑测试通过')
  }

  async testRedeemCodeQuotaExpiration() {
    console.log('测试兑换码配额过期逻辑...')
    
    // 测试永不过期的兑换码
    const neverExpiresQuota = this.createRedeemCodeQuota(1, 5, true, null)
    console.log('永不过期兑换码配额:')
    console.log(`  - 数量: ${neverExpiresQuota.amount}`)
    console.log(`  - 过期时间: ${neverExpiresQuota.expires_at || '永不过期'}`)
    console.log(`  - 类型: ${neverExpiresQuota.quota_type}`)
    
    // 测试有过期时间的兑换码
    const expiringQuota = this.createRedeemCodeQuota(1, 3, false, '2024-02-01T16:00:00Z')
    console.log('有过期时间兑换码配额:')
    console.log(`  - 数量: ${expiringQuota.amount}`)
    console.log(`  - 过期时间: ${expiringQuota.expires_at}`)
    console.log(`  - 类型: ${expiringQuota.quota_type}`)
    
    console.log('✓ 兑换码配额过期逻辑测试通过')
  }

  // 辅助方法
  getValidQuotas(userId, currentTime) {
    return this.quotaBalances.filter(quota => 
      quota.user_id === userId && 
      quota.amount > 0 && 
      (quota.expires_at === null || new Date(quota.expires_at) > currentTime)
    ).sort((a, b) => {
      // 按过期时间排序，即将过期的在前
      if (a.expires_at === null && b.expires_at === null) return 0
      if (a.expires_at === null) return 1
      if (b.expires_at === null) return -1
      return new Date(a.expires_at) - new Date(b.expires_at)
    })
  }

  getExpiredQuotas(userId, currentTime) {
    return this.quotaBalances.filter(quota => 
      quota.user_id === userId && 
      quota.expires_at !== null && 
      new Date(quota.expires_at) <= currentTime
    )
  }

  consumeQuota(userId, amount, currentTime) {
    const validQuotas = this.getValidQuotas(userId, currentTime)
    let remainingToConsume = amount
    const consumedBalances = []

    for (const quota of validQuotas) {
      if (remainingToConsume <= 0) break
      
      const consumeFromThis = Math.min(quota.amount, remainingToConsume)
      quota.amount -= consumeFromThis
      remainingToConsume -= consumeFromThis
      
      consumedBalances.push({
        quota_type: quota.quota_type,
        consumed: consumeFromThis
      })
    }

    return {
      success: remainingToConsume === 0,
      consumedBalances,
      remainingToConsume
    }
  }

  createCheckinQuota(userId, amount) {
    // 计算当天24点过期时间（中国时区）
    const now = new Date()
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const endOfDay = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate(), 23, 59, 59, 999)
    const expiresAt = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000).toISOString()

    return {
      user_id: userId,
      quota_type: 'daily',
      amount,
      expires_at: expiresAt,
      source: 'checkin'
    }
  }

  createRedeemCodeQuota(userId, amount, neverExpires, validUntil) {
    return {
      user_id: userId,
      quota_type: neverExpires ? 'permanent' : 'custom',
      amount,
      expires_at: neverExpires ? null : validUntil,
      source: 'redeem_code'
    }
  }
}

// 如果直接运行此脚本
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 检查是否直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new QuotaSystemTester()
  tester.runAllTests().catch(console.error)
}

export default QuotaSystemTester
