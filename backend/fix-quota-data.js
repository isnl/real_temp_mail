// 临时脚本：修复配额数据
// 这个脚本将用户的配额从总配额模式改为剩余配额模式

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== 配额数据修复脚本 ===');
console.log('');
console.log('此脚本将执行以下操作：');
console.log('1. 重新计算每个用户的剩余配额');
console.log('2. 确保没有负数配额');
console.log('3. 更新 users.quota 字段的含义');
console.log('');
console.log('注意：执行前请备份数据库！');
console.log('');

// 读取迁移SQL文件
const migrationPath = path.join(__dirname, 'src/migrations/0005_fix_quota_logic.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('迁移SQL内容：');
console.log('================');
console.log(migrationSQL);
console.log('================');
console.log('');
console.log('请手动执行上述SQL语句来修复配额数据。');
console.log('');
console.log('修复完成后，用户的配额字段将表示剩余配额，而不是总配额。');
