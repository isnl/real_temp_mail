import { DatabaseService } from '@/modules/shared/database.service';
export const RATE_LIMIT_RULES = [
    // 注册限流：每小时最多 3 次
    {
        endpoint: '/api/auth/register',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        requireAuth: false,
        requireTurnstile: true
    },
    // 登录限流：每 15 分钟最多 5 次
    {
        endpoint: '/api/auth/login',
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        requireAuth: false,
        requireTurnstile: true
    },
    // 密码修改限流：每小时最多 5 次
    {
        endpoint: '/api/auth/change-password',
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
        requireAuth: true,
        requireTurnstile: false
    },
    // 兑换码限流：每小时最多 10 次
    {
        endpoint: '/api/email/redeem',
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        requireAuth: true,
        requireTurnstile: true
    }
];
export function createRateLimitMiddleware(env) {
    const dbService = new DatabaseService(env.DB);
    return {
        async checkRateLimit(request, endpoint, userId) {
            // 查找匹配的限流规则
            const rule = RATE_LIMIT_RULES.find(r => r.endpoint === endpoint);
            if (!rule) {
                return; // 没有限流规则，直接通过
            }
            // 生成标识符
            const identifier = await this.generateIdentifier(request, userId);
            // 检查当前请求计数
            const currentCount = await dbService.createOrUpdateRateLimit(identifier, endpoint, rule.windowMs);
            if (currentCount > rule.maxRequests) {
                throw new Response(JSON.stringify({
                    success: false,
                    error: '请求过于频繁，请稍后再试',
                    code: 'RATE_LIMIT_ERROR'
                }), {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': Math.ceil(rule.windowMs / 1000).toString()
                    }
                });
            }
            // 检查是否需要 Turnstile 验证
            if (rule.requireTurnstile) {
                await this.verifyTurnstile(request, env);
            }
        },
        async generateIdentifier(request, userId) {
            const clientIP = request.headers.get('CF-Connecting-IP') ||
                request.headers.get('X-Forwarded-For') ||
                'unknown';
            if (userId) {
                return `user:${userId}:${clientIP}`;
            }
            else {
                return `ip:${clientIP}`;
            }
        },
        async verifyTurnstile(request, env) {
            try {
                const body = await request.clone().json();
                const turnstileToken = body.turnstileToken;
                if (!turnstileToken) {
                    throw new Response(JSON.stringify({
                        success: false,
                        error: '缺少人机验证令牌'
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                // 开发环境跳过验证或使用测试密钥
                const isDevelopment = env.ENVIRONMENT === 'development';
                if (isDevelopment && turnstileToken === 'XXXX.DUMMY.TOKEN.XXXX') {
                    // 开发环境允许使用虚拟token
                    return;
                }
                // 验证 Turnstile token
                const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        secret: env.TURNSTILE_SECRET_KEY,
                        response: turnstileToken,
                        remoteip: request.headers.get('CF-Connecting-IP') || ''
                    })
                });
                const verifyResult = await verifyResponse.json();
                console.log('Turnstile verification result:', {
                    success: verifyResult.success,
                    errorCodes: verifyResult['error-codes'],
                    challenge_ts: verifyResult.challenge_ts,
                    hostname: verifyResult.hostname,
                    action: verifyResult.action,
                    cdata: verifyResult.cdata
                });
                if (!verifyResult.success) {
                    const errorCodes = verifyResult['error-codes'] || [];
                    const errorMessage = errorCodes.length > 0
                        ? `人机验证失败: ${errorCodes.join(', ')}`
                        : '人机验证失败';
                    console.error('Turnstile verification failed:', {
                        errorCodes,
                        turnstileToken: turnstileToken.substring(0, 20) + '...',
                        remoteip: request.headers.get('CF-Connecting-IP') || '',
                        secretKey: env.TURNSTILE_SECRET_KEY.substring(0, 10) + '...'
                    });
                    throw new Response(JSON.stringify({
                        success: false,
                        error: errorMessage
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            catch (error) {
                if (error instanceof Response) {
                    throw error;
                }
                console.error('Turnstile verification error:', error);
                throw new Response(JSON.stringify({
                    success: false,
                    error: '人机验证过程中发生错误'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
    };
}
// 创建限流装饰器函数
export function withRateLimit(env, endpoint) {
    const rateLimitMiddleware = createRateLimitMiddleware(env);
    return function rateLimitDecorator(handler) {
        return (async function (request, ...args) {
            try {
                // 从参数中提取 userId（如果有的话）
                const userId = args.find(arg => arg && typeof arg === 'object' && arg.userId)?.userId;
                await rateLimitMiddleware.checkRateLimit(request, endpoint, userId);
                return await handler(request, ...args);
            }
            catch (error) {
                if (error instanceof Response) {
                    return error;
                }
                console.error('Rate limit middleware error:', error);
                return new Response(JSON.stringify({
                    success: false,
                    error: '限流检查过程中发生错误'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        });
    };
}
