-- ==========================================
-- DATA MIGRATION: Documents → Envelopes
-- ==========================================
-- This script migrates existing document-based data to the new DocuSign-style envelope system
--
-- CRITICAL: This preserves ALL existing data:
-- - PDFs remain in same storage location (only DB pointers updated)
-- - All signature data preserved (base64 values copied exactly)
-- - All timestamps preserved
-- - All audit trail preserved
--
-- SAFETY: All old tables are renamed to *_backup (not dropped)
-- ROLLBACK: If needed, rename *_backup tables back to original names
--
-- ==========================================

BEGIN;

-- ==========================================
-- STEP 1: PRE-MIGRATION VERIFICATION
-- ==========================================
-- Count existing records for verification
DO $$
DECLARE
  doc_count INTEGER;
  recipient_count INTEGER;
  field_count INTEGER;
  audit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM documents;
  SELECT COUNT(*) INTO recipient_count FROM recipients;
  SELECT COUNT(*) INTO field_count FROM document_fields;
  SELECT COUNT(*) INTO audit_count FROM audit_logs;

  RAISE NOTICE '=== PRE-MIGRATION COUNTS ===';
  RAISE NOTICE 'Documents: %', doc_count;
  RAISE NOTICE 'Recipients: %', recipient_count;
  RAISE NOTICE 'Document Fields: %', field_count;
  RAISE NOTICE 'Audit Logs: %', audit_count;
END $$;

-- ==========================================
-- STEP 2: MIGRATE DOCUMENTS → ENVELOPES
-- ==========================================
-- Create one envelope per existing document
INSERT INTO envelopes (
  id,
  user_id,
  team_id,
  template_id,
  name,
  status,
  current_routing_order,
  email_subject,
  email_message,
  expires_at,
  reminder_enabled,
  reminder_delay,
  reminder_frequency,
  completed_at,
  voided_at,
  void_reason,
  created_at,
  updated_at
)
SELECT
  d.id,                                      -- Same ID for easy tracking
  d.user_id,
  d.team_id,
  NULL,                                      -- No template (direct sends)
  d.title,                                   -- Renamed from "title" to "name"
  d.status,
  1,                                         -- Default routing order
  NULL,                                      -- No custom email subject (used default)
  d.custom_message,                          -- Map custom message to email message
  d.expires_at,
  true,                                      -- Default reminders enabled
  3,                                         -- Default 3-day delay
  3,                                         -- Default 3-day frequency
  d.completed_at,
  NULL,                                      -- No voided envelopes yet
  NULL,
  d.created_at,
  d.updated_at
FROM documents d;

-- ==========================================
-- STEP 3: MIGRATE DOCUMENTS → ENVELOPE_DOCUMENTS
-- ==========================================
-- Create one envelope_document per existing document
-- CRITICAL: fileUrl stays EXACTLY the same - no files are moved!
INSERT INTO envelope_documents (
  id,
  envelope_id,
  file_url,
  file_name,
  file_size,
  page_count,
  document_hash,
  order_index,
  created_at
)
SELECT
  gen_random_uuid(),                         -- New ID for envelope_document
  d.id,                                      -- References envelope (same ID as old document)
  d.file_url,                                -- SAME PATH - files not moved!
  d.file_name,
  d.file_size,
  d.page_count,
  d.document_hash,
  1,                                         -- First (and only) document in envelope
  d.created_at
FROM documents d;

-- ==========================================
-- STEP 4: MIGRATE RECIPIENTS → ENVELOPE_RECIPIENTS
-- ==========================================
-- Map old recipients to new envelope recipients with routing order
INSERT INTO envelope_recipients (
  id,
  envelope_id,
  email,
  name,
  role_name,
  routing_order,
  action,
  status,
  signing_token,
  sent_at,
  viewed_at,
  completed_at,
  declined_at,
  decline_reason,
  consent_given,
  consent_timestamp,
  consent_ip_address,
  ip_address,
  user_agent,
  created_at
)
SELECT
  r.id,                                      -- Same ID for easy mapping
  r.document_id,                             -- Maps to envelope (same ID)
  r.email,
  r.name,
  NULL,                                      -- No role (not from template)
  r.order_index + 1,                         -- Convert 0-based to 1-based routing order
  'needs_to_sign',                           -- Default action
  r.status,
  r.signing_token,
  CASE
    WHEN r.status != 'pending' THEN r.created_at  -- If not pending, they were sent
    ELSE NULL
  END,
  r.viewed_at,
  r.signed_at,                               -- Renamed to completed_at
  NULL,                                      -- No declined envelopes yet
  NULL,
  r.consent_given,
  r.consent_timestamp,
  r.consent_ip_address,
  r.ip_address,
  r.user_agent,
  r.created_at
