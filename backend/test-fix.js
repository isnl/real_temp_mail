/**
 * 测试数据库修复结果
 * 验证 user_quota_balances 表是否正常工作
 */

const API_BASE = 'https://temp-email.peanut0806.workers.dev/api'

async function testDatabaseFix() {
  console.log('🔍 开始测试数据库修复结果...\n')

  try {
    // 1. 测试用户注册（这会触发配额相关操作）
    console.log('1. 测试用户注册...')
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `test_${Date.now()}@example.com`,
        password: 'test123456',
        confirmPassword: 'test123456'
      })
    })

    if (registerResponse.ok) {
      const registerData = await registerResponse.json()
      console.log('✅ 用户注册成功')
      console.log('   用户配额:', registerData.user?.quota || '未知')
    } else {
      const error = await registerResponse.text()
      console.log('❌ 用户注册失败:', error)
    }

  } catch (error) {
    console.log('❌ 注册测试出错:', error.message)
  }

  console.log('')

  try {
    // 2. 测试管理员登录
    console.log('2. 测试管理员登录...')
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

    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      console.log('✅ 管理员登录成功')
      
      const token = loginData.accessToken
      
      // 3. 测试获取用户配额信息
      console.log('3. 测试获取配额信息...')
      const quotaResponse = await fetch(`${API_BASE}/quota/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json()
        console.log('✅ 配额信息获取成功')
        console.log('   配额详情:', JSON.stringify(quotaData, null, 2))
      } else {
        const error = await quotaResponse.text()
        console.log('❌ 配额信息获取失败:', error)
      }

    } else {
      const error = await loginResponse.text()
      console.log('❌ 管理员登录失败:', error)
    }

  } catch (error) {
    console.log('❌ 登录测试出错:', error.message)
  }

  console.log('')

  try {
    // 4. 测试签到功能
    console.log('4. 测试签到功能...')
    const checkinResponse = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@tempmail.dev',
        password: 'admin123'
      })
    })

    if (checkinResponse.ok) {
      const checkinData = await checkinResponse.json()
      console.log('✅ 签到功能正常')
      console.log('   签到结果:', JSON.stringify(checkinData, null, 2))
    } else {
      const error = await checkinResponse.text()
      console.log('❌ 签到功能异常:', error)
    }

  } catch (error) {
    console.log('❌ 签到测试出错:', error.message)
  }

  console.log('\n🎉 数据库修复测试完成！')
}

// 运行测试
testDatabaseFix().catch(console.error)
