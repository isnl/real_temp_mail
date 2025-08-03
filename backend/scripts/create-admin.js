// 创建管理员用户的脚本
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordData = encoder.encode(password)
  
  // 合并密码和盐
  const combined = new Uint8Array(passwordData.length + salt.length)
  combined.set(passwordData)
  combined.set(salt, passwordData.length)
  
  // 多次哈希以增加安全性
  let hash = await crypto.subtle.digest('SHA-256', combined)
  for (let i = 0; i < 10000; i++) {
    hash = await crypto.subtle.digest('SHA-256', hash)
  }
  
  // 将盐和哈希组合并编码为base64
  const result = new Uint8Array(salt.length + hash.byteLength)
  result.set(salt)
  result.set(new Uint8Array(hash), salt.length)
  
  return btoa(String.fromCharCode(...result))
}

// 生成管理员密码哈希
hashPassword('admin123').then(hash => {
  console.log('管理员密码哈希:', hash)
  console.log('SQL更新语句:')
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@tempmail.dev';`)
}).catch(console.error)