FROM recipients r;

-- ==========================================
-- STEP 5: MIGRATE DOCUMENT_FIELDS → ENVELOPE_FIELDS
-- ==========================================
-- CRITICAL: This preserves all signature data (base64 values)
-- Map fields to specific envelope_document + recipient
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
  df.id,                                     -- Same ID
  ed.id,                                     -- Map to envelope_document
  df.recipient_id,                           -- Same recipient ID
  df.type,
  df.page,
  df.x_position,
  df.y_position,
  df.width,
  df.height,
  df.required,
  df.value,                                  -- CRITICAL: Signature data preserved!
  df.created_at
FROM document_fields df
INNER JOIN documents d ON df.document_id = d.id
INNER JOIN envelope_documents ed ON ed.envelope_id = d.id;

-- ==========================================
-- STEP 6: UPDATE AUDIT_LOGS
-- ==========================================
-- Update audit logs to reference envelope_id instead of document_id
UPDATE audit_logs al
SET
  envelope_id = al.document_id,              -- Same ID (document → envelope)
  envelope_recipient_id = al.recipient_id    -- Same recipient ID
WHERE al.document_id IS NOT NULL;

-- ==========================================
-- STEP 7: POST-MIGRATION VERIFICATION
-- ==========================================
-- Verify all data was migrated correctly
DO $$
DECLARE
  envelope_count INTEGER;
  envelope_doc_count INTEGER;
  envelope_recipient_count INTEGER;
  envelope_field_count INTEGER;
  envelope_audit_count INTEGER;

  orig_doc_count INTEGER;
  orig_recipient_count INTEGER;
  orig_field_count INTEGER;
  orig_audit_count INTEGER;

  signature_count INTEGER;
  orig_signature_count INTEGER;
BEGIN
  -- Get original counts
  SELECT COUNT(*) INTO orig_doc_count FROM documents;
  SELECT COUNT(*) INTO orig_recipient_count FROM recipients;
  SELECT COUNT(*) INTO orig_field_count FROM document_fields;
  SELECT COUNT(*) INTO orig_audit_count FROM audit_logs WHERE document_id IS NOT NULL;
  SELECT COUNT(*) INTO orig_signature_count FROM document_fields WHERE value IS NOT NULL;

  -- Get new counts
  SELECT COUNT(*) INTO envelope_count FROM envelopes;
  SELECT COUNT(*) INTO envelope_doc_count FROM envelope_documents;
  SELECT COUNT(*) INTO envelope_recipient_count FROM envelope_recipients;
  SELECT COUNT(*) INTO envelope_field_count FROM envelope_fields;
  SELECT COUNT(*) INTO envelope_audit_count FROM audit_logs WHERE envelope_id IS NOT NULL;
  SELECT COUNT(*) INTO signature_count FROM envelope_fields WHERE value IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '=== POST-MIGRATION VERIFICATION ===';
  RAISE NOTICE 'Documents → Envelopes: % → % (Match: %)', orig_doc_count, envelope_count, orig_doc_count = envelope_count;
  RAISE NOTICE 'Documents → Envelope Documents: % → % (Match: %)', orig_doc_count, envelope_doc_count, orig_doc_count = envelope_doc_count;
  RAISE NOTICE 'Recipients → Envelope Recipients: % → % (Match: %)', orig_recipient_count, envelope_recipient_count, orig_recipient_count = envelope_recipient_count;
  RAISE NOTICE 'Document Fields → Envelope Fields: % → % (Match: %)', orig_field_count, envelope_field_count, orig_field_count = envelope_field_count;
  RAISE NOTICE 'Audit Logs Updated: % → % (Match: %)', orig_audit_count, envelope_audit_count, orig_audit_count = envelope_audit_count;
  RAISE NOTICE 'Signatures Preserved: % → % (Match: %)', orig_signature_count, signature_count, orig_signature_count = signature_count;

  -- Fail transaction if counts don't match
  IF orig_doc_count != envelope_count OR
     orig_doc_count != envelope_doc_count OR
     orig_recipient_count != envelope_recipient_count OR
     orig_field_count != envelope_field_count OR
     orig_signature_count != signature_count THEN
    RAISE EXCEPTION 'Migration verification failed! Counts do not match. Rolling back...';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All verification checks passed!';
END $$;

-- ==========================================
-- STEP 8: VERIFY SIGNATURE DATA INTEGRITY
-- ==========================================
-- Spot-check that signature data is identical
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM document_fields df
  INNER JOIN envelope_fields ef ON df.id = ef.id
  WHERE COALESCE(df.value, '') != COALESCE(ef.value, '');

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Signature data mismatch detected! % fields have different values. Rolling back...', mismatch_count;
  END IF;

  RAISE NOTICE '✅ Signature data integrity verified (0 mismatches)';
END $$;

-- ==========================================
-- STEP 9: VERIFY FILE URLs UNCHANGED
-- ==========================================
-- Ensure all file URLs are exactly the same
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM documents d
  INNER JOIN envelope_documents ed ON ed.envelope_id = d.id
  WHERE d.file_url != ed.file_url;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'File URL mismatch detected! % documents have different URLs. Rolling back...', mismatch_count;
  END IF;

  RAISE NOTICE '✅ File URLs unchanged (0 mismatches)';
END $$;

-- ==========================================
-- STEP 10: RENAME OLD TABLES TO BACKUP
-- ==========================================
-- Keep old tables for safety (can drop after 2-4 weeks)
ALTER TABLE documents RENAME TO documents_backup;
ALTER TABLE recipients RENAME TO recipients_backup;
ALTER TABLE document_fields RENAME TO document_fields_backup;

-- Remove old foreign key constraints from audit_logs
-- (They now reference envelope_id instead)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_document_id_documents_id_fk;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_recipient_id_recipients_id_fk;

RAISE NOTICE '';
RAISE NOTICE '=== MIGRATION COMPLETE ===';
RAISE NOTICE 'Old tables renamed to *_backup';
RAISE NOTICE 'You can drop backup tables after 2-4 weeks if no issues';
RAISE NOTICE '';
RAISE NOTICE 'ROLLBACK INSTRUCTIONS (if needed):';
RAISE NOTICE '1. ALTER TABLE documents_backup RENAME TO documents;';
RAISE NOTICE '2. ALTER TABLE recipients_backup RENAME TO recipients;';
RAISE NOTICE '3. ALTER TABLE document_fields_backup RENAME TO document_fields;';
RAISE NOTICE '4. DROP TABLE envelopes CASCADE;';

COMMIT;

-- ==========================================
-- POST-MIGRATION QUERIES
-- ==========================================
-- Run these manually to verify migration success

-- Check envelope status distribution
-- SELECT status, COUNT(*) FROM envelopes GROUP BY status;

-- Check routing orders
-- SELECT routing_order, COUNT(*) FROM envelope_recipients GROUP BY routing_order ORDER BY routing_order;

-- Verify all signatures still accessible
-- SELECT COUNT(*) FROM envelope_fields WHERE value IS NOT NULL;

-- Check sample envelope with all related data
-- SELECT
--   e.name,
--   e.status,
--   ed.file_name,
--   er.email,
--   er.routing_order,
--   COUNT(ef.id) as field_count
-- FROM envelopes e
-- LEFT JOIN envelope_documents ed ON ed.envelope_id = e.id
-- LEFT JOIN envelope_recipients er ON er.envelope_id = e.id
-- LEFT JOIN envelope_fields ef ON ef.envelope_document_id = ed.id
-- WHERE e.id = '<some-envelope-id>'
-- GROUP BY e.name, e.status, ed.file_name, er.email, er.routing_order;
