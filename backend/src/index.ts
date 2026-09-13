import type { Env } from '@/types'
import { AdminHandler } from '@/handlers/admin.handler'
import { AnnouncementHandler } from '@/handlers/announcement.handler'
import { AuthHandler } from '@/handlers/auth.handler'
import { EmailHandler } from '@/handlers/email.handler'
import { QuotaHandler } from '@/handlers/quota.handler'
import { SettingsHandler } from '@/handlers/settings.handler'
import { handleEmailProcessing } from '@/modules/email/email-processor'
import { DatabaseService } from '@/modules/shared/database.service'

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS') return preflightResponse(request, env)

    try {
      let response: Response
      if (pathname === '/api/health') {
        response = request.method === 'GET'
          ? Response.json({ success: true, message: 'Service is healthy', timestamp: new Date().toISOString() })
          : methodNotAllowed('GET')
      } else if (pathname === '/api/public/settings') {
        response = request.method === 'GET'
          ? await new SettingsHandler(env).getPublicSettings()
          : methodNotAllowed('GET')
      } else if (pathname.startsWith('/api/auth/')) {
        response = await handleAuthRoutes(pathname, request, new AuthHandler(env))
      } else if (pathname.startsWith('/api/email/')) {
        response = await handleEmailRoutes(pathname, request, new EmailHandler(env))
      } else if (pathname.startsWith('/api/admin/')) {
        response = await handleAdminRoutes(pathname, request, new AdminHandler(env))
      } else if (pathname.startsWith('/api/announcements/')) {
        response = await handleAnnouncementRoutes(pathname, request, new AnnouncementHandler(env))
      } else if (pathname.startsWith('/api/quota/')) {
        response = await handleQuotaRoutes(pathname, request, new QuotaHandler(env))
      } else if (pathname === '/api' || pathname.startsWith('/api/')) {
        response = notFound()
      } else if (env.ASSETS) {
        response = await env.ASSETS.fetch(request)
        // A path listed in assets.run_worker_first reaches this binding before
        // the platform's SPA fallback. Reproduce that fallback for HTML
        // navigations so privacy headers can be attached without turning
        // /public-inbox into a JSON 404.
        if (
          response.status === 404 &&
          request.method === 'GET' &&
          request.headers.get('Accept')?.includes('text/html')
        ) {
          const indexUrl = new URL('/index.html', request.url)
          response = await env.ASSETS.fetch(new Request(indexUrl, {
            method: 'GET',
            headers: request.headers
          }))
        }
      } else {
        response = notFound()
      }
      return finalizeResponse(request, env, response)
    } catch (error) {
      if (error instanceof Response) return finalizeResponse(request, env, error)
      console.error('Unhandled request error:', error)
      return finalizeResponse(
        request,
        env,
        Response.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
      )
    }
  },

  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleEmailProcessing(message, env)
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil((async () => {
      const deleted = await new DatabaseService(env.DB).cleanupRetainedData()
      console.info('Scheduled retention cleanup completed', deleted)
    })())
  }
}

async function handleAuthRoutes(pathname: string, request: Request, handler: AuthHandler): Promise<Response> {
  const method = request.method
  switch (pathname) {
    case '/api/auth/login':
      return method === 'POST' ? await handler.login(request) : methodNotAllowed('POST')
    case '/api/auth/register':
      return method === 'POST' ? await handler.register(request) : methodNotAllowed('POST')
    case '/api/auth/bootstrap':
      return method === 'POST' ? await handler.bootstrapAdmin(request) : methodNotAllowed('POST')
    case '/api/auth/bootstrap-status':
      return method === 'GET' ? await handler.getBootstrapStatus() : methodNotAllowed('GET')
    case '/api/auth/github':
      return method === 'GET' ? await handler.githubAuth(request) : methodNotAllowed('GET')
    case '/api/auth/github/callback':
      return method === 'GET' ? await handler.githubCallback(request) : methodNotAllowed('GET')
    case '/api/auth/refresh':
      return method === 'POST' ? await handler.refreshToken(request) : methodNotAllowed('POST')
    case '/api/auth/logout':
      return method === 'POST' ? await handler.logout(request) : methodNotAllowed('POST')
    case '/api/auth/me':
      return method === 'GET' ? await handler.getCurrentUser(request) : methodNotAllowed('GET')
    case '/api/auth/change-password':
      return method === 'POST' ? await handler.changePassword(request) : methodNotAllowed('POST')
    default:
      return notFound()
  }
}

