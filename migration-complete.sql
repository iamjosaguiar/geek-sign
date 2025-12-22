-- COMPLETE ENVELOPE SYSTEM MIGRATION
-- Creates tables and migrates data from documents → envelopes
-- Safe: runs in transaction, auto-rollback on error

BEGIN;

-- Display pre-migration counts
DO $$
DECLARE
  doc_count INT;
  rec_count INT;
  field_count INT;
  log_count INT;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM documents;
  SELECT COUNT(*) INTO rec_count FROM recipients;
  SELECT COUNT(*) INTO field_count FROM document_fields;
  SELECT COUNT(*) INTO log_count FROM audit_logs;

  RAISE NOTICE '';
  RAISE NOTICE '=== PRE-MIGRATION COUNTS ===';
  RAISE NOTICE 'Documents: %', doc_count;
  RAISE NOTICE 'Recipients: %', rec_count;
  RAISE NOTICE 'Document Fields: %', field_count;
  RAISE NOTICE 'Audit Logs: %', log_count;
  RAISE NOTICE '';
END $$;

-- Step 1: Create envelope tables
CREATE TABLE IF NOT EXISTS envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' NOT NULL,
  email_subject TEXT,
  email_message TEXT,
  current_routing_order INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS envelopes_user_id_idx ON envelopes(user_id);
CREATE INDEX IF NOT EXISTS envelopes_team_id_idx ON envelopes(team_id);
CREATE INDEX IF NOT EXISTS envelopes_status_idx ON envelopes(status);

CREATE TABLE IF NOT EXISTS envelope_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS envelope_documents_envelope_id_idx ON envelope_documents(envelope_id);

CREATE TABLE IF NOT EXISTS envelope_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  routing_order INTEGER DEFAULT 1 NOT NULL,
  action TEXT DEFAULT 'needs_to_sign' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  signing_token TEXT UNIQUE NOT NULL,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMP,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  declined_at TIMESTAMP,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS envelope_recipients_envelope_id_idx ON envelope_recipients(envelope_id);
CREATE INDEX IF NOT EXISTS envelope_recipients_signing_token_idx ON envelope_recipients(signing_token);
CREATE INDEX IF NOT EXISTS envelope_recipients_email_idx ON envelope_recipients(email);

