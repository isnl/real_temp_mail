// 错误类型
export class AppError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
export class AuthenticationError extends AppError {
    constructor(message = '认证失败') {
        super(message, 401, 'AUTH_ERROR');
    }
}
export class AuthorizationError extends AppError {
    constructor(message = '权限不足') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
export class NotFoundError extends AppError {
    constructor(message = '资源不存在') {
        super(message, 404, 'NOT_FOUND_ERROR');
    }
}
export class RateLimitError extends AppError {
    constructor(message = '请求过于频繁') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}
