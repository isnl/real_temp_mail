import type { Env } from '@/types';
export declare class AdminHandler {
    private env;
    private adminService;
    private authMiddleware;
    constructor(env: Env);
    private validateAdminAuth;
    private createResponse;
    private createErrorResponse;
    getDashboardStats(request: Request): Promise<Response>;
    getUsers(request: Request): Promise<Response>;
    getUserById(request: Request): Promise<Response>;
    updateUser(request: Request): Promise<Response>;
    deleteUser(request: Request): Promise<Response>;
    getDomains(request: Request): Promise<Response>;
    createDomain(request: Request): Promise<Response>;
    updateDomain(request: Request): Promise<Response>;
    deleteDomain(request: Request): Promise<Response>;
    getEmails(request: Request): Promise<Response>;
    deleteEmail(request: Request): Promise<Response>;
    getLogs(request: Request): Promise<Response>;
    getLogActions(request: Request): Promise<Response>;
    getRedeemCodes(request: Request): Promise<Response>;
    createRedeemCode(request: Request): Promise<Response>;
    createBatchRedeemCodes(request: Request): Promise<Response>;
    deleteRedeemCode(request: Request): Promise<Response>;
}
//# sourceMappingURL=admin.handler.d.ts.map