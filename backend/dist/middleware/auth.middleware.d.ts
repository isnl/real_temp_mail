import type { Env, JWTPayload } from '@/types';
export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}
export declare function createAuthMiddleware(env: Env): {
    authenticate(request: Request): Promise<{
        request: AuthenticatedRequest;
        user: JWTPayload;
    }>;
    requireAdmin(request: Request): Promise<{
        request: AuthenticatedRequest;
        user: JWTPayload;
    }>;
    optionalAuth(request: Request): Promise<{
        request: AuthenticatedRequest;
        user?: JWTPayload;
    }>;
};
export declare function withAuth(env: Env): (handler: (request: AuthenticatedRequest, user: JWTPayload, env: Env) => Promise<Response>) => (request: Request) => Promise<Response>;
export declare function withAdminAuth(env: Env): (handler: (request: AuthenticatedRequest, user: JWTPayload, env: Env) => Promise<Response>) => (request: Request) => Promise<Response>;
export declare function withOptionalAuth(env: Env): (handler: (request: AuthenticatedRequest, user: JWTPayload | undefined, env: Env) => Promise<Response>) => (request: Request) => Promise<Response>;
//# sourceMappingURL=auth.middleware.d.ts.map