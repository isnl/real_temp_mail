import type { Env, CheckinResponse, UserCheckin } from '@/types';
export declare class CheckinService {
    private env;
    private dbService;
    constructor(env: Env);
    /**
     * 用户签到
     */
    checkin(userId: number, request?: Request): Promise<CheckinResponse>;
    /**
     * 检查用户今日签到状态
     */
    getCheckinStatus(userId: number): Promise<{
        hasCheckedIn: boolean;
        checkinRecord?: UserCheckin;
        nextCheckinTime?: string;
    }>;
    /**
     * 获取用户签到历史
     */
    getCheckinHistory(userId: number, limit?: number): Promise<UserCheckin[]>;
    /**
     * 获取签到统计信息
     */
    getCheckinStats(userId: number): Promise<{
        totalCheckins: number;
        currentStreak: number;
        longestStreak: number;
        thisMonthCheckins: number;
    }>;
}
//# sourceMappingURL=checkin.service.d.ts.map