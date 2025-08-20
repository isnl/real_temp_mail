import type { Env, GenerateQRCodeResponse, VerifyAdStatusResponse } from '@/types';
export declare class AdsService {
    private env;
    private db;
    constructor(env: Env);
    /**
     * 生成广告二维码
     */
    generateQRCode(userId: number): Promise<GenerateQRCodeResponse>;
    /**
     * 验证广告观看状态并发放奖励
     */
    verifyAdStatus(userId: number, code: string): Promise<VerifyAdStatusResponse>;
}
//# sourceMappingURL=ads.service.d.ts.map