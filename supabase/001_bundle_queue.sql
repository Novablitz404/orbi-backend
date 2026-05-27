-- Bundle queue: holds user-signed auth entries waiting to be batched.
-- One row per user request. The backend drains this table on each flush.

CREATE TABLE bundle_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_entry_xdr  TEXT        NOT NULL,           -- base64 SorobanAuthorizationEntry
  contract_id     TEXT        NOT NULL,           -- C-address of target contract
  function        TEXT        NOT NULL,           -- function name
  args_xdr        TEXT        NOT NULL,           -- JSON array of base64 ScVal XDR args
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | flushing | done | failed
  flush_batch_id  UUID,                           -- set when a flush claims this row
  tx_hash         TEXT,                           -- filled when status = done
  error           TEXT,                           -- filled when status = failed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bundle_queue_status_idx        ON bundle_queue(status);
CREATE INDEX bundle_queue_flush_batch_idx   ON bundle_queue(flush_batch_id);

-- Block all public/anon access. The backend uses SUPABASE_SERVICE_KEY which
-- bypasses RLS, so no policies are needed — just the lock.
ALTER TABLE bundle_queue ENABLE ROW LEVEL SECURITY;

-- Atomically claims up to p_limit pending rows for a flush batch.
-- Uses a single UPDATE...WHERE id IN (SELECT...LIMIT) which is atomic in Postgres:
-- concurrent callers claim different rows, no double-submission.
CREATE OR REPLACE FUNCTION claim_pending_bundle(p_batch_id UUID, p_limit INT DEFAULT 50)
RETURNS SETOF bundle_queue
LANGUAGE sql
AS $$
  UPDATE bundle_queue
  SET    status         = 'flushing',
         flush_batch_id = p_batch_id,
         updated_at     = NOW()
  WHERE  id IN (
    SELECT id FROM bundle_queue
    WHERE  status = 'pending'
    ORDER  BY created_at ASC
    LIMIT  p_limit
  )
  RETURNING *;
$$;
