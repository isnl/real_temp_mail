import PostalMime from 'postal-mime';
export class EmailParserService {
    async parseEmail(rawEmail) {
        try {
            const parser = new PostalMime();
            const email = await parser.parse(rawEmail);
            // 提取基本信息
            const from = {
                address: email.from?.address || '',
                name: email.from?.name || ''
            };
            const to = email.to?.[0]?.address || '';
            const subject = email.subject || '无主题';
            const text = email.text || '';
            const html = email.html || '';
            // 尝试提取验证码
            const verificationCode = this.extractVerificationCode(text + ' ' + html);
            return {
                from,
                to,
                subject,
                text,
                html,
                verificationCode
            };
        }
        catch (error) {
            console.error('Email parsing error:', error);
            console.error('Error details:', {
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined,
                rawEmailType: typeof rawEmail,
                rawEmailSize: rawEmail instanceof ArrayBuffer ? rawEmail.byteLength :
                    typeof rawEmail === 'string' ? rawEmail.length : 'unknown'
            });
            // 尝试从原始邮件中提取基本信息
            let fallbackFrom = '';
            let fallbackSubject = '邮件解析失败';
            let fallbackContent = '邮件内容解析失败，请查看原始邮件';
            try {
                const emailText = rawEmail instanceof ArrayBuffer ?
                    new TextDecoder().decode(rawEmail) :
                    String(rawEmail);
                // 尝试提取发件人
                const fromMatch = emailText.match(/^From:\s*(.+)$/m);
                if (fromMatch && fromMatch[1]) {
                    fallbackFrom = fromMatch[1].trim();
                }
                // 尝试提取主题
                const subjectMatch = emailText.match(/^Subject:\s*(.+)$/m);
                if (subjectMatch && subjectMatch[1]) {
                    fallbackSubject = subjectMatch[1].trim();
                }
                // 保存原始内容的一部分作为备用
                if (emailText.length > 100) {
                    fallbackContent = emailText.substring(0, 500) + '...';
                }
                else {
                    fallbackContent = emailText;
                }
            }
            catch (fallbackError) {
                console.error('Fallback parsing also failed:', fallbackError);
            }
            // 返回解析失败的默认结构，但包含尽可能多的信息
            return {
                from: {
                    address: fallbackFrom || 'unknown@unknown.com',
                    name: ''
                },
                to: '',
                subject: fallbackSubject,
                text: fallbackContent,
                html: '',
                verificationCode: undefined
            };
        }
    }
    extractVerificationCode(content) {
        if (!content)
            return undefined;
        // 常见的验证码模式
        const patterns = [
            // 中文验证码模式
            /验证码[：:\s]*([0-9]{4,8})/i,
            /您的验证码是[：:\s]*([0-9]{4,8})/i,
            /验证码为[：:\s]*([0-9]{4,8})/i,
            /动态码[：:\s]*([0-9]{4,8})/i,
            /安全码[：:\s]*([0-9]{4,8})/i,
            // 英文验证码模式
            /verification code[：:\s]*([0-9]{4,8})/i,
            /your verification code is[：:\s]*([0-9]{4,8})/i,
            /code[：:\s]*([0-9]{4,8})/i,
            /pin[：:\s]*([0-9]{4,8})/i,
            /otp[：:\s]*([0-9]{4,8})/i,
            /security code[：:\s]*([0-9]{4,8})/i,
            /access code[：:\s]*([0-9]{4,8})/i,
            // 通用数字模式
            /\b([0-9]{4,8})\b.*验证/i,
            /\b([0-9]{4,8})\b.*code/i,
            /\b([0-9]{6})\b/g, // 6位数字（最常见的验证码格式）
            // 特殊格式
            /(\d{3}[-\s]\d{3})/g, // 123-456 或 123 456 格式
            /(\d{2}[-\s]\d{2}[-\s]\d{2})/g, // 12-34-56 格式
        ];
        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                const code = match[1].replace(/[-\s]/g, ''); // 移除分隔符
                // 验证码长度检查
                if (code.length >= 4 && code.length <= 8) {
                    return code;
                }
            }
        }
        // 如果没有找到明确的验证码模式，尝试查找独立的4-8位数字
        const standaloneNumbers = content.match(/\b\d{4,8}\b/g);
        if (standaloneNumbers && standaloneNumbers.length > 0) {
            // 返回第一个找到的4-8位数字
            return standaloneNumbers[0];
        }
        return undefined;
    }
    // 提取邮件中的链接
    extractLinks(content) {
        const linkPattern = /https?:\/\/[^\s<>"]+/gi;
        const matches = content.match(linkPattern);
        return matches || [];
    }
    // 提取邮件中的电话号码
    extractPhoneNumbers(content) {
        const phonePatterns = [
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 美国格式
            /\b\d{3}[-\s]?\d{4}[-\s]?\d{4}\b/g, // 中国格式
            /\+\d{1,3}[-\s]?\d{3,4}[-\s]?\d{3,4}[-\s]?\d{3,4}/g // 国际格式
        ];
        const phoneNumbers = [];
        phonePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                phoneNumbers.push(...matches);
            }
        });
        return phoneNumbers;
    }
    // 检测邮件类型
    detectEmailType(subject, content) {
        const lowerSubject = subject.toLowerCase();
        const lowerContent = content.toLowerCase();
        // 验证码邮件
        if (lowerSubject.includes('verification') ||
            lowerSubject.includes('验证') ||
            lowerContent.includes('verification code') ||
            lowerContent.includes('验证码')) {
            return 'verification';
        }
        // 重置密码邮件
        if (lowerSubject.includes('reset') ||
            lowerSubject.includes('password') ||
            lowerSubject.includes('重置') ||
            lowerSubject.includes('密码')) {
            return 'password_reset';
        }
        // 注册确认邮件
        if (lowerSubject.includes('confirm') ||
            lowerSubject.includes('welcome') ||
            lowerSubject.includes('确认') ||
            lowerSubject.includes('欢迎')) {
            return 'registration';
        }
        // 通知邮件
        if (lowerSubject.includes('notification') ||
            lowerSubject.includes('alert') ||
            lowerSubject.includes('通知') ||
            lowerSubject.includes('提醒')) {
            return 'notification';
        }
        // 营销邮件
        if (lowerSubject.includes('offer') ||
            lowerSubject.includes('sale') ||
            lowerSubject.includes('discount') ||
            lowerSubject.includes('优惠') ||
            lowerSubject.includes('促销')) {
            return 'marketing';
        }
        return 'general';
    }
    // 清理HTML内容，提取纯文本
    stripHtml(html) {
        if (!html)
            return '';
        return html
            .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除脚本
            .replace(/<style[^>]*>.*?<\/style>/gi, '') // 移除样式
            .replace(/<[^>]+>/g, '') // 移除HTML标签
            .replace(/&nbsp;/g, ' ') // 替换空格实体
            .replace(/&amp;/g, '&') // 替换&实体
            .replace(/&lt;/g, '<') // 替换<实体
            .replace(/&gt;/g, '>') // 替换>实体
            .replace(/&quot;/g, '"') // 替换"实体
            .replace(/&#39;/g, "'") // 替换'实体
            .replace(/\s+/g, ' ') // 合并多个空格
            .trim();
    }
}
