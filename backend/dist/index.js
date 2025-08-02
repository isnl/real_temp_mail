import { AuthHandler } from '@/handlers/auth.handler';
import { EmailHandler } from '@/handlers/email.handler';
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;
        const method = request.method;
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
            });
        }
        try {
            // 初始化处理器
            const authHandler = new AuthHandler(env);
            const emailHandler = new EmailHandler(env);
            // 路由匹配
            if (pathname.startsWith('/api/auth/')) {
                return await handleAuthRoutes(pathname, method, request, authHandler);
            }
            else if (pathname.startsWith('/api/email/')) {
                return await handleEmailRoutes(pathname, method, request, emailHandler);
            }
            else if (pathname === '/api/webhook/email') {
                // Email Routing webhook
                return await emailHandler.handleIncomingEmail(request);
            }
            else if (pathname === '/api/health') {
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Service is healthy',
                    timestamp: new Date().toISOString()
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            else {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Not Found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        catch (error) {
            console.error('Unhandled error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'Internal Server Error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
async function handleAuthRoutes(pathname, method, request, handler) {
    switch (pathname) {
        case '/api/auth/register':
            if (method === 'POST')
                return await handler.register(request);
            break;
        case '/api/auth/login':
            if (method === 'POST')
                return await handler.login(request);
            break;
        case '/api/auth/refresh':
            if (method === 'POST')
                return await handler.refreshToken(request);
            break;
        case '/api/auth/logout':
            if (method === 'POST')
                return await handler.logout(request);
            break;
        case '/api/auth/me':
            if (method === 'GET')
                return await handler.getCurrentUser(request);
            break;
        case '/api/auth/change-password':
            if (method === 'POST')
                return await handler.changePassword(request);
            break;
    }
    return new Response(JSON.stringify({
        success: false,
        error: 'Method Not Allowed'
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}
async function handleEmailRoutes(pathname, method, request, handler) {
    // 域名相关路由（公开）
    if (pathname === '/api/email/domains') {
        if (method === 'GET')
            return await handler.getDomains(request);
    }
    // 临时邮箱相关路由（需要认证）
    if (pathname === '/api/email/temp-emails') {
        if (method === 'GET')
            return await handler.getTempEmails(request);
    }
    if (pathname === '/api/email/create') {
        if (method === 'POST')
            return await handler.createTempEmail(request);
    }
    // 删除临时邮箱 /api/email/temp-emails/:id
    if (pathname.match(/^\/api\/email\/temp-emails\/\d+$/)) {
        if (method === 'DELETE')
            return await handler.deleteTempEmail(request);
    }
    // 获取临时邮箱的邮件列表 /api/email/temp-emails/:id/emails
    if (pathname.match(/^\/api\/email\/temp-emails\/\d+\/emails$/)) {
        if (method === 'GET')
            return await handler.getEmailsForTempEmail(request);
    }
    // 删除邮件 /api/email/emails/:id
    if (pathname.match(/^\/api\/email\/emails\/\d+$/)) {
        if (method === 'DELETE')
            return await handler.deleteEmail(request);
    }
    // 兑换码相关路由
    if (pathname === '/api/email/redeem') {
        if (method === 'POST')
            return await handler.redeemCode(request);
    }
    // 配额信息
    if (pathname === '/api/email/quota') {
        if (method === 'GET')
            return await handler.getQuotaInfo(request);
    }
    return new Response(JSON.stringify({
        success: false,
        error: 'Method Not Allowed'
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}
// Email Routing 处理器
export async function email(message, env, ctx) {
    try {
        const emailHandler = new EmailHandler(env);
        // 构造一个模拟的Request对象来处理邮件
        const url = new URL(`https://temp-email.workers.dev/api/webhook/email?to=${message.to}`);
        const request = new Request(url.toString(), {
            method: 'POST',
            body: message.raw
        });
        await emailHandler.handleIncomingEmail(request);
    }
    catch (error) {
        console.error('Email routing error:', error);
    }
}
