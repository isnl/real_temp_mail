import type { Env, TempEmail, Email, Domain, CreateEmailRequest, PublicInboxResponse, RedeemRequest, PaginationParams, PaginatedResponse } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class EmailService {
    private env;
    private dbService;
    private parserService;
    private readonly PUBLIC_INBOX_ACCESS_EXPIRES;
    constructor(env: Env, dbService: DatabaseService);
    createTempEmail(userId: number, request: CreateEmailRequest, httpRequest?: Request): Promise<TempEmail>;
    getTempEmails(userId: number): Promise<TempEmail[]>;
    deleteTempEmail(userId: number, emailId: number): Promise<void>;
    updateTempEmailPublicInbox(userId: number, emailId: number, publicInboxEnabled: boolean): Promise<TempEmail>;
    getEmailsForTempEmail(userId: number, tempEmailId: number, pagination: PaginationParams): Promise<PaginatedResponse<Email>>;
    getPublicInbox(emailAddress: string, pagination: PaginationParams): Promise<PublicInboxResponse>;
    verifyPublicInboxAccessToken(token: string | undefined, emailAddress: string): Promise<boolean>;
    private createPublicInboxAccessPayload;
    private signPublicInboxAccessToken;
    private signPublicInboxAccessPayload;
    private hashPublicInboxEmail;
    private hmacSha256;
    private base64UrlEncode;
    private base64UrlDecodeString;
    private safeCompare;
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