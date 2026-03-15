-- ---------------------------------------------------------------
-- Storage limits per plan + file size tracking
-- ---------------------------------------------------------------
-- storage_limit_bytes : base plan quota in bytes (null = unlimited)
-- extra_storage_gb    : purchased extra storage blocks (each 10 GB)
-- ---------------------------------------------------------------

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS extra_storage_gb    INTEGER NOT NULL DEFAULT 0;

-- Backfill existing workspaces based on current plan
UPDATE workspaces SET storage_limit_bytes = CASE
  WHEN plan = 'individual' THEN  2147483648   -- 2 GB
  WHEN plan = 'pro'        THEN 10737418240   -- 10 GB
  WHEN plan = 'team'       THEN 32212254720   -- 30 GB
  ELSE NULL                                   -- enterprise = unlimited
END;

-- Track uploaded file sizes so we can enforce quotas
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
