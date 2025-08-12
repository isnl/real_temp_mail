import type { Env, Domain, RedeemCode, PaginatedResponse, AdminUserListParams, AdminUserUpdateData, AdminDomainCreateData, AdminEmailListParams, AdminLogListParams, AdminRedeemCodeCreateData, AdminRedeemCodeListParams, SystemSetting } from '@/types';
import type { AdminDashboardStats, AdminUserDetails, AdminEmailDetails, AdminLogDetails, AdminRedeemCodeDetails, BatchRedeemCodeCreate, QuotaLogWithUser } from './types';
export declare class AdminService {
    private env;
    private db;
    constructor(env: Env);
    getDashboardStats(): Promise<AdminDashboardStats>;
    getUsers(params: AdminUserListParams): Promise<PaginatedResponse<AdminUserDetails>>;
    getUserById(userId: number): Promise<AdminUserDetails | null>;
    updateUser(userId: number, updateData: AdminUserUpdateData): Promise<void>;
    deleteUser(userId: number): Promise<void>;
    getDomains(): Promise<Domain[]>;
    createDomain(domainData: AdminDomainCreateData): Promise<Domain>;
    updateDomain(domainId: number, status: number): Promise<void>;
    deleteDomain(domainId: number): Promise<void>;
    getEmails(params: AdminEmailListParams): Promise<PaginatedResponse<AdminEmailDetails>>;
    deleteEmail(emailId: number): Promise<void>;
    getLogs(params: AdminLogListParams): Promise<PaginatedResponse<AdminLogDetails>>;
    getLogActions(): Promise<string[]>;
    getRedeemCodes(params?: AdminRedeemCodeListParams): Promise<PaginatedResponse<AdminRedeemCodeDetails>>;
    createRedeemCode(data: AdminRedeemCodeCreateData): Promise<RedeemCode>;
    createBatchRedeemCodes(data: BatchRedeemCodeCreate): Promise<RedeemCode[]>;
    deleteRedeemCode(code: string): Promise<void>;
    getSystemSettings(): Promise<SystemSetting[]>;
    getSystemSetting(key: string): Promise<SystemSetting | null>;
    updateSystemSetting(key: string, value: string): Promise<void>;
    getQuotaLogs(page?: number, limit?: number, filters?: {
        userId?: number;
        type?: 'earn' | 'consume';
        source?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<PaginatedResponse<QuotaLogWithUser>>;
    getQuotaStats(): Promise<{
        totalEarned: number;
        totalConsumed: number;
        todayEarned: number;
        todayConsumed: number;
        sourceStats: Array<{
            source: string;
            count: number;
            amount: number;
        }>;
    }>;
    allocateQuotaToUser(userId: number, amount: number, description?: string): Promise<void>;
}
//# sourceMappingURL=admin.service.d.ts.map