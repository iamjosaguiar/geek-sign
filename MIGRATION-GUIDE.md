# Migration Guide: Documents → Envelopes (DocuSign-style)

## Overview
This migration transforms the single-document system into a DocuSign-style envelope system that supports:
- Multiple documents per envelope
- Template-based sending with roles
- Sequential and parallel recipient routing
- Bulk send capabilities

## What Changes
### Database
- **NEW Tables**: `envelopes`, `envelope_documents`, `envelope_recipients`, `envelope_fields`
- **Updated Tables**: `templates` (now supports roles), `audit_logs` (references envelopes)
- **Backup Tables**: `documents_backup`, `recipients_backup`, `document_fields_backup`

### Application
- URL structure: `/dashboard/documents` → `/dashboard/envelopes`
- API routes: `/api/documents` → `/api/envelopes`
- Terminology: "Document" → "Envelope" (containing one or more documents)

## Data Preservation Guarantee
✅ **All PDFs stay in the same location** - only database pointers updated
✅ **All signatures preserved** - base64 data copied exactly
✅ **All timestamps preserved** - created, signed, completed dates maintained
✅ **All audit trails preserved** - full history maintained
✅ **Rollback available** - old tables kept as *_backup for 2-4 weeks

## Migration Steps

### Step 1: Backup Database (CRITICAL!)
```bash
# Create full database backup before migration
pg_dump $DATABASE_URL > backup-before-envelope-migration-$(date +%Y%m%d).sql
```

### Step 2: Apply New Schema
```bash
# Push new envelope schema to database
npm run db:push
```

This creates the new envelope tables while keeping existing document tables.

### Step 3: Run Data Migration
```bash
# Execute migration script (uses transactions - will rollback on any error)
psql $DATABASE_URL < migration-to-envelopes.sql
```

The script will:
1. Show pre-migration counts
2. Copy all data from old → new tables
3. Verify counts match exactly
4. Verify signature data integrity
5. Verify file URLs unchanged
6. Rename old tables to *_backup
7. Commit (or rollback if any verification fails)

### Step 4: Verify Migration Success
Run these queries to verify:

```sql
-- Check envelope count matches old document count
SELECT
  (SELECT COUNT(*) FROM envelopes) as envelopes,
  (SELECT COUNT(*) FROM documents_backup) as old_documents;

-- Check all signatures preserved
SELECT
  (SELECT COUNT(*) FROM envelope_fields WHERE value IS NOT NULL) as new_signatures,
  (SELECT COUNT(*) FROM document_fields_backup WHERE value IS NOT NULL) as old_signatures;

-- Sample envelope with all data
SELECT
  e.name,
  e.status,
  ed.file_name,
  er.email,
  er.routing_order,
  COUNT(ef.id) as fields
FROM envelopes e
LEFT JOIN envelope_documents ed ON ed.envelope_id = e.id
LEFT JOIN envelope_recipients er ON er.envelope_id = e.id
LEFT JOIN envelope_fields ef ON ef.envelope_document_id = ed.id
GROUP BY e.name, e.status, ed.file_name, er.email, er.routing_order
LIMIT 5;
```

### Step 5: Deploy Updated Application
```bash
# Build with new code (uses envelope tables)
npm run build

# Deploy to production
# (your normal deployment process)
```

### Step 6: Monitor (2-4 weeks)
- Watch for any issues with envelope/document access
- Verify all signatures still render correctly
- Check audit logs working properly

### Step 7: Clean Up Backup Tables (After 2-4 weeks)
```sql
-- Only run this after confirming everything works!
DROP TABLE documents_backup CASCADE;
DROP TABLE recipients_backup CASCADE;
DROP TABLE document_fields_backup CASCADE;

-- Also remove old documentId columns from audit_logs
ALTER TABLE audit_logs DROP COLUMN document_id;
ALTER TABLE audit_logs DROP COLUMN recipient_id;
```

## Rollback Procedure (If Needed)

If you encounter issues after migration:

### Option A: Rollback Database Only (Keep New Code)
```sql
BEGIN;

-- Restore old tables
ALTER TABLE documents_backup RENAME TO documents;
ALTER TABLE recipients_backup RENAME TO recipients;
ALTER TABLE document_fields_backup RENAME TO document_fields;

-- Re-add foreign key constraints
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_document_id_documents_id_fk
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- Remove new tables
DROP TABLE envelope_fields CASCADE;
DROP TABLE envelope_recipients CASCADE;
DROP TABLE envelope_documents CASCADE;
DROP TABLE envelopes CASCADE;

COMMIT;
```

### Option B: Full Rollback (Database + Code)
```bash
# 1. Rollback database (use Option A above)

# 2. Restore previous git commit
git log  # find commit before envelope migration
git revert <commit-hash>

# 3. Redeploy old version
npm run build
# deploy...
```

## Testing Checklist

After migration, verify:
- [ ] All existing envelopes load correctly
- [ ] PDF previews display properly
- [ ] Signatures render on signed documents
- [ ] Can create new envelopes
- [ ] Can send envelopes to recipients
- [ ] Recipients can sign documents
- [ ] Email notifications work
- [ ] Audit logs show correctly
- [ ] Download completed PDFs works
- [ ] Templates still work
- [ ] Workflows still work

## Support

If you encounter any issues:
1. Check migration script output for error messages
2. Run verification queries (Step 4 above)
3. Check application logs for errors
4. If needed, rollback using procedures above

## Key Files Modified

### Database
- `src/lib/db/schema.ts` - New envelope schema
- `migration-to-envelopes.sql` - Data migration script

### API Routes (Updated in next steps)
- `src/app/api/documents/*` → `src/app/api/envelopes/*`

### Dashboard Pages (Updated in next steps)
- `src/app/(dashboard)/dashboard/documents/*` → `src/app/(dashboard)/dashboard/envelopes/*`

### Components (Updated in next steps)
- All components using document schema updated to use envelopes

## Timeline Estimate
- Schema migration: 1-2 minutes
- Data migration: 2-5 minutes (depends on data volume)
- Code deployment: 5-10 minutes
- Total downtime: ~10-15 minutes (run during low-traffic period)
