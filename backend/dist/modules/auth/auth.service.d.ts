import type { Env, User, LoginRequest, RegisterRequest, TokenPair } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class AuthService {
    private env;
    private dbService;
    private jwtService;
    constructor(env: Env, dbService: DatabaseService);
    register(data: RegisterRequest): Promise<{
        user: User;
        tokens: TokenPair;
    }>;
    login(data: LoginRequest): Promise<{
        user: User;
        tokens: TokenPair;
    }>;
    refreshTokens(refreshToken: string): Promise<TokenPair>;
    logout(refreshToken: string): Promise<void>;
    getCurrentUser(userId: number): Promise<User>;
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
    private validateRegisterData;
    private validateLoginData;
    private validatePassword;
    private isValidEmail;
    private hashPassword;
    private verifyPassword;
}
//# sourceMappingURL=auth.service.d.ts.map