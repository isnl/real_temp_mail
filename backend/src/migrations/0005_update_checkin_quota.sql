-- 更新签到配额设置为2个
UPDATE system_settings 
SET setting_value = '2', updated_at = datetime('now', '+8 hours')
WHERE setting_key = 'daily_checkin_quota';

-- 如果设置不存在，则插入
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) 
VALUES ('daily_checkin_quota', '2', '每日签到奖励配额数量');
