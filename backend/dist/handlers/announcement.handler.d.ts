import type { Env } from '@/types';
export declare class AnnouncementHandler {
    private env;
    private announcementService;
    private authMiddleware;
    constructor(env: Env);
    private createResponse;
    private createErrorResponse;
    /**
     * 验证管理员权限
     */
    private validateAdminAuth;
    /**
     * 获取公告列表（管理员）
     */
    getAnnouncements(request: Request): Promise<Response>;
    /**
     * 获取活跃公告列表（用户端）
     */
    getActiveAnnouncements(request: Request): Promise<Response>;
    /**
     * 根据ID获取公告
     */
    getAnnouncementById(request: Request): Promise<Response>;
    /**
     * 创建公告
     */
    createAnnouncement(request: Request): Promise<Response>;
    /**
     * 更新公告
     */
    updateAnnouncement(request: Request): Promise<Response>;
    /**
     * 删除公告
     */
    deleteAnnouncement(request: Request): Promise<Response>;
    /**
     * 切换公告状态
     */
    toggleAnnouncementStatus(request: Request): Promise<Response>;
}
//# sourceMappingURL=announcement.handler.d.ts.map