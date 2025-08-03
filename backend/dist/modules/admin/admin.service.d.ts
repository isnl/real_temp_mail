import type { Env, Domain, RedeemCode, PaginatedResponse, AdminUserListParams, AdminUserUpdateData, AdminDomainCreateData, AdminEmailListParams, AdminLogListParams, AdminRedeemCodeCreateData, SystemSetting } from '@/types';
import type { AdminDashboardStats, AdminUserDetails, AdminEmailDetails, AdminLogDetails, AdminRedeemCodeDetails, BatchRedeemCodeCreate } from './types';
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
    getRedeemCodes(page?: number, limit?: number): Promise<PaginatedResponse<AdminRedeemCodeDetails>>;
    createRedeemCode(data: AdminRedeemCodeCreateData): Promise<RedeemCode>;
    createBatchRedeemCodes(data: BatchRedeemCodeCreate): Promise<RedeemCode[]>;
    deleteRedeemCode(code: string): Promise<void>;
    getSystemSettings(): Promise<SystemSetting[]>;
    getSystemSetting(key: string): Promise<SystemSetting | null>;
    updateSystemSetting(key: string, value: string): Promise<void>;
}
//# sourceMappingURL=admin.service.d.ts.map