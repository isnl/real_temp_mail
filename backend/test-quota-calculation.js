/**
 * 测试配额计算逻辑
 * 验证修复后的配额使用率是否正确
 */

const API_BASE = 'https://temp-email.peanut0806.workers.dev/api'

async function testQuotaCalculation() {
  console.log('🔍 测试配额计算逻辑...\n')

  try {
    // 1. 测试管理员登录
    console.log('1. 管理员登录...')
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@tempmail.dev',
        password: 'admin123'
      })
    })

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`)
    }

    const loginData = await loginResponse.json()
    console.log('✅ 登录成功')
    
    const token = loginData.accessToken
    
    // 2. 获取配额信息
    console.log('2. 获取配额信息...')
    const quotaResponse = await fetch(`${API_BASE}/quota/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!quotaResponse.ok) {
      throw new Error(`获取配额信息失败: ${quotaResponse.status}`)
    }

    const quotaData = await quotaResponse.json()
    console.log('✅ 配额信息获取成功')
    console.log('配额详情:', JSON.stringify(quotaData, null, 2))

    // 3. 计算使用率
    if (quotaData.success && quotaData.data) {
      const { total, used, remaining, expired, expiring } = quotaData.data
      
      console.log('\n📊 配额分析:')
      console.log(`总配额: ${total}`)
      console.log(`已使用: ${used}`)
      console.log(`剩余可用: ${remaining}`)
      console.log(`已过期: ${expired}`)
      console.log(`即将过期: ${expiring}`)
      
      // 计算使用率（两种方式）
      const usageRate1 = total > 0 ? Math.round((used / total) * 100) : 0
      const usageRate2 = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0
      
      console.log(`\n📈 使用率计算:`)
      console.log(`方式1 (已使用/总配额): ${usageRate1}%`)
      console.log(`方式2 ((总配额-剩余)/总配额): ${usageRate2}%`)
      
      // 验证数据一致性
      const calculatedUsed = total - remaining
      console.log(`\n🔍 数据一致性检查:`)
      console.log(`API返回的已使用: ${used}`)
      console.log(`计算的已使用 (总-剩余): ${calculatedUsed}`)
      console.log(`差异: ${Math.abs(used - calculatedUsed)}`)
      
      if (Math.abs(used - calculatedUsed) > 0) {
        console.log('⚠️  数据不一致，可能存在过期配额或计算错误')
      } else {
        console.log('✅ 数据一致')
      }
      
      // 推荐的使用率显示
      const recommendedRate = Math.max(0, Math.min(usageRate2, 100))
      console.log(`\n💡 推荐显示使用率: ${recommendedRate}%`)
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

// 运行测试
testQuotaCalculation().catch(console.error)
