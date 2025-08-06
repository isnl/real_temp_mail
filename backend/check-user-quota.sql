-- 检查用户配额情况
SELECT 
  u.id,
  u.email,
  u.quota as remaining_quota,
  COALESCE(SUM(CASE WHEN ql.type = 'consume' THEN ql.amount ELSE 0 END), 0) as used_quota,
  COALESCE(SUM(CASE WHEN ql.type = 'earn' THEN ql.amount ELSE 0 END), 0) as earned_quota,
  u.quota + COALESCE(SUM(CASE WHEN ql.type = 'consume' THEN ql.amount ELSE 0 END), 0) as total_quota
FROM users u
LEFT JOIN quota_logs ql ON u.id = ql.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.email, u.quota
ORDER BY u.id;

-- 检查配额记录
SELECT 
  ql.*,
  u.email
FROM quota_logs ql
JOIN users u ON ql.user_id = u.id
ORDER BY ql.created_at DESC
LIMIT 20;
