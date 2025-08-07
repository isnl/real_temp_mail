import { AuthService } from '@/modules/auth/auth.service';
import { DatabaseService } from '@/modules/shared/database.service';
import { withAuth } from '@/middleware/auth.middleware';
export class AuthHandler {
    env;
    authService;
    getCurrentUser;
    changePassword;
    constructor(env) {
        this.env = env;
        const dbService = new DatabaseService(env.DB);
        this.authService = new AuthService(env, dbService);
        // 初始化需要认证的方法
        this.getCurrentUser = withAuth(this.env)((request, user) => {
            return this.handleGetCurrentUser(request, user);
        });
        this.changePassword = withAuth(this.env)((request, user) => {
            return this.handleChangePassword(request, user);
        });
    }
    async register(request) {
        try {
            const data = await request.json();
            // 注册用户
            const result = await this.authService.register(data);
            return this.successResponse(result, '注册成功');
        }
        catch (error) {
            console.error('Register error:', error);
            return this.errorResponse(error.message || '注册失败', error.statusCode || 500);
        }
    }
    async login(request) {
        try {
            const data = await request.json();
            // 用户登录
            const result = await this.authService.login(data);
            return this.successResponse(result, '登录成功');
        }
        catch (error) {
            console.error('Login error:', error);
            return this.errorResponse(error.message || '登录失败', error.statusCode || 500);
        }
    }
    async refreshToken(request) {
        try {
            const { refreshToken } = await request.json();
            if (!refreshToken) {
                return this.errorResponse('缺少刷新令牌', 400);
            }
            const tokens = await this.authService.refreshTokens(refreshToken);
            return this.successResponse(tokens, '令牌刷新成功');
        }
        catch (error) {
            console.error('Refresh token error:', error);
            return this.errorResponse(error.message || '令牌刷新失败', error.statusCode || 401);
        }
    }
    async logout(request) {
        try {
            const { refreshToken } = await request.json();
            if (refreshToken) {
                await this.authService.logout(refreshToken);
            }
            return this.successResponse(null, '登出成功');
        }
        catch (error) {
            console.error('Logout error:', error);
            return this.errorResponse(error.message || '登出失败', error.statusCode || 500);
        }
    }
    // 需要认证的路由处理器已在构造函数中初始化
    async handleGetCurrentUser(request, user) {
        try {
            const currentUser = await this.authService.getCurrentUser(user.userId);
            return this.successResponse(currentUser);
        }
        catch (error) {
            console.error('Get current user error:', error);
            return this.errorResponse(error.message || '获取用户信息失败', error.statusCode || 500);
        }
    }
    async handleChangePassword(request, user) {
        try {
            const { currentPassword, newPassword, confirmPassword } = await request.json();
            if (!currentPassword || !newPassword || !confirmPassword) {
                return this.errorResponse('缺少必要参数', 400);
            }
            if (newPassword !== confirmPassword) {
                return this.errorResponse('新密码确认不一致', 400);
            }
            await this.authService.changePassword(user.userId, currentPassword, newPassword);
            return this.successResponse(null, '密码修改成功');
        }
        catch (error) {
            console.error('Change password error:', error);
            return this.errorResponse(error.message || '密码修改失败', error.statusCode || 500);
        }
    }
    successResponse(data, message) {
        const response = {
            success: true,
            data,
            message
        };
        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
    errorResponse(error, status = 500) {
        const response = {
            success: false,
            error
        };
        return new Response(JSON.stringify(response), {
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
