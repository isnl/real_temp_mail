import type { Env, User, JWTPayload, TokenPair } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class JWTService {
    private env;
    private dbService;
    private readonly ACCESS_TOKEN_EXPIRES;
    private readonly REFRESH_TOKEN_EXPIRES;
    constructor(env: Env, dbService: DatabaseService);
    generateTokenPair(user: User): Promise<TokenPair>;
    private generateAccessToken;
    private generateRefreshToken;
    private signJWT;
    verifyJWT(token: string): Promise<JWTPayload | null>;
    refreshTokens(refreshToken: string): Promise<TokenPair | null>;
    private storeRefreshToken;
    revokeRefreshToken(refreshToken: string): Promise<void>;
    private hashToken;
    private base64UrlEncode;
    private base64UrlDecode;
    private base64UrlDecodeString;
}
//# sourceMappingURL=jwt.service.d.ts.map