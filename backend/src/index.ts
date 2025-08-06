import type { Env } from '@/types'
import { AuthHandler } from '@/handlers/auth.handler'
import { EmailHandler } from '@/handlers/email.handler'
import { AdminHandler } from '@/handlers/admin.handler'
import { CheckinHandler } from '@/handlers/checkin.handler'
import { QuotaHandler } from '@/handlers/quota.handler'
import { handleEmailProcessing } from '@/modules/email/email-processor'

// 添加CORS头的工具函数
function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    // CORS 预检请求处理
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    try {
      // 初始化处理器
      const authHandler = new AuthHandler(env)
      const emailHandler = new EmailHandler(env)
      const adminHandler = new AdminHandler(env)
      const checkinHandler = new CheckinHandler(env)
      const quotaHandler = new QuotaHandler(env)

      // 路由匹配
      let response: Response
      if (pathname.startsWith('/api/auth/')) {
        response = await handleAuthRoutes(pathname, method, request, authHandler)
      } else if (pathname.startsWith('/api/email/')) {
        response = await handleEmailRoutes(pathname, method, request, emailHandler)
      } else if (pathname.startsWith('/api/admin/')) {
        response = await handleAdminRoutes(pathname, method, request, adminHandler)
      } else if (pathname.startsWith('/api/checkin/')) {
        response = await handleCheckinRoutes(pathname, method, request, checkinHandler)
      } else if (pathname.startsWith('/api/quota/')) {
        response = await handleQuotaRoutes(pathname, method, request, quotaHandler)
      } else if (pathname === '/api/health') {
        response = new Response(JSON.stringify({
          success: true,
          message: 'Service is healthy',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        response = new Response(JSON.stringify({
          success: false,
          error: 'Not Found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return addCorsHeaders(response)
    } catch (error) {
      console.error('Unhandled error:', error)
      const errorResponse = new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
      return addCorsHeaders(errorResponse)
    }
  },

  // 邮件处理功能 - Email Routing 入口
  async email(message: any, env: Env, ctx: ExecutionContext) {
    return await handleEmailProcessing(message, env)
  }
}

async function handleAuthRoutes(
  pathname: string, 
  method: string, 
  request: Request, 
  handler: AuthHandler
): Promise<Response> {
  switch (pathname) {
    case '/api/auth/register':
      if (method === 'POST') return await handler.register(request)
      break
    
    case '/api/auth/login':
      if (method === 'POST') return await handler.login(request)
      break
    
    case '/api/auth/refresh':
      if (method === 'POST') return await handler.refreshToken(request)
      break
    
    case '/api/auth/logout':
      if (method === 'POST') return await handler.logout(request)
      break
    
    case '/api/auth/me':
      if (method === 'GET') return await handler.getCurrentUser(request)
      break
    
    case '/api/auth/change-password':
      if (method === 'POST') return await handler.changePassword(request)
      break
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleEmailRoutes(
  pathname: string, 
  method: string, 
  request: Request, 
  handler: EmailHandler
): Promise<Response> {
  // 域名相关路由（公开）
  if (pathname === '/api/email/domains') {
    if (method === 'GET') return await handler.getDomains(request)
  }

  // 临时邮箱相关路由（需要认证）
  if (pathname === '/api/email/temp-emails') {
    if (method === 'GET') return await handler.getTempEmails(request)
  }

  if (pathname === '/api/email/create') {
    if (method === 'POST') return await handler.createTempEmail(request)
  }

  // 删除临时邮箱 /api/email/temp-emails/:id
  if (pathname.match(/^\/api\/email\/temp-emails\/\d+$/)) {
    if (method === 'DELETE') return await handler.deleteTempEmail(request)
  }

  // 获取临时邮箱的邮件列表 /api/email/temp-emails/:id/emails
  if (pathname.match(/^\/api\/email\/temp-emails\/\d+\/emails$/)) {
    if (method === 'GET') return await handler.getEmailsForTempEmail(request)
  }

  // 获取邮件详情 /api/email/emails/:id
  if (pathname.match(/^\/api\/email\/emails\/\d+$/)) {
    if (method === 'GET') return await handler.getEmailDetail(request)
    if (method === 'DELETE') return await handler.deleteEmail(request)
  }

  // 兑换码相关路由
  if (pathname === '/api/email/redeem') {
    if (method === 'POST') return await handler.redeemCode(request)
  }

  // 配额信息
  if (pathname === '/api/email/quota') {
    if (method === 'GET') return await handler.getQuotaInfo(request)
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleAdminRoutes(
  pathname: string,
  method: string,
  request: Request,
  handler: AdminHandler
): Promise<Response> {
  // 仪表板统计
  if (pathname === '/api/admin/dashboard/stats') {
    if (method === 'GET') return await handler.getDashboardStats(request)
  }

  // 用户管理
  if (pathname === '/api/admin/users') {
    if (method === 'GET') return await handler.getUsers(request)
  }

  if (pathname.match(/^\/api\/admin\/users\/\d+$/)) {
    if (method === 'GET') return await handler.getUserById(request)
    if (method === 'PUT') return await handler.updateUser(request)
    if (method === 'DELETE') return await handler.deleteUser(request)
  }

  if (pathname.match(/^\/api\/admin\/users\/\d+\/quota$/)) {
    if (method === 'POST') return await handler.allocateQuotaToUser(request)
  }

  // 域名管理
  if (pathname === '/api/admin/domains') {
    if (method === 'GET') return await handler.getDomains(request)
    if (method === 'POST') return await handler.createDomain(request)
  }

  if (pathname.match(/^\/api\/admin\/domains\/\d+$/)) {
    if (method === 'PUT') return await handler.updateDomain(request)
    if (method === 'DELETE') return await handler.deleteDomain(request)
  }

  // 邮件审查
  if (pathname === '/api/admin/emails') {
    if (method === 'GET') return await handler.getEmails(request)
  }

  if (pathname.match(/^\/api\/admin\/emails\/\d+$/)) {
    if (method === 'DELETE') return await handler.deleteEmail(request)
  }

  // 日志审计
  if (pathname === '/api/admin/logs') {
    if (method === 'GET') return await handler.getLogs(request)
  }

  if (pathname === '/api/admin/logs/actions') {
    if (method === 'GET') return await handler.getLogActions(request)
  }

  // 兑换码管理
  if (pathname === '/api/admin/redeem-codes') {
    if (method === 'GET') return await handler.getRedeemCodes(request)
    if (method === 'POST') return await handler.createRedeemCode(request)
  }

  if (pathname === '/api/admin/redeem-codes/batch') {
    if (method === 'POST') return await handler.createBatchRedeemCodes(request)
  }

  if (pathname.match(/^\/api\/admin\/redeem-codes\/[A-Z0-9]+$/)) {
    if (method === 'DELETE') return await handler.deleteRedeemCode(request)
  }

  // 系统设置管理
  if (pathname === '/api/admin/settings') {
    if (method === 'GET') return await handler.getSystemSettings(request)
  }

  if (pathname.match(/^\/api\/admin\/settings\/[a-zA-Z_]+$/)) {
    if (method === 'PUT') return await handler.updateSystemSetting(request)
  }

  // 配额记录管理
  if (pathname === '/api/admin/quota-logs') {
    if (method === 'GET') return await handler.getQuotaLogs(request)
  }

  if (pathname === '/api/admin/quota-stats') {
    if (method === 'GET') return await handler.getQuotaStats(request)
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}

// 签到路由处理
async function handleCheckinRoutes(pathname: string, method: string, request: Request, handler: CheckinHandler): Promise<Response> {
  // 用户签到
  if (pathname === '/api/checkin/checkin') {
    if (method === 'POST') return await handler.checkin(request)
  }

  // 获取签到状态
  if (pathname === '/api/checkin/status') {
    if (method === 'GET') return await handler.getCheckinStatus(request)
  }

  // 获取签到历史
  if (pathname === '/api/checkin/history') {
    if (method === 'GET') return await handler.getCheckinHistory(request)
  }

  // 获取签到统计
  if (pathname === '/api/checkin/stats') {
    if (method === 'GET') return await handler.getCheckinStats(request)
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}

// 配额路由处理
async function handleQuotaRoutes(pathname: string, method: string, request: Request, handler: QuotaHandler): Promise<Response> {
  // 获取配额记录
  if (pathname === '/api/quota/logs') {
    if (method === 'GET') return await handler.getQuotaLogs(request)
  }

  // 获取配额信息
  if (pathname === '/api/quota/info') {
    if (method === 'GET') return await handler.getQuotaInfo(request)
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
}
