import type { User, TempEmail, Email, Domain, RedeemCode, RefreshToken, RateLimit, CreateUserData, PaginationParams, PaginatedResponse, SystemSetting, UserCheckin, QuotaLog, UserQuotaBalance } from '@/types';
export declare class DatabaseService {
    private db;
    constructor(db: D1Database);
    createUser(userData: CreateUserData): Promise<User>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserById(id: number): Promise<User | null>;
    getUserByProvider(provider: string, providerId: string): Promise<User | null>;
    updateUser(userId: number, updates: Partial<CreateUserData>): Promise<void>;
    updateUserQuota(userId: number, quota: number): Promise<void>;
    decrementUserQuota(userId: number): Promise<boolean>;
    updateUserPassword(userId: number, passwordHash: string): Promise<boolean>;
    createTempEmail(userId: number, email: string, domainId: number): Promise<TempEmail>;
    getTempEmailsByUserId(userId: number): Promise<TempEmail[]>;
    getTempEmailByEmail(email: string): Promise<TempEmail | null>;
    deleteTempEmail(id: number, userId: number): Promise<boolean>;
    createEmail(emailData: {
        tempEmailId: number;
        sender: string;
        subject?: string;
        content?: string;
        htmlContent?: string;
        verificationCode?: string;
    }): Promise<Email>;
    getEmailsForTempEmail(tempEmailId: number, pagination: PaginationParams): Promise<PaginatedResponse<Email>>;
    getEmailById(id: number): Promise<Email | null>;
    deleteEmail(id: number): Promise<boolean>;
    getActiveDomains(): Promise<Domain[]>;
    getDomainById(id: number): Promise<Domain | null>;
    getRedeemCode(code: string): Promise<RedeemCode | null>;
    useRedeemCode(code: string, userId: number): Promise<boolean>;
    hasUserUsedRedeemCode(code: string, userId: number): Promise<boolean>;
    getRedeemCodeUsageCount(code: string): Promise<number>;
    getRedeemCodeUsageList(code: string): Promise<Array<{
        userId: number;
        userEmail: string;
        usedAt: string;
    }>>;
    storeRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<void>;
    getRefreshToken(tokenHash: string): Promise<RefreshToken | null>;
    revokeRefreshToken(tokenHash: string): Promise<void>;
    createLog(logData: {
        userId?: number;
        action: string;
        ipAddress?: string;
        userAgent?: string;
        details?: string;
    }): Promise<void>;
    getSystemSetting(key: string): Promise<SystemSetting | null>;
    updateSystemSetting(key: string, value: string): Promise<void>;
    getTodayCheckin(userId: number): Promise<UserCheckin | null>;
    createCheckin(userId: number, quotaReward: number): Promise<UserCheckin>;
    getUserCheckinHistory(userId: number, limit?: number): Promise<UserCheckin[]>;
    createQuotaLog(data: {
        userId: number;
        type: 'earn' | 'consume';
        amount: number;
        source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email';
        description?: string;
        relatedId?: number;
        expiresAt?: string | null;
        quotaType?: 'permanent' | 'daily' | 'custom';
    }): Promise<QuotaLog>;
    getUserQuotaLogs(userId: number, page?: number, limit?: number): Promise<{
        logs: QuotaLog[];
        total: number;
    }>;
    getUsedQuotaFromLogs(userId: number): Promise<number>;
    createQuotaBalance(data: {
        userId: number;
        quotaType: 'permanent' | 'daily' | 'custom';
        amount: number;
        expiresAt?: string | null;
        source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust';
        sourceId?: number | null;
    }): Promise<UserQuotaBalance>;
    getUserQuotaBalances(userId: number): Promise<UserQuotaBalance[]>;
    getUserTotalQuota(userId: number): Promise<{
        total: number;
        available: number;
        expired: number;
    }>;
    consumeQuota(userId: number, amount: number): Promise<boolean>;
    cleanupExpiredQuotas(): Promise<number>;
    getExpiringQuotas(userId?: number): Promise<UserQuotaBalance[]>;
    getRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<RateLimit | null>;
    createOrUpdateRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<number>;
}
//# sourceMappingURL=database.service.d.ts.map