import type { Env } from '@/types';
export declare class EmailHandler {
    private env;
    private emailService;
    createTempEmail: (request: Request) => Promise<Response>;
    getTempEmails: (request: Request) => Promise<Response>;
    deleteTempEmail: (request: Request) => Promise<Response>;
    getEmailsForTempEmail: (request: Request) => Promise<Response>;
    getEmailDetail: (request: Request) => Promise<Response>;
    deleteEmail: (request: Request) => Promise<Response>;
    redeemCode: (request: Request) => Promise<Response>;
    getQuotaInfo: (request: Request) => Promise<Response>;
    constructor(env: Env);
    getDomains(request: Request): Promise<Response>;
    handleIncomingEmail(request: Request): Promise<Response>;
    private handleCreateTempEmail;
    private handleGetTempEmails;
    private handleDeleteTempEmail;
    private handleGetEmailsForTempEmail;
    private handleGetEmailDetail;
    private handleDeleteEmail;
    private handleRedeemCode;
    private handleGetQuotaInfo;
    private successResponse;
    private errorResponse;
}
//# sourceMappingURL=email.handler.d.ts.map