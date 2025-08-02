import type { Env } from '@/types';
export declare class TurnstileService {
    private env;
    constructor(env: Env);
    verifyToken(token: string, remoteIP?: string): Promise<boolean>;
}
export declare function createTurnstileMiddleware(env: Env): (request: Request, next: () => Promise<Response>) => Promise<Response>;
//# sourceMappingURL=turnstile.middleware.d.ts.map