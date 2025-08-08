import type { Env } from '@/types';
export declare class AuthHandler {
    private env;
    private authService;
    getCurrentUser: (request: Request) => Promise<Response>;
    changePassword: (request: Request) => Promise<Response>;
    register: (request: Request) => Promise<Response>;
    login: (request: Request) => Promise<Response>;
    constructor(env: Env);
    private handleRegister;
    private handleLogin;
    refreshToken(request: Request): Promise<Response>;
    logout(request: Request): Promise<Response>;
    private handleGetCurrentUser;
    private handleChangePassword;
    private successResponse;
    private errorResponse;
}
//# sourceMappingURL=auth.handler.d.ts.map