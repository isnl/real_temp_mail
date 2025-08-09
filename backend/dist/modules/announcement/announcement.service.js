import { ValidationError, NotFoundError } from '@/types';
export class AnnouncementService {
    env;
    constructor(env) {
        this.env = env;
    }
    /**
     * 获取公告列表（分页）
     */
    async getAnnouncements(params) {
        const { page = 1, limit = 20, search, status } = params;
        const offset = (page - 1) * limit;
        // 构建查询条件
        let whereClause = '1=1';
        const queryParams = [];
        if (search) {
            whereClause += ' AND (title LIKE ? OR content LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`);
        }
        if (status === 'active') {
            whereClause += ' AND is_active = 1';
        }
        else if (status === 'inactive') {
            whereClause += ' AND is_active = 0';
        }
        // 获取总数
        const countQuery = `SELECT COUNT(*) as total FROM announcements WHERE ${whereClause}`;
        const countResult = await this.env.DB.prepare(countQuery).bind(...queryParams).first();
        const total = Number(countResult?.total) || 0;
        // 获取数据
        const dataQuery = `
      SELECT * FROM announcements 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
        const announcements = await this.env.DB.prepare(dataQuery)
            .bind(...queryParams, limit, offset)
            .all();
        return {
            data: announcements.results,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    /**
     * 获取活跃公告列表（用户端）
     */
    async getActiveAnnouncements() {
        const query = `
      SELECT * FROM announcements 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `;
        const result = await this.env.DB.prepare(query).all();
        return result.results;
    }
    /**
     * 根据ID获取公告
     */
    async getAnnouncementById(id) {
        const query = 'SELECT * FROM announcements WHERE id = ?';
        const result = await this.env.DB.prepare(query).bind(id).first();
        return result;
    }
    /**
     * 创建公告
     */
    async createAnnouncement(data) {
        const { title, content, is_active = true } = data;
        // 验证输入
        if (!title?.trim()) {
            throw new ValidationError('公告标题不能为空');
        }
        if (!content?.trim()) {
            throw new ValidationError('公告内容不能为空');
        }
        if (title.length > 200) {
            throw new ValidationError('公告标题不能超过200个字符');
        }
        const query = `
      INSERT INTO announcements (title, content, is_active)
      VALUES (?, ?, ?)
    `;
        const result = await this.env.DB.prepare(query)
            .bind(title.trim(), content.trim(), is_active ? 1 : 0)
            .run();
        if (!result.success) {
            throw new Error('创建公告失败');
        }
        const newAnnouncement = await this.getAnnouncementById(result.meta.last_row_id);
        if (!newAnnouncement) {
            throw new Error('获取新创建的公告失败');
        }
        return newAnnouncement;
    }
    /**
     * 更新公告
     */
    async updateAnnouncement(id, data) {
        const { title, content, is_active } = data;
        // 检查公告是否存在
        const existingAnnouncement = await this.getAnnouncementById(id);
        if (!existingAnnouncement) {
            throw new NotFoundError('公告不存在');
        }
        // 验证输入
        if (title !== undefined) {
            if (!title?.trim()) {
                throw new ValidationError('公告标题不能为空');
            }
            if (title.length > 200) {
                throw new ValidationError('公告标题不能超过200个字符');
            }
        }
        if (content !== undefined && !content?.trim()) {
            throw new ValidationError('公告内容不能为空');
        }
        // 构建更新语句
        const updateFields = [];
        const updateParams = [];
        if (title !== undefined) {
            updateFields.push('title = ?');
            updateParams.push(title.trim());
        }
        if (content !== undefined) {
            updateFields.push('content = ?');
            updateParams.push(content.trim());
        }
        if (is_active !== undefined) {
            updateFields.push('is_active = ?');
            updateParams.push(is_active ? 1 : 0);
        }
        if (updateFields.length === 0) {
            throw new ValidationError('没有提供要更新的字段');
        }
        updateFields.push('updated_at = datetime(\'now\', \'+8 hours\')');
        updateParams.push(id);
        const query = `
      UPDATE announcements 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
        const result = await this.env.DB.prepare(query).bind(...updateParams).run();
        if (!result.success) {
            throw new Error('更新公告失败');
        }
    }
    /**
     * 删除公告
     */
    async deleteAnnouncement(id) {
        // 检查公告是否存在
        const existingAnnouncement = await this.getAnnouncementById(id);
        if (!existingAnnouncement) {
            throw new NotFoundError('公告不存在');
        }
        const query = 'DELETE FROM announcements WHERE id = ?';
        const result = await this.env.DB.prepare(query).bind(id).run();
        if (!result.success) {
            throw new Error('删除公告失败');
        }
    }
    /**
     * 切换公告状态
     */
    async toggleAnnouncementStatus(id) {
        const announcement = await this.getAnnouncementById(id);
        if (!announcement) {
            throw new NotFoundError('公告不存在');
        }
        const newStatus = !announcement.is_active;
        await this.updateAnnouncement(id, { is_active: newStatus });
    }
}