CREATE TABLE IF NOT EXISTS envelope_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_document_id UUID NOT NULL REFERENCES envelope_documents(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES envelope_recipients(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  page INTEGER DEFAULT 1,
  x_position DOUBLE PRECISION NOT NULL,
  y_position DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  required BOOLEAN DEFAULT TRUE NOT NULL,
  value TEXT,
  label TEXT,
  placeholder TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS envelope_fields_envelope_document_id_idx ON envelope_fields(envelope_document_id);
CREATE INDEX IF NOT EXISTS envelope_fields_recipient_id_idx ON envelope_fields(recipient_id);

-- Step 2: Add new columns to existing tables (if not exist)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS roles JSONB;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS envelope_id UUID REFERENCES envelopes(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS envelope_recipient_id UUID REFERENCES envelope_recipients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audit_logs_envelope_id_idx ON audit_logs(envelope_id);

-- Step 3: Migrate documents → envelopes (preserve IDs for compatibility)
INSERT INTO envelopes (
  id, user_id, team_id, name, status,
  created_at, updated_at, sent_at, completed_at,
  email_message
)
SELECT
  d.id,
  d.user_id,
  d.team_id,
  d.title,
  d.status,
  d.created_at,
  d.updated_at,
  CASE WHEN d.status IN ('sent', 'in_progress', 'completed') THEN d.created_at ELSE NULL END,
  d.completed_at,
  d.custom_message
FROM documents d
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create envelope_documents links (each document becomes a document in its envelope)
INSERT INTO envelope_documents (
  envelope_id,
  file_url,
  file_name,
  order_index,
  created_at
)
SELECT
  d.id,  -- envelope_id = document_id (one-to-one mapping)
  d.file_url,
  d.file_name,
  0,  -- first/only document in envelope
  d.created_at
FROM documents d
ON CONFLICT DO NOTHING;

-- Step 5: Migrate recipients → envelope_recipients
INSERT INTO envelope_recipients (
  id,
  envelope_id,
  name,
  email,
  routing_order,
  status,
  signing_token,
  consent_given,
  consent_timestamp,
  completed_at,
  ip_address,
  created_at
)
SELECT
  r.id,
  r.document_id,  -- document_id becomes envelope_id
  r.name,
  r.email,
  COALESCE(r.order_index + 1, 1),  -- order_index 0→1, 1→2, etc. (routing order starts at 1)
  CASE
    WHEN r.status = 'signed' THEN 'completed'
    WHEN r.status = 'pending' THEN 'pending'
    WHEN r.status = 'sent' THEN 'sent'
    ELSE 'pending'
  END,
  r.signing_token,
  r.consent_given,
  r.consent_timestamp,
  r.signed_at,  -- signed_at becomes completed_at
  r.ip_address,
  r.created_at
FROM recipients r
ON CONFLICT (id) DO NOTHING;

-- Step 6: Migrate document_fields → envelope_fields
-- First get the envelope_document_id for each document
WITH doc_mapping AS (
  SELECT
    d.id as document_id,
    ed.id as envelope_document_id
  FROM documents d
  JOIN envelope_documents ed ON ed.envelope_id = d.id
)
INSERT INTO envelope_fields (
  id,
  envelope_document_id,
  recipient_id,
  type,
  page,
  x_position,
  y_position,
  width,
  height,
  required,
  value,
  created_at
)
SELECT
  df.id,
  dm.envelope_document_id,
  df.recipient_id,
  df.type,
  df.page,
  df.x_position,
  df.y_position,
  df.width,
  df.height,
  df.required,
  df.value,
  df.created_at
FROM document_fields df
JOIN doc_mapping dm ON dm.document_id = df.document_id
ON CONFLICT (id) DO NOTHING;

-- Step 7: Verify migration success
DO $$
DECLARE
  env_count INT;
  env_doc_count INT;
  env_rec_count INT;
  env_field_count INT;
  doc_count INT;
  rec_count INT;
  field_count INT;
  sig_count INT;
  env_sig_count INT;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO env_count FROM envelopes;
  SELECT COUNT(*) INTO env_doc_count FROM envelope_documents;
  SELECT COUNT(*) INTO env_rec_count FROM envelope_recipients;
  SELECT COUNT(*) INTO env_field_count FROM envelope_fields;
  SELECT COUNT(*) INTO doc_count FROM documents;
  SELECT COUNT(*) INTO rec_count FROM recipients;
  SELECT COUNT(*) INTO field_count FROM document_fields;
  SELECT COUNT(*) INTO sig_count FROM document_fields WHERE value IS NOT NULL AND value != '';
  SELECT COUNT(*) INTO env_sig_count FROM envelope_fields WHERE value IS NOT NULL AND value != '';

  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Envelopes created: % (expected: %)', env_count, doc_count;
  RAISE NOTICE 'Envelope documents created: % (expected: %)', env_doc_count, doc_count;
  RAISE NOTICE 'Envelope recipients created: % (expected: %)', env_rec_count, rec_count;
  RAISE NOTICE 'Envelope fields created: % (expected: %)', env_field_count, field_count;
  RAISE NOTICE 'Signatures preserved: % (expected: %)', env_sig_count, sig_count;
  RAISE NOTICE '';

  -- Fail if counts don't match
  IF env_count != doc_count THEN
    RAISE EXCEPTION 'Envelope count mismatch! Expected %, got %', doc_count, env_count;
  END IF;

  IF env_rec_count != rec_count THEN
    RAISE EXCEPTION 'Recipient count mismatch! Expected %, got %', rec_count, env_rec_count;
  END IF;

  IF env_field_count != field_count THEN
    RAISE EXCEPTION 'Field count mismatch! Expected %, got %', field_count, env_field_count;
  END IF;

  IF env_sig_count != sig_count THEN
    RAISE EXCEPTION 'Signature count mismatch! Expected %, got %', sig_count, env_sig_count;
  END IF;

  RAISE NOTICE '✓ All verification checks passed!';
  RAISE NOTICE '';
END $$;

-- Success!
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Old tables (documents, recipients, document_fields) are PRESERVED';
  RAISE NOTICE 'New envelope tables created and populated';
  RAISE NOTICE 'All data verified and intact';
  RAISE NOTICE '';
  RAISE NOTICE 'You can safely deploy the new code now.';
  RAISE NOTICE 'Old tables can be dropped after 2-4 weeks of successful operation.';
  RAISE NOTICE '';
END $$;

COMMIT;
