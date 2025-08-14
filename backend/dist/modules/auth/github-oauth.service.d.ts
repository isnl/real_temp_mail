import type { Env, User } from '@/types';
import { DatabaseService } from '@/modules/shared/database.service';
export declare class GitHubOAuthService {
    private env;
    private dbService;
    private readonly GITHUB_AUTH_URL;
    private readonly GITHUB_TOKEN_URL;
    private readonly GITHUB_USER_URL;
    constructor(env: Env, dbService: DatabaseService);
    /**
     * 生成GitHub OAuth授权URL
     */
    generateAuthUrl(state?: string): string;
    /**
     * 处理GitHub OAuth回调
     */
    handleCallback(code: string, state?: string): Promise<{
        user: User;
        isNewUser: boolean;
    }>;
    /**
     * 用授权码换取访问令牌
     */
    private exchangeCodeForToken;
    /**
     * 使用访问令牌获取GitHub用户信息
     */
    private fetchGitHubUser;
    /**
     * 获取GitHub用户的邮箱地址
     */
    private fetchGitHubUserEmail;
    /**
     * 查找或创建用户
     */
    private findOrCreateUser;
    /**
     * 创建GitHub用户
     */
    private createGitHubUser;
    /**
     * 更新用户的GitHub信息
     */
    private updateUserFromGitHub;
    /**
     * 将GitHub账户关联到现有用户
     */
    private linkGitHubToExistingUser;
    /**
     * 生成随机状态字符串
     */
    private generateState;
    /**
     * 获取基础URL
     */
    private getBaseUrl;
}
//# sourceMappingURL=github-oauth.service.d.ts.map