-- DROP TABLE IF EXISTS fans_count_history;
-- DROP TABLE IF EXISTS fans_accounts;
CREATE TABLE IF NOT EXISTS fans_accounts (id INTEGER PRIMARY KEY, ref_id TEXT NOT NULL, name TEXT, source TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS fans_count_history (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL, count INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
-- add fans_accounts unique index ref_id + source
CREATE UNIQUE INDEX IF NOT EXISTS fans_accounts_ref_id_source ON fans_accounts (ref_id, source);
