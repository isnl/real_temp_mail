/**
 * 生成随机字符串
 * @param length 字符串长度
 * @param charset 字符集，默认为字母数字
 * @returns 随机字符串
 */
export function generateRandomString(length: number, charset?: string): string {
  const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const chars = charset || defaultCharset
  if (!Number.isSafeInteger(length) || length < 0) throw new Error('Invalid random string length')
  if (chars.length < 2 || chars.length > 256) throw new Error('Invalid random string character set')
  let result = ''

  // Rejection sampling avoids modulo bias for character sets whose size does
  // not evenly divide 256.
  const acceptanceLimit = 256 - (256 % chars.length)
  while (result.length < length) {
    const bytes = new Uint8Array(Math.max(16, length - result.length))
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte >= acceptanceLimit) continue
      result += chars[byte % chars.length]!
      if (result.length === length) break
    }
  }

  return result
}

/**
 * 生成随机邮箱前缀
 * @param length 前缀长度，默认8位
 * @returns 随机邮箱前缀
 */
export function generateEmailPrefix(length: number = 8): string {
  // 邮箱前缀只使用小写字母和数字
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return generateRandomString(length, charset)
}

/**
 * 生成兑换码
 * @param length 兑换码长度，默认12位
 * @param prefix 前缀
 * @returns 兑换码
 */
export function generateRedeemCode(length: number = 12, prefix: string = ''): string {
  // 兑换码使用大写字母和数字，避免容易混淆的字符
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codeLength = length - prefix.length
  return prefix + generateRandomString(codeLength, charset)
}

/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * 生成JWT密钥
 * @returns Base64编码的密钥
 */
export function generateJWTSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export function generateUUID(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)

  // 设置版本号 (4) 和变体位
  array[6] = (array[6]! & 0x0f) | 0x40
  array[8] = (array[8]! & 0x3f) | 0x80

  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-')
}

/**
 * 安全比较两个字符串（防止时序攻击）
 * @param a 字符串A
 * @param b 字符串B
 * @returns 是否相等
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * 生成随机数字
 * @param min 最小值
 * @param max 最大值
 * @returns 随机数字
 */
export function generateRandomNumber(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new Error('Invalid random number range')
  }
  const range = max - min + 1
  if (!Number.isSafeInteger(range) || range > 0x100000000) {
    throw new Error('Random number range is too large')
  }

  const sampleSpace = 0x100000000
  const acceptanceLimit = sampleSpace - (sampleSpace % range)
  const bytes = new Uint32Array(1)
  do {
    crypto.getRandomValues(bytes)
  } while (bytes[0]! >= acceptanceLimit)
  return min + (bytes[0]! % range)
}

/**
 * 生成验证码
 * @param length 验证码长度，默认6位
 * @returns 数字验证码
 */
export function generateVerificationCode(length: number = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += generateRandomNumber(0, 9).toString()
  }
  return code
}
