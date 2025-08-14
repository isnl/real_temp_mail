export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    BASE_DOMAIN: string;
    FRONTEND_DOMAIN: string;
    ENVIRONMENT: 'development' | 'production';
    TURNSTILE_SECRET_KEY: string;
    TURNSTILE_SITE_KEY: string;
    SENDER_DOMAIN: string;
    EMAIL_SENDER: any;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
}
export interface User {
    id: number;
    email: string;
    password_hash?: string;
    quota: number;
    role: 'user' | 'admin';
    is_active: boolean;
    provider: 'email' | 'github';
    provider_id?: string;
    avatar_url?: string;
    display_name?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateUserData {
    email: string;
    password_hash?: string;
    quota?: number;
    role?: 'user' | 'admin';
    provider?: 'email' | 'github';
    provider_id?: string;
    avatar_url?: string;
    display_name?: string;
}
export interface TempEmail {
    id: number;
    user_id: number;
    email: string;
    domain_id: number;
    created_at: string;
    active: boolean;
}
export interface Email {
    id: number;
    temp_email_id: number;
    sender: string;
    subject: string | null;
    content: string | null;
    html_content: string | null;
    verification_code: string | null;
    is_read: boolean;
    received_at: string;
}
export interface SystemSetting {
    id: number;
    setting_key: string;
    setting_value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}
export interface UserCheckin {
    id: number;
    user_id: number;
    checkin_date: string;
    quota_reward: number;
    created_at: string;
}
export interface QuotaLog {
    id: number;
    user_id: number;
    type: 'earn' | 'consume';
    amount: number;
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email';
    description: string | null;
    related_id: number | null;
    created_at: string;
    expires_at: string | null;
    quota_type: 'permanent' | 'daily' | 'custom';
}
export interface CheckinRequest {
}
export interface CheckinResponse {
    success: boolean;
    quota_reward: number;
    total_quota: number;
    message: string;
}
export interface Domain {
    id: number;
    domain: string;
    status: number;
    created_at: string;
}
export interface RedeemCode {
    code: string;
    name?: string;
    quota: number;
    valid_until: string;
    used: boolean;
    used_by: number | null;
    used_at: string | null;
    created_at: string;
    max_uses: number;
    used_count: number;
    never_expires: boolean;
}
export interface RedeemCodeUsage {
    id: number;
    code: string;
    user_id: number;
    used_at: string;
}
export interface UserQuotaBalance {
    id: number;
    user_id: number;
    quota_type: 'permanent' | 'daily' | 'custom';
    amount: number;
    expires_at: string | null;
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust';
    source_id: number | null;
    created_at: string;
    updated_at: string;
}
export interface JWTPayload {
    userId: number;
    email: string;
    role: 'user' | 'admin';
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface RefreshToken {
    id: number;
    user_id: number;
    token_hash: string;
    expires_at: string;
    created_at: string;
    is_revoked: boolean;
}
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
    turnstileToken?: string;
}
export interface GitHubOAuthRequest {
    code: string;
    state?: string;
}
export interface GitHubUser {
    id: number;
    login: string;
    email: string;
    name: string;
    avatar_url: string;
}
export interface GitHubOAuthResponse {
    access_token: string;
    token_type: string;
    scope: string;
}
export interface CreateEmailRequest {
    domainId: number;
}
export interface RedeemRequest {
    code: string;
    turnstileToken?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface OperationLog {
    id: number;
    user_id: number | null;
    action: string;
    ip_address: string | null;
    user_agent: string | null;
    details: string | null;
    timestamp: string;
}
export interface RateLimit {
    id: number;
    identifier: string;
    endpoint: string;
    request_count: number;
    window_start: string;
}
export interface RateLimitRule {
    endpoint: string;
    windowMs: number;
    maxRequests: number;
    requireAuth: boolean;
}
export interface ParsedEmail {
    from: {
        address: string;
        name?: string;
    };
    to: string;
    subject: string;
    text: string;
    html: string;
    verificationCode?: string;
}
export declare class AppError extends Error {
    message: string;
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export interface AdminUserListParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'inactive';
}
export interface AdminUserUpdateData {
    quota?: number;
    is_active?: boolean;
    role?: 'user' | 'admin';
}
export interface AdminDomainCreateData {
    domain: string;
    status?: number;
}
export interface AdminEmailListParams {
    page?: number;
    limit?: number;
    search?: string;
    sender?: string;
    tempEmailId?: number;
    startDate?: string;
    endDate?: string;
}
export interface AdminLogListParams {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
}
export interface AdminRedeemCodeCreateData {
    name?: string;
    quota: number;
    validUntil: string;
    count?: number;
    maxUses?: number;
    neverExpires?: boolean;
}
export interface AdminRedeemCodeListParams {
    page?: number;
    limit?: number;
    search?: string;
    name?: string;
    status?: 'all' | 'unused' | 'used' | 'expired';
    validityStatus?: 'all' | 'valid' | 'expired';
    startDate?: string;
    endDate?: string;
}
export interface AdminStatsData {
    totalUsers: number;
    activeUsers: number;
    totalTempEmails: number;
    activeTempEmails: number;
    totalEmails: number;
    totalDomains: number;
    activeDomains: number;
    totalRedeemCodes: number;
    usedRedeemCodes: number;
}
export interface Announcement {
    id: number;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface CreateAnnouncementData {
    title: string;
    content: string;
    is_active?: boolean;
}
export interface UpdateAnnouncementData {
    title?: string;
    content?: string;
    is_active?: boolean;
}
export interface AdminAnnouncementListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
}
//# sourceMappingURL=index.d.ts.map