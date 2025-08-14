import type { Env } from '@/types';
export declare class AuthHandler {
    private env;
    private authService;
    private githubOAuthService;
    private jwtService;
    getCurrentUser: (request: Request) => Promise<Response>;
    changePassword: (request: Request) => Promise<Response>;
    login: (request: Request) => Promise<Response>;
    constructor(env: Env);
    private handleLogin;
    githubAuth(request: Request): Promise<Response>;
    githubCallback(request: Request): Promise<Response>;
    refreshToken(request: Request): Promise<Response>;
    logout(request: Request): Promise<Response>;
    private handleGetCurrentUser;
    private handleChangePassword;
    private getFrontendUrl;
    private successResponse;
    private errorResponse;
}
//# sourceMappingURL=auth.handler.d.ts.map