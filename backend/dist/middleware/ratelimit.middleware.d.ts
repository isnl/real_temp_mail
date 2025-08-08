import type { Env } from '@/types';
export interface RateLimitRule {
    endpoint: string;
    windowMs: number;
    maxRequests: number;
    requireAuth: boolean;
    requireTurnstile: boolean;
}
export declare const RATE_LIMIT_RULES: RateLimitRule[];
export declare function createRateLimitMiddleware(env: Env): {
    checkRateLimit(request: Request, endpoint: string, userId?: number): Promise<void>;
    generateIdentifier(request: Request, userId?: number): Promise<string>;
    verifyTurnstile(request: Request, env: Env): Promise<void>;
};
export declare function withRateLimit(env: Env, endpoint: string): <T extends (...args: any[]) => Promise<Response>>(handler: T) => T;
//# sourceMappingURL=ratelimit.middleware.d.ts.map