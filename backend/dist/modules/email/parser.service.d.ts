import type { ParsedEmail } from '@/types';
export declare class EmailParserService {
    parseEmail(rawEmail: string | ArrayBuffer): Promise<ParsedEmail>;
    private extractVerificationCode;
    extractLinks(content: string): string[];
    extractPhoneNumbers(content: string): string[];
    detectEmailType(subject: string, content: string): string;
    stripHtml(html: string): string;
}
//# sourceMappingURL=parser.service.d.ts.map