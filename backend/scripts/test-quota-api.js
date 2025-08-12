/**
 * 测试新的配额API
 */

async function testQuotaAPI() {
  const baseURL = 'http://localhost:51344'
  
  console.log('🧪 开始测试配额API...')
  
  try {
    // 1. 测试管理员登录
    console.log('\n1. 测试管理员登录...')
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'htmljs@qq.com',
        password: 'admin123',
        turnstileToken: '1x0000000000000000000000000000000AA' // 开发环境测试token
      })
    })
    
    const loginData = await loginResponse.json()
    if (!loginData.success) {
      throw new Error('登录失败: ' + loginData.error)
    }
    
    const token = loginData.data.accessToken
    console.log('✅ 登录成功')
    
    // 2. 测试获取配额信息
    console.log('\n2. 测试获取配额信息...')
    const quotaResponse = await fetch(`${baseURL}/api/quota/info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const quotaData = await quotaResponse.json()
    if (!quotaData.success) {
      throw new Error('获取配额信息失败: ' + quotaData.error)
    }
    
    console.log('✅ 配额信息获取成功:')
    console.log('  - 剩余配额:', quotaData.data.remaining)
    console.log('  - 已使用配额:', quotaData.data.used)
    console.log('  - 总配额:', quotaData.data.total)
    console.log('  - 已过期配额:', quotaData.data.expired || 0)
    console.log('  - 即将过期配额:', quotaData.data.expiring || 0)
    
    // 3. 测试签到功能
    console.log('\n3. 测试签到功能...')
    const checkinResponse = await fetch(`${baseURL}/api/checkin/checkin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const checkinData = await checkinResponse.json()
    console.log('签到结果:', checkinData.success ? '✅ 成功' : '❌ 失败')
    if (checkinData.success) {
      console.log('  - 获得配额:', checkinData.data.quota_reward)
      console.log('  - 总配额:', checkinData.data.total_quota)
    } else {
      console.log('  - 错误信息:', checkinData.error)
    }
    
    // 4. 再次获取配额信息查看变化
    console.log('\n4. 再次获取配额信息查看变化...')
    const quotaResponse2 = await fetch(`${baseURL}/api/quota/info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const quotaData2 = await quotaResponse2.json()
    if (quotaData2.success) {
      console.log('✅ 更新后的配额信息:')
      console.log('  - 剩余配额:', quotaData2.data.remaining)
      console.log('  - 已使用配额:', quotaData2.data.used)
      console.log('  - 总配额:', quotaData2.data.total)
      console.log('  - 已过期配额:', quotaData2.data.expired || 0)
      console.log('  - 即将过期配额:', quotaData2.data.expiring || 0)
    }
    
    console.log('\n🎉 所有测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

// 运行测试
testQuotaAPI().catch(console.error)
