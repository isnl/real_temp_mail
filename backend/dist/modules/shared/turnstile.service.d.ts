import type { Env } from '@/types';
export declare class TurnstileService {
    private env;
    constructor(env: Env);
    verifyToken(token: string, remoteip?: string): Promise<boolean>;
}
//# sourceMappingURL=turnstile.service.d.ts.map