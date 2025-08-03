import type { Env } from '@/types';
export declare class QuotaHandler {
    private env;
    private dbService;
    getQuotaLogs: (request: Request) => Promise<Response>;
    constructor(env: Env);
    /**
     * 获取用户配额记录
     */
    private handleGetQuotaLogs;
    /**
     * 成功响应
     */
    private successResponse;
    /**
     * 错误响应
     */
    private errorResponse;
}
//# sourceMappingURL=quota.handler.d.ts.map