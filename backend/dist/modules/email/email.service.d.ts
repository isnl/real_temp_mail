import type { Env, TempEmail, Email, Domain, CreateEmailRequest, RedeemRequest, PaginationParams, PaginatedResponse } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class EmailService {
    private env;
    private dbService;
    private parserService;
    constructor(env: Env, dbService: DatabaseService);
    createTempEmail(userId: number, request: CreateEmailRequest): Promise<TempEmail>;
    getTempEmails(userId: number): Promise<TempEmail[]>;
    deleteTempEmail(userId: number, emailId: number): Promise<void>;
    getEmailsForTempEmail(userId: number, tempEmailId: number, pagination: PaginationParams): Promise<PaginatedResponse<Email>>;
    getEmailDetail(userId: number, emailId: number): Promise<Email>;
    deleteEmail(userId: number, emailId: number): Promise<void>;
    getActiveDomains(): Promise<Domain[]>;
    redeemCode(userId: number, request: RedeemRequest): Promise<{
        quota: number;
    }>;
    handleIncomingEmail(rawEmail: string | ArrayBuffer, recipientEmail: string): Promise<void>;
    private generateEmailPrefix;
    getUserById(userId: number): Promise<import("@/types").User | null>;
    getQuotaInfo(userId: number): Promise<{
        quota: number;
        used: number;
    }>;
    searchEmails(userId: number, params: {
        tempEmailId?: number;
        keyword?: string;
        sender?: string;
        dateFrom?: string;
        dateTo?: string;
    } & PaginationParams): Promise<PaginatedResponse<Email>>;
}
//# sourceMappingURL=email.service.d.ts.map