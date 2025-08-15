import type { Env, User, LoginRequest, TokenPair } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class AuthService {
    private env;
    private dbService;
    private jwtService;
    constructor(env: Env, dbService: DatabaseService);
    login(data: LoginRequest, request?: Request): Promise<{
        user: User;
        tokens: TokenPair;
    }>;
    refreshTokens(refreshToken: string): Promise<TokenPair>;
    logout(refreshToken: string): Promise<void>;
    getCurrentUser(userId: number): Promise<User>;
    logUserAction(userId: number, action: string, details: string, request?: Request): Promise<void>;
    changePassword(userId: number, currentPassword: string, newPassword: string, request?: Request): Promise<void>;
    private validateLoginData;
    private validatePassword;
    private isValidEmail;
    private hashPassword;
    private verifyPassword;
}
//# sourceMappingURL=auth.service.d.ts.map