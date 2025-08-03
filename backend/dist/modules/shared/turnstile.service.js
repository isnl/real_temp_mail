export class TurnstileService {
    env;
    constructor(env) {
        this.env = env;
    }
    async verifyToken(token, remoteip) {
        // 开发环境跳过验证
        if (this.env.ENVIRONMENT === 'development' && token === 'dev-token') {
            return true;
        }
        try {
            const formData = new FormData();
            formData.append('secret', this.env.TURNSTILE_SECRET_KEY);
            formData.append('response', token);
            if (remoteip) {
                formData.append('remoteip', remoteip);
            }
            const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                console.error('Turnstile API request failed:', response.status, response.statusText);
                return false;
            }
            const result = await response.json();
            return result.success;
        }
        catch (error) {
            console.error('Turnstile verification error:', error);
            return false;
        }
    }
}
