import { ValidationError } from '@/types';
import { AdsService } from '@/modules/ads/ads.service';
import { withAuth } from '@/middleware/auth.middleware';
export class AdsHandler {
    env;
    adsService;
    generateQRCode;
    verifyAdStatus;
    constructor(env) {
        this.env = env;
        this.adsService = new AdsService(env);
        // 初始化需要认证的方法
        this.generateQRCode = withAuth(this.env)((request, user) => {
            return this.handleGenerateQRCode(request, user);
        });
        this.verifyAdStatus = withAuth(this.env)((request, user) => {
            return this.handleVerifyAdStatus(request, user);
        });
    }
    /**
     * 生成广告二维码
     */
    async handleGenerateQRCode(request, user) {
        try {
            const result = await this.adsService.generateQRCode(user.userId);
            return this.successResponse(result);
        }
        catch (error) {
            console.error('Generate QR code error:', error);
            return this.errorResponse(error.message || '生成二维码失败', error.statusCode || 500);
        }
    }
    /**
     * 验证广告观看状态
     */
    async handleVerifyAdStatus(request, user) {
        try {
            const body = await request.json();
            const { code } = body;
            if (!code) {
                throw new ValidationError('缺少必要参数：code');
            }
            const result = await this.adsService.verifyAdStatus(user.userId, code);
            return this.successResponse(result, result.message);
        }
        catch (error) {
            console.error('Verify ad status error:', error);
            return this.errorResponse(error.message || '验证广告状态失败', error.statusCode || 500);
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
