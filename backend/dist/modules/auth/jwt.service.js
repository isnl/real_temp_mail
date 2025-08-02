export class JWTService {
    env;
    dbService;
    ACCESS_TOKEN_EXPIRES = 15 * 24 * 60 * 60; // 15天
    REFRESH_TOKEN_EXPIRES = 30 * 24 * 60 * 60; // 30天
    constructor(env, dbService) {
        this.env = env;
        this.dbService = dbService;
    }
    async generateTokenPair(user) {
        const accessToken = await this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user);
        // 存储 refresh token 到数据库
        await this.storeRefreshToken(user.id, refreshToken);
        return { accessToken, refreshToken };
    }
    async generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            type: 'access',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_EXPIRES
        };
        return await this.signJWT(payload);
    }
    async generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.REFRESH_TOKEN_EXPIRES
        };
        return await this.signJWT(payload);
    }
    async signJWT(payload) {
        if (!this.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.env.JWT_SECRET);
        const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const header = {
            alg: 'HS256',
            typ: 'JWT'
        };
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
        const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
        const signature = await crypto.subtle.sign('HMAC', key, data);
        const encodedSignature = this.base64UrlEncode(signature);
        return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    }
    async verifyJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const [encodedHeader, encodedPayload, encodedSignature] = parts;
            // 检查所有部分是否存在
            if (!encodedHeader || !encodedPayload || !encodedSignature) {
                return null;
            }
            // 验证签名
            if (!this.env.JWT_SECRET) {
                throw new Error('JWT_SECRET is not configured');
            }
            const encoder = new TextEncoder();
            const keyData = encoder.encode(this.env.JWT_SECRET);
            const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
            const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
            const signature = this.base64UrlDecode(encodedSignature);
            const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
            if (!isValid) {
                return null;
            }
            // 解析payload
            const payload = JSON.parse(this.base64UrlDecodeString(encodedPayload));
            // 检查过期时间
            if (payload.exp < Math.floor(Date.now() / 1000)) {
                return null;
            }
            return payload;
        }
        catch (error) {
            console.error('JWT verification error:', error);
            return null;
        }
    }
    async refreshTokens(refreshToken) {
        // 验证 refresh token
        const payload = await this.verifyJWT(refreshToken);
        if (!payload || payload.type !== 'refresh') {
            return null;
        }
        // 检查数据库中的 refresh token
        const tokenHash = await this.hashToken(refreshToken);
        const storedToken = await this.dbService.getRefreshToken(tokenHash);
        if (!storedToken) {
            return null;
        }
        // 获取用户信息
        const user = await this.dbService.getUserById(payload.userId);
        if (!user) {
            return null;
        }
        // 撤销旧的 refresh token
        await this.dbService.revokeRefreshToken(tokenHash);
        // 生成新的 token 对
        return await this.generateTokenPair(user);
    }
    async storeRefreshToken(userId, refreshToken) {
        const tokenHash = await this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES * 1000).toISOString();
        await this.dbService.storeRefreshToken(userId, tokenHash, expiresAt);
    }
    async revokeRefreshToken(refreshToken) {
        const tokenHash = await this.hashToken(refreshToken);
        await this.dbService.revokeRefreshToken(tokenHash);
    }
    async hashToken(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    base64UrlEncode(data) {
        let base64;
        if (typeof data === 'string') {
            base64 = btoa(data);
        }
        else {
            const bytes = new Uint8Array(data);
            const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
            base64 = btoa(binary);
        }
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    base64UrlDecode(data) {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    base64UrlDecodeString(data) {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        return atob(padded);
    }
}
