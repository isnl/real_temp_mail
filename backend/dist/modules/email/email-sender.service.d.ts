import type { Env } from '@/types';
export declare class EmailSenderService {
    private env;
    constructor(env: Env);
    /**
     * 发送邮箱验证码
     */
    sendVerificationCode(email: string, code: string): Promise<void>;
    /**
     * 生成验证码邮件的HTML内容
     */
    private generateVerificationCodeHTML;
    /**
     * 生成验证码邮件的纯文本内容
     */
    private generateVerificationCodeText;
}
//# sourceMappingURL=email-sender.service.d.ts.map