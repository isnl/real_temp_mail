import type { Env, Announcement, CreateAnnouncementData, UpdateAnnouncementData, AdminAnnouncementListParams, PaginatedResponse } from '@/types';
export declare class AnnouncementService {
    private env;
    constructor(env: Env);
    /**
     * 获取公告列表（分页）
     */
    getAnnouncements(params: AdminAnnouncementListParams): Promise<PaginatedResponse<Announcement>>;
    /**
     * 获取活跃公告列表（用户端）
     */
    getActiveAnnouncements(): Promise<Announcement[]>;
    /**
     * 根据ID获取公告
     */
    getAnnouncementById(id: number): Promise<Announcement | null>;
    /**
     * 创建公告
     */
    createAnnouncement(data: CreateAnnouncementData): Promise<Announcement>;
    /**
     * 更新公告
     */
    updateAnnouncement(id: number, data: UpdateAnnouncementData): Promise<void>;
    /**
     * 删除公告
     */
    deleteAnnouncement(id: number): Promise<void>;
    /**
     * 切换公告状态
     */
    toggleAnnouncementStatus(id: number): Promise<void>;
}
//# sourceMappingURL=announcement.service.d.ts.map