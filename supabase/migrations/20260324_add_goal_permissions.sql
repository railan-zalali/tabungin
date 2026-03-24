-- Add permission level to wallet_goals_shared
ALTER TABLE wallet_goals_shared
ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'read_write' NOT NULL;

-- Add constraint to valid permission levels
ALTER TABLE wallet_goals_shared
ADD CONSTRAINT check_permission_level
CHECK (permission_level IN ('read_only', 'read_write', 'admin'));

-- Create sharing activity log table
CREATE TABLE IF NOT EXISTS sharing_activity_log (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL, -- 'shared', 'revoked', 'permission_changed', 'access_granted'
    performed_by TEXT NOT NULL,
    metadata TEXT, -- JSON metadata for additional context
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_goal_id ON sharing_activity_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_wallet_id ON sharing_activity_log(wallet_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_timestamp ON sharing_activity_log(timestamp DESC);
