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
        // 1. 检查用户剩余配额
        const user = await this.dbService.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        console.log(`用户 ${userId} 当前剩余配额: ${user.quota}`);
        if (user.quota <= 0) {
            console.log(`用户 ${userId} 配额不足，当前剩余: ${user.quota}`);
            throw new ValidationError('剩余配额不足，无法创建临时邮箱');
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
        // 5. 原子操作：扣除剩余配额并创建邮箱
        const success = await this.dbService.decrementUserQuota(userId);
        if (!success) {
            throw new ValidationError('剩余配额不足，无法创建临时邮箱');
        }
        try {
            const tempEmail = await this.dbService.createTempEmail(userId, email, request.domainId);
            // 6. 创建配额消费记录
            await this.dbService.createQuotaLog({
                userId,
                type: 'consume',
                amount: 1,
                source: 'create_email',
                description: `创建临时邮箱: ${email}`,
                relatedId: tempEmail.id
            });
            // 7. 记录日志
            await this.dbService.createLog({
                userId,
                action: 'CREATE_EMAIL',
                details: `Created temp email: ${email}`
            });
            return tempEmail;
        }
        catch (error) {
            // 如果创建失败，恢复剩余配额（加回被扣除的1个配额）
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
    async getEmailDetail(userId, emailId) {
        // 获取邮件详情
        const email = await this.dbService.getEmailById(emailId);
        if (!email) {
            throw new NotFoundError('邮件不存在');
        }
        // 验证邮件是否属于用户的临时邮箱
        const tempEmails = await this.dbService.getTempEmailsByUserId(userId);
        const tempEmail = tempEmails.find(te => te.id === email.temp_email_id);
        if (!tempEmail) {
            throw new NotFoundError('邮件不存在或无权限访问');
        }
        return email;
    }
    async deleteEmail(userId, emailId) {
        // 先验证邮件是否属于用户
        await this.getEmailDetail(userId, emailId); // 这会检查权限
        const success = await this.dbService.deleteEmail(emailId);
        if (!success) {
            throw new NotFoundError('邮件删除失败');
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
        if (new Date(redeemCode.valid_until) < new Date()) {
            throw new ValidationError('兑换码已过期');
        }
        // 2. 检查用户是否已经使用过这个兑换码
        const hasUsed = await this.dbService.hasUserUsedRedeemCode(request.code, userId);
        if (hasUsed) {
            throw new ValidationError('您已经使用过这个兑换码');
        }
        // 3. 检查兑换码是否还有可用次数
        const currentUses = await this.dbService.getRedeemCodeUsageCount(request.code);
        if (currentUses >= redeemCode.max_uses) {
            throw new ValidationError('兑换码使用次数已达上限');
        }
        // 4. 使用兑换码
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
        // 4. 创建配额获得记录
        await this.dbService.createQuotaLog({
            userId,
            type: 'earn',
            amount: redeemCode.quota,
            source: 'redeem_code',
            description: `兑换码奖励: ${request.code}`
        });
        // 5. 记录日志
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
            // 1. 验证收件人邮箱格式
            if (!recipientEmail || !recipientEmail.includes('@')) {
                console.error('Invalid recipient email format:', recipientEmail);
                return;
            }
            // 2. 查找对应的临时邮箱
            const tempEmail = await this.dbService.getTempEmailByEmail(recipientEmail);
            if (!tempEmail) {
                console.log('Temp email not found:', recipientEmail);
                return;
            }
            if (!tempEmail.active) {
                console.log('Temp email is inactive:', recipientEmail);
                return;
            }
            console.log('Found temp email:', tempEmail.id, 'for user:', tempEmail.user_id);
            // 3. 解析邮件内容
            const parsedEmail = await this.parserService.parseEmail(rawEmail);
            console.log('Email parsed successfully. From:', parsedEmail.from.address, 'Subject:', parsedEmail.subject);
            // 4. 验证解析结果
            if (!parsedEmail.from.address) {
                console.error('Failed to parse sender address from email');
                // 仍然尝试存储，使用默认值
                parsedEmail.from.address = 'unknown@unknown.com';
            }
            // 5. 存储邮件到数据库
            const email = await this.dbService.createEmail({
                tempEmailId: tempEmail.id,
                sender: parsedEmail.from.address,
                subject: parsedEmail.subject || '无主题',
                content: parsedEmail.text,
                htmlContent: parsedEmail.html,
                verificationCode: parsedEmail.verificationCode
            });
            console.log('Email stored successfully:', {
                emailId: email.id,
                tempEmailId: tempEmail.id,
                sender: parsedEmail.from.address,
                subject: parsedEmail.subject,
                hasContent: !!parsedEmail.text,
                hasHtml: !!parsedEmail.html,
                hasVerificationCode: !!parsedEmail.verificationCode
            });
            // 6. 记录邮件接收日志
            await this.dbService.createLog({
                userId: tempEmail.user_id,
                action: 'RECEIVE_EMAIL',
                details: `Received email from ${parsedEmail.from.address} to ${recipientEmail}`
            });
            // 7. 这里可以添加实时推送逻辑（WebSocket等）
            // await this.notifyUser(tempEmail.user_id, email)
        }
        catch (error) {
            console.error('Error handling incoming email:', error);
            console.error('Error details:', {
                recipientEmail,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined
            });
            // 不抛出错误，避免影响Email Routing的正常工作
            // 但可以考虑记录到错误日志系统
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
    // 获取用户信息
    async getUserById(userId) {
        return await this.dbService.getUserById(userId);
    }
    // 获取用户配额信息
    async getQuotaInfo(userId) {
        const user = await this.dbService.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        // 基于 quota_logs 计算已使用配额
        const used = await this.dbService.getUsedQuotaFromLogs(userId);
        return {
            quota: user.quota, // 现在 quota 字段表示剩余配额
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
