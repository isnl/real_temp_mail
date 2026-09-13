-- Historical versions rebuilt every core table merely to change timestamp
-- defaults. With foreign_keys enabled, dropping users/domains/temp_emails
-- cascaded into child rows and destroyed real data. Keep the original tables
-- in place. The deliberate no-op also leaves redeem_codes keyed by `code`,
-- matching deployed databases that were created by the legacy setup scripts.
-- Migration 0014 performs the single audited conversion to numeric IDs after
-- it can migrate redeem_code_usage in the same transaction.
UPDATE redeem_codes SET code = code WHERE 0;
