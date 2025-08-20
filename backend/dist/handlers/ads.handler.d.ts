import type { Env } from '@/types';
export declare class AdsHandler {
    private env;
    private adsService;
    generateQRCode: (request: Request) => Promise<Response>;
    verifyAdStatus: (request: Request) => Promise<Response>;
    constructor(env: Env);
    /**
     * 生成广告二维码
     */
    private handleGenerateQRCode;
    /**
     * 验证广告观看状态
     */
    private handleVerifyAdStatus;
    /**
     * 成功响应
     */
    private successResponse;
    /**
     * 错误响应
     */
    private errorResponse;
}
//# sourceMappingURL=ads.handler.d.ts.map