import { CheckinService } from '@/modules/checkin/checkin.service';
import { TurnstileService } from '@/modules/shared/turnstile.service';
import { withAuth } from '@/middleware/auth.middleware';
export class CheckinHandler {
    env;
    checkinService;
    turnstileService;
    checkin;
    getCheckinStatus;
    getCheckinHistory;
    getCheckinStats;
    constructor(env) {
        this.env = env;
        this.checkinService = new CheckinService(env);
        this.turnstileService = new TurnstileService(env);
        // 初始化需要认证的方法
        this.checkin = withAuth(this.env)((request, user) => {
            return this.handleCheckin(request, user);
        });
        this.getCheckinStatus = withAuth(this.env)((request, user) => {
            return this.handleGetCheckinStatus(request, user);
        });
        this.getCheckinHistory = withAuth(this.env)((request, user) => {
            return this.handleGetCheckinHistory(request, user);
        });
        this.getCheckinStats = withAuth(this.env)((request, user) => {
            return this.handleGetCheckinStats(request, user);
        });
    }
    /**
     * 处理用户签到
     */
    async handleCheckin(request, user) {
        try {
            const data = await request.json();
            // 验证Turnstile
            const clientIP = request.headers.get('CF-Connecting-IP') ||
                request.headers.get('X-Forwarded-For');
            const isTurnstileValid = await this.turnstileService.verifyToken(data.turnstileToken, clientIP || undefined);
            if (!isTurnstileValid) {
                return this.errorResponse('人机验证失败', 400);
            }
            const result = await this.checkinService.checkin(user.userId);
            return this.successResponse(result, result.message);
        }
        catch (error) {
            console.error('Checkin error:', error);
            return this.errorResponse(error.message || '签到失败', error.statusCode || 500);
        }
    }
    /**
     * 获取签到状态
     */
    async handleGetCheckinStatus(request, user) {
        try {
            const status = await this.checkinService.getCheckinStatus(user.userId);
            return this.successResponse(status);
        }
        catch (error) {
            console.error('Get checkin status error:', error);
            return this.errorResponse(error.message || '获取签到状态失败', error.statusCode || 500);
        }
    }
    /**
     * 获取签到历史
     */
    async handleGetCheckinHistory(request, user) {
        try {
            const url = new URL(request.url);
            const limit = parseInt(url.searchParams.get('limit') || '30');
            const history = await this.checkinService.getCheckinHistory(user.userId, limit);
            return this.successResponse(history);
        }
        catch (error) {
            console.error('Get checkin history error:', error);
            return this.errorResponse(error.message || '获取签到历史失败', error.statusCode || 500);
        }
    }
    /**
     * 获取签到统计
     */
    async handleGetCheckinStats(request, user) {
        try {
            const stats = await this.checkinService.getCheckinStats(user.userId);
            return this.successResponse(stats);
        }
        catch (error) {
            console.error('Get checkin stats error:', error);
            return this.errorResponse(error.message || '获取签到统计失败', error.statusCode || 500);
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
