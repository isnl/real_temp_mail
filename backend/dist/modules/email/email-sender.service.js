import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
export class EmailSenderService {
    env;
    constructor(env) {
        this.env = env;
    }
    /**
     * 发送邮箱验证码
     */
    async sendVerificationCode(email, code) {
        const msg = createMimeMessage();
        // 设置发件人（使用你的域名）
        msg.setSender({
            name: "临时邮箱服务",
            addr: `noreply@${this.env.SENDER_DOMAIN || 'oooo.icu'}`
        });
        // 设置收件人
        msg.setRecipient(email);
        // 设置主题
        msg.setSubject("邮箱验证码 - 临时邮箱服务");
        // 设置邮件内容
        const htmlContent = this.generateVerificationCodeHTML(code);
        const textContent = this.generateVerificationCodeText(code);
        // 添加纯文本内容
        msg.addMessage({
            contentType: 'text/plain',
            data: textContent
        });
        // 添加HTML内容
        msg.addMessage({
            contentType: 'text/html',
            data: htmlContent
        });
        // 创建邮件消息
        const message = new EmailMessage(`noreply@${this.env.SENDER_DOMAIN || 'oooo.icu'}`, email, msg.asRaw());
        try {
            // 发送邮件
            await this.env.EMAIL_SENDER.send(message);
            console.log(`Verification code sent to ${email}`);
        }
        catch (error) {
            console.error('Failed to send verification code:', error);
            throw new Error('邮件发送失败');
        }
    }
    /**
     * 生成验证码邮件的HTML内容
     */
    generateVerificationCodeHTML(code) {
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邮箱验证码</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .code-container {
            background-color: #f8fafc;
            border: 2px dashed #3b82f6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            color: #3b82f6;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
        }
        .description {
            color: #6b7280;
            margin-bottom: 20px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📧 四欧(oooo.icu)临时邮箱服务</div>
            <div class="title">邮箱验证码</div>
        </div>
        
        <p class="description">
            您好！感谢您注册我们的临时邮箱服务。请使用以下验证码完成注册：
        </p>
        
        <div class="code-container">
            <div class="code">${code}</div>
        </div>
        
        <div class="warning">
            <strong>⚠️ 重要提醒：</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>验证码有效期为 <strong>10分钟</strong></li>
                <li>请勿将验证码泄露给他人</li>
                <li>如果您没有申请注册，请忽略此邮件</li>
            </ul>
        </div>
        
        <p class="description">
            如果您在注册过程中遇到任何问题，请发送邮件至 admin@oooo.icu 联系我们。
        </p>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>© 2025 临时邮箱服务 - 保护您的隐私，简化您的生活</p>
        </div>
    </div>
</body>
</html>
    `;
    }
    /**
     * 生成验证码邮件的纯文本内容
     */
    generateVerificationCodeText(code) {
        return `
临时邮箱服务 - 邮箱验证码

您好！感谢您注册我们的临时邮箱服务。

您的验证码是：${code}

重要提醒：
- 验证码有效期为10分钟
- 请勿将验证码泄露给他人
- 如果您没有申请注册，请忽略此邮件

如果您在注册过程中遇到任何问题，请联系我们的客服团队。

此邮件由系统自动发送，请勿回复。
© 2025 临时邮箱服务
    `;
    }
}
