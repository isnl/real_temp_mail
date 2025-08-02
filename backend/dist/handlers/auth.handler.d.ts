import type { Env } from '@/types';
export declare class AuthHandler {
    private env;
    private authService;
    private turnstileService;
    getCurrentUser: (request: Request) => Promise<Response>;
    changePassword: (request: Request) => Promise<Response>;
    constructor(env: Env);
    register(request: Request): Promise<Response>;
    login(request: Request): Promise<Response>;
    refreshToken(request: Request): Promise<Response>;
    logout(request: Request): Promise<Response>;
    private handleGetCurrentUser;
    private handleChangePassword;
    private successResponse;
    private errorResponse;
}
//# sourceMappingURL=auth.handler.d.ts.map