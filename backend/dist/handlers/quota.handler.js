import { DatabaseService } from '@/modules/shared/database.service';
import { withAuth } from '@/middleware/auth.middleware';
export class QuotaHandler {
    env;
    dbService;
    getQuotaLogs;
    getQuotaInfo;
    constructor(env) {
        this.env = env;
        this.dbService = new DatabaseService(env.DB);
        // 初始化需要认证的方法
        this.getQuotaLogs = withAuth(this.env)((request, user) => {
            return this.handleGetQuotaLogs(request, user);
        });
        this.getQuotaInfo = withAuth(this.env)((request, user) => {
            return this.handleGetQuotaInfo(request, user);
        });
    }
    /**
     * 获取用户配额记录
     */
    async handleGetQuotaLogs(request, user) {
        try {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '20');
            const result = await this.dbService.getUserQuotaLogs(user.userId, page, limit);
            return this.successResponse(result);
        }
        catch (error) {
            console.error('Get quota logs error:', error);
            return this.errorResponse(error.message || '获取配额记录失败', error.statusCode || 500);
        }
    }
    /**
     * 获取用户配额信息
     */
    async handleGetQuotaInfo(request, user) {
        try {
            // 获取用户信息
            const userInfo = await this.dbService.getUserById(user.userId);
            if (!userInfo) {
                return this.errorResponse('用户不存在', 404);
            }
            // 获取已使用配额
            const usedQuota = await this.dbService.getUsedQuotaFromLogs(user.userId);
            const quotaInfo = {
                remaining: userInfo.quota, // 剩余配额
                used: usedQuota, // 已使用配额
                total: userInfo.quota + usedQuota // 总配额
            };
            return this.successResponse(quotaInfo);
        }
        catch (error) {
            console.error('Get quota info error:', error);
            return this.errorResponse(error.message || '获取配额信息失败', error.statusCode || 500);
        }
    }
    /**
     * 成功响应
     */
    successResponse(data, message) {
        return new Response(JSON.stringify({
            success: true,
            data,
            message
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
    /**
     * 错误响应
     */
    errorResponse(message, status = 500) {
        return new Response(JSON.stringify({
            success: false,
            error: message
        }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
}
