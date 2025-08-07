import type { Env } from '@/types';
export declare class CheckinHandler {
    private env;
    private checkinService;
    checkin: (request: Request) => Promise<Response>;
    getCheckinStatus: (request: Request) => Promise<Response>;
    getCheckinHistory: (request: Request) => Promise<Response>;
    getCheckinStats: (request: Request) => Promise<Response>;
    constructor(env: Env);
    /**
     * 处理用户签到
     */
    private handleCheckin;
    /**
     * 获取签到状态
     */
    private handleGetCheckinStatus;
    /**
     * 获取签到历史
     */
    private handleGetCheckinHistory;
    /**
     * 获取签到统计
     */
    private handleGetCheckinStats;
    /**
     * 成功响应
     */
    private successResponse;
    /**
     * 错误响应
     */
    private errorResponse;
}
//# sourceMappingURL=checkin.handler.d.ts.map