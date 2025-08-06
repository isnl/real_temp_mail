// 邮件处理器
import PostalMime from 'postal-mime'
import type { Env } from '@/types'

export async function handleEmailProcessing(message: any, env: Env) {
  try {
    console.log('Processing email from:', message.from, 'to:', message.to)

    // 使用 postal-mime 解析邮件
    const parsedEmail = await parseEmailWithPostalMime(message.raw)
    
    // 提取收件人邮箱地址
    const toEmail = message.to
    console.log('Recipient email:', toEmail)

    // 查找对应的临时邮箱记录
    const tempEmailRecord = await env.DB.prepare(
      'SELECT * FROM temp_emails WHERE email = ? AND active = 1'
    ).bind(toEmail).first()

    if (!tempEmailRecord) {
      console.log('Temp email record not found for:', toEmail)
      return
    }

    console.log('Found temp email record:', tempEmailRecord.id, 'for user:', tempEmailRecord.user_id)

    // 提取邮件内容
    const subject = parsedEmail.subject || '无主题'
    const textContent = parsedEmail.text || ''
    const htmlContent = parsedEmail.html || ''
    
    // 提取发件人信息
    const fromAddress = parsedEmail.from?.address || message.from
    const fromName = parsedEmail.from?.name || ''

    // 尝试提取验证码
    const verificationCode = extractVerificationCode(textContent + ' ' + htmlContent)

    // 保存邮件到数据库
    const result = await env.DB.prepare(`
      INSERT INTO emails (
        temp_email_id, 
        sender, 
        subject, 
        content, 
        html_content, 
        verification_code,
        received_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+8 hours'))
    `).bind(
      tempEmailRecord.id,
      fromAddress,
      subject,
      textContent,
      htmlContent,
      verificationCode
    ).run()

    console.log('Email saved successfully:', {
      emailId: result.meta?.last_row_id,
      tempEmailId: tempEmailRecord.id,
      from: fromAddress,
      subject: subject,
      hasContent: !!textContent,
      hasHtml: !!htmlContent,
      verificationCode: verificationCode
    })

    // 记录用户操作日志
    await env.DB.prepare(`
      INSERT INTO logs (user_id, action, details, timestamp)
      VALUES (?, ?, ?, datetime('now', '+8 hours'))
    `).bind(
      tempEmailRecord.user_id,
      'RECEIVE_EMAIL',
      `Received email from ${fromAddress} to ${toEmail}`
    ).run()

  } catch (error) {
    console.error('Email processing error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      to: message?.to,
      from: message?.from
    })
  }
}

// 使用 postal-mime 解析邮件
async function parseEmailWithPostalMime(rawEmail: any) {
  try {
    const parser = new PostalMime()
    const email = await parser.parse(rawEmail)
    return email
  } catch (error) {
    console.error('Email parsing error:', error)
    return {
      subject: '解析失败',
      text: '邮件解析失败',
      html: '',
      from: { address: '', name: '' }
    }
  }
}

// 提取验证码的函数
function extractVerificationCode(content: string): string | null {
  if (!content) return null

  // 常见的验证码模式
  const patterns = [
    /验证码[：:\s]*([0-9]{4,8})/i,
    /verification code[：:\s]*([0-9]{4,8})/i,
    /code[：:\s]*([0-9]{4,8})/i,
    /pin[：:\s]*([0-9]{4,8})/i,
    /\b([0-9]{4,8})\b.*验证/i,
    /\b([0-9]{4,8})\b.*code/i,
    /您的验证码是[：:\s]*([0-9]{4,8})/i,
    /your verification code is[：:\s]*([0-9]{4,8})/i,
    /\b([0-9]{6})\b/g // 6位数字（最常见的验证码格式）
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}