async function handleEmailRoutes(pathname: string, request: Request, handler: EmailHandler): Promise<Response> {
  const method = request.method
  if (pathname === '/api/email/domains') {
    return method === 'GET' ? await handler.getDomains(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/email/public-inbox') {
    return method === 'POST' ? await handler.getPublicInbox(request) : methodNotAllowed('POST')
  }
  if (/^\/api\/email\/public-inbox\/emails\/\d+$/.test(pathname)) {
    return method === 'POST' ? await handler.getPublicEmailDetail(request) : methodNotAllowed('POST')
  }
  if (pathname === '/api/email/temp-emails') {
    return method === 'GET' ? await handler.getTempEmails(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/email/create') {
    return method === 'POST' ? await handler.createTempEmail(request) : methodNotAllowed('POST')
  }
  if (/^\/api\/email\/temp-emails\/\d+$/.test(pathname)) {
    return method === 'DELETE' ? await handler.deleteTempEmail(request) : methodNotAllowed('DELETE')
  }
  if (/^\/api\/email\/temp-emails\/\d+\/public-inbox$/.test(pathname)) {
    return method === 'PUT' ? await handler.updateTempEmailPublicInbox(request) : methodNotAllowed('PUT')
  }
  if (/^\/api\/email\/temp-emails\/\d+\/emails$/.test(pathname)) {
    return method === 'GET' ? await handler.getEmailsForTempEmail(request) : methodNotAllowed('GET')
  }
  if (/^\/api\/email\/emails\/\d+$/.test(pathname)) {
    if (method === 'GET') return await handler.getEmailDetail(request)
    if (method === 'DELETE') return await handler.deleteEmail(request)
    return methodNotAllowed('GET, DELETE')
  }
  if (/^\/api\/email\/emails\/\d+\/read$/.test(pathname)) {
    return method === 'PATCH' ? await handler.markEmailRead(request) : methodNotAllowed('PATCH')
  }
  if (pathname === '/api/email/emails/batch-delete') {
    return method === 'POST' ? await handler.batchDeleteEmails(request) : methodNotAllowed('POST')
  }
  if (pathname === '/api/email/search') {
    return method === 'GET' ? await handler.searchEmails(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/email/redeem') {
    return method === 'POST' ? await handler.redeemCode(request) : methodNotAllowed('POST')
  }
  if (pathname === '/api/email/quota') {
    return method === 'GET' ? await handler.getQuotaInfo(request) : methodNotAllowed('GET')
  }
  return notFound()
}

async function handleAdminRoutes(pathname: string, request: Request, handler: AdminHandler): Promise<Response> {
  const method = request.method
  if (pathname === '/api/admin/dashboard/stats') {
    return method === 'GET' ? await handler.getDashboardStats(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/admin/users') {
    return method === 'GET' ? await handler.getUsers(request) : methodNotAllowed('GET')
  }
  if (/^\/api\/admin\/users\/\d+$/.test(pathname)) {
    if (method === 'GET') return await handler.getUserById(request)
    if (method === 'PUT') return await handler.updateUser(request)
    if (method === 'DELETE') return await handler.deleteUser(request)
    return methodNotAllowed('GET, PUT, DELETE')
  }
  if (/^\/api\/admin\/users\/\d+\/quota$/.test(pathname)) {
    return method === 'POST' ? await handler.allocateQuotaToUser(request) : methodNotAllowed('POST')
  }
  if (pathname === '/api/admin/domains') {
    if (method === 'GET') return await handler.getDomains(request)
    if (method === 'POST') return await handler.createDomain(request)
    return methodNotAllowed('GET, POST')
  }
  if (/^\/api\/admin\/domains\/\d+$/.test(pathname)) {
    if (method === 'PUT') return await handler.updateDomain(request)
    if (method === 'DELETE') return await handler.deleteDomain(request)
    return methodNotAllowed('PUT, DELETE')
  }
  if (pathname === '/api/admin/emails') {
    return method === 'GET' ? await handler.getEmails(request) : methodNotAllowed('GET')
  }
  if (/^\/api\/admin\/emails\/\d+$/.test(pathname)) {
    if (method === 'GET') return await handler.getEmailById(request)
    if (method === 'DELETE') return await handler.deleteEmail(request)
    return methodNotAllowed('GET, DELETE')
  }
  if (pathname === '/api/admin/logs') {
    return method === 'GET' ? await handler.getLogs(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/admin/logs/actions') {
    return method === 'GET' ? await handler.getLogActions(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/admin/redeem-codes') {
    if (method === 'GET') return await handler.getRedeemCodes(request)
    if (method === 'POST') return await handler.createRedeemCode(request)
    return methodNotAllowed('GET, POST')
  }
  if (pathname === '/api/admin/redeem-codes/batch') {
    return method === 'POST' ? await handler.createBatchRedeemCodes(request) : methodNotAllowed('POST')
  }
  if (/^\/api\/admin\/redeem-codes\/[A-Za-z0-9_-]+$/.test(pathname)) {
    return method === 'DELETE' ? await handler.deleteRedeemCode(request) : methodNotAllowed('DELETE')
  }
  if (pathname === '/api/admin/settings') {
    if (method === 'GET') return await handler.getSystemSettings(request)
    if (method === 'PUT') return await handler.updateSystemSettings(request)
    return methodNotAllowed('GET, PUT')
  }
  if (/^\/api\/admin\/settings\/[a-z_]+$/.test(pathname)) {
    return method === 'PUT' ? await handler.updateSystemSetting(request) : methodNotAllowed('PUT')
  }
  if (pathname === '/api/admin/quota-logs') {
    return method === 'GET' ? await handler.getQuotaLogs(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/admin/quota-stats') {
    return method === 'GET' ? await handler.getQuotaStats(request) : methodNotAllowed('GET')
  }
  return notFound()
}

async function handleQuotaRoutes(pathname: string, request: Request, handler: QuotaHandler): Promise<Response> {
  if (pathname === '/api/quota/logs') {
    return request.method === 'GET' ? await handler.getQuotaLogs(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/quota/info') {
    return request.method === 'GET' ? await handler.getQuotaInfo(request) : methodNotAllowed('GET')
  }
  return notFound()
}

async function handleAnnouncementRoutes(
  pathname: string,
  request: Request,
  handler: AnnouncementHandler
): Promise<Response> {
  const method = request.method
  if (pathname === '/api/announcements/active') {
    return method === 'GET' ? await handler.getActiveAnnouncements(request) : methodNotAllowed('GET')
  }
  if (pathname === '/api/announcements/admin') {
    if (method === 'GET') return await handler.getAnnouncements(request)
    if (method === 'POST') return await handler.createAnnouncement(request)
    return methodNotAllowed('GET, POST')
  }
  if (/^\/api\/announcements\/admin\/\d+$/.test(pathname)) {
    if (method === 'GET') return await handler.getAnnouncementById(request)
    if (method === 'PUT') return await handler.updateAnnouncement(request)
    if (method === 'DELETE') return await handler.deleteAnnouncement(request)
    return methodNotAllowed('GET, PUT, DELETE')
  }
  if (/^\/api\/announcements\/admin\/\d+\/toggle$/.test(pathname)) {
    return method === 'POST' ? await handler.toggleAnnouncementStatus(request) : methodNotAllowed('POST')
  }
  return notFound()
}

function methodNotAllowed(allow: string): Response {
  return Response.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: allow } }
  )
}

function notFound(): Response {
  return Response.json({ success: false, error: 'Not Found' }, { status: 404 })
}

function preflightResponse(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin')
  if (!origin || !allowedOrigin(origin, request, env)) {
    return new Response(null, { status: 403 })
  }
  return finalizeResponse(request, env, new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  }))
}

function finalizeResponse(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers)
  // Route handlers from the legacy architecture may still emit wildcard
  // CORS. Strip it before applying the single origin policy here.
  headers.delete('Access-Control-Allow-Origin')
  headers.delete('Access-Control-Allow-Credentials')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  const pathname = new URL(request.url).pathname
  if (pathname === '/public-inbox' || pathname.startsWith('/public-inbox/')) {
    // Public inbox links contain the mailbox address by design. Keep that
    // address out of search indexes and cross-site Referer headers.
    headers.set('Referrer-Policy', 'no-referrer')
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    headers.set('Cache-Control', 'no-store')
  }
  if ((pathname === '/api' || pathname.startsWith('/api/')) && !headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store')
  }

  const origin = request.headers.get('Origin')
  if (origin && allowedOrigin(origin, request, env)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.append('Vary', 'Origin')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function allowedOrigin(origin: string, request: Request, env: Env): boolean {
  if (origin === new URL(request.url).origin) return true
  if (!env.FRONTEND_DOMAIN) return false
  const configured = /^https?:\/\//.test(env.FRONTEND_DOMAIN)
    ? env.FRONTEND_DOMAIN
    : `${env.ENVIRONMENT === 'production' ? 'https' : 'http'}://${env.FRONTEND_DOMAIN}`
  try {
    return origin === new URL(configured).origin
  } catch {
    return false
  }
}
