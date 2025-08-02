import { ValidationError, NotFoundError } from '@/types';
import { EmailParserService } from './parser.service';
export class EmailService {
    env;
    dbService;
    parserService;
    constructor(env, dbService) {
        this.env = env;
        this.dbService = dbService;
        this.parserService = new EmailParserService();
    }
    async createTempEmail(userId, request) {
        // 1. 检查用户配额
        const user = await this.dbService.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        if (user.quota <= 0) {
            throw new ValidationError('配额不足，无法创建临时邮箱');
        }
        // 2. 验证域名
        const domain = await this.dbService.getDomainById(request.domainId);
        if (!domain || domain.status !== 1) {
            throw new ValidationError('无效的域名');
        }
        // 3. 生成随机邮箱前缀
        const prefix = this.generateEmailPrefix();
        const email = `${prefix}@${domain.domain}`;
        // 4. 检查邮箱是否已存在
        const existingEmail = await this.dbService.getTempEmailByEmail(email);
        if (existingEmail) {
            // 如果存在，重新生成
            return this.createTempEmail(userId, request);
        }
        // 5. 原子操作：扣除配额并创建邮箱
        const success = await this.dbService.decrementUserQuota(userId);
        if (!success) {
            throw new ValidationError('配额不足，无法创建临时邮箱');
        }
        try {
            const tempEmail = await this.dbService.createTempEmail(userId, email, request.domainId);
            // 6. 记录日志
            await this.dbService.createLog({
                userId,
                action: 'CREATE_EMAIL',
                details: `Created temp email: ${email}`
            });
            return tempEmail;
        }
        catch (error) {
            // 如果创建失败，恢复配额
            await this.dbService.updateUserQuota(userId, user.quota);
            throw error;
        }
    }
    async getTempEmails(userId) {
        return await this.dbService.getTempEmailsByUserId(userId);
    }
    async deleteTempEmail(userId, emailId) {
        const success = await this.dbService.deleteTempEmail(emailId, userId);
        if (!success) {
            throw new NotFoundError('临时邮箱不存在或无权限删除');
        }
        // 记录日志
        await this.dbService.createLog({
            userId,
            action: 'DELETE_EMAIL',
            details: `Deleted temp email ID: ${emailId}`
        });
    }
    async getEmailsForTempEmail(userId, tempEmailId, pagination) {
        // 验证临时邮箱是否属于当前用户
        const tempEmails = await this.dbService.getTempEmailsByUserId(userId);
        const tempEmail = tempEmails.find(email => email.id === tempEmailId);
        if (!tempEmail) {
            throw new NotFoundError('临时邮箱不存在或无权限访问');
        }
        return await this.dbService.getEmailsForTempEmail(tempEmailId, pagination);
    }
    async deleteEmail(userId, emailId) {
        // 这里需要验证邮件是否属于用户的临时邮箱
        // 为简化，暂时直接删除，实际应用中需要添加权限检查
        const success = await this.dbService.deleteEmail(emailId);
        if (!success) {
            throw new NotFoundError('邮件不存在');
        }
        // 记录日志
        await this.dbService.createLog({
            userId,
            action: 'DELETE_EMAIL_CONTENT',
            details: `Deleted email ID: ${emailId}`
        });
    }
    async getActiveDomains() {
        return await this.dbService.getActiveDomains();
    }
    async redeemCode(userId, request) {
        // 1. 验证兑换码
        const redeemCode = await this.dbService.getRedeemCode(request.code);
        if (!redeemCode) {
            throw new ValidationError('兑换码不存在');
        }
        if (redeemCode.used) {
            throw new ValidationError('兑换码已被使用');
        }
        if (new Date(redeemCode.valid_until) < new Date()) {
            throw new ValidationError('兑换码已过期');
        }
        // 2. 使用兑换码
        const success = await this.dbService.useRedeemCode(request.code, userId);
        if (!success) {
            throw new ValidationError('兑换码使用失败');
        }
        // 3. 更新用户配额
        const user = await this.dbService.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        const newQuota = user.quota + redeemCode.quota;
        await this.dbService.updateUserQuota(userId, newQuota);
        // 4. 记录日志
        await this.dbService.createLog({
            userId,
            action: 'REDEEM_CODE',
            details: `Redeemed code: ${request.code}, quota: ${redeemCode.quota}`
        });
        return { quota: newQuota };
    }
    // 处理接收到的邮件（由Email Routing触发）
    async handleIncomingEmail(rawEmail, recipientEmail) {
        try {
            console.log('Processing incoming email for:', recipientEmail);
            // 1. 查找对应的临时邮箱
            const tempEmail = await this.dbService.getTempEmailByEmail(recipientEmail);
            if (!tempEmail || !tempEmail.active) {
                console.log('Temp email not found or inactive:', recipientEmail);
                return;
            }
            // 2. 解析邮件内容
            const parsedEmail = await this.parserService.parseEmail(rawEmail);
            // 3. 存储邮件到数据库
            const email = await this.dbService.createEmail({
                tempEmailId: tempEmail.id,
                sender: parsedEmail.from.address,
                subject: parsedEmail.subject,
                content: parsedEmail.text,
                htmlContent: parsedEmail.html,
                verificationCode: parsedEmail.verificationCode
            });
            console.log('Email stored successfully:', email.id);
            // 4. 这里可以添加实时推送逻辑（WebSocket等）
            // await this.notifyUser(tempEmail.user_id, email)
        }
        catch (error) {
            console.error('Error handling incoming email:', error);
        }
    }
    generateEmailPrefix() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        // 生成8-12位随机字符串
        const length = Math.floor(Math.random() * 5) + 8;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    // 获取用户配额信息
    async getQuotaInfo(userId) {
        const user = await this.dbService.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        const tempEmails = await this.dbService.getTempEmailsByUserId(userId);
        const used = tempEmails.filter(email => email.active).length;
        return {
            quota: user.quota,
            used
        };
    }
    // 搜索邮件
    async searchEmails(userId, params) {
        // 这里需要实现复杂的搜索逻辑
        // 为简化，暂时返回空结果
        return {
            data: [],
            total: 0,
            page: params.page,
            limit: params.limit,
            totalPages: 0
        };
    }
}
