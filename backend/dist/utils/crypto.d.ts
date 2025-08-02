/**
 * 生成随机字符串
 * @param length 字符串长度
 * @param charset 字符集，默认为字母数字
 * @returns 随机字符串
 */
export declare function generateRandomString(length: number, charset?: string): string;
/**
 * 生成随机邮箱前缀
 * @param length 前缀长度，默认8位
 * @returns 随机邮箱前缀
 */
export declare function generateEmailPrefix(length?: number): string;
/**
 * 生成兑换码
 * @param length 兑换码长度，默认12位
 * @param prefix 前缀
 * @returns 兑换码
 */
export declare function generateRedeemCode(length?: number, prefix?: string): string;
/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * 验证密码
 * @param password 明文密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * 生成JWT密钥
 * @returns Base64编码的密钥
 */
export declare function generateJWTSecret(): string;
/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export declare function generateUUID(): string;
/**
 * 安全比较两个字符串（防止时序攻击）
 * @param a 字符串A
 * @param b 字符串B
 * @returns 是否相等
 */
export declare function safeCompare(a: string, b: string): boolean;
/**
 * 生成随机数字
 * @param min 最小值
 * @param max 最大值
 * @returns 随机数字
 */
export declare function generateRandomNumber(min: number, max: number): number;
/**
 * 生成验证码
 * @param length 验证码长度，默认6位
 * @returns 数字验证码
 */
export declare function generateVerificationCode(length?: number): string;
//# sourceMappingURL=crypto.d.ts.map