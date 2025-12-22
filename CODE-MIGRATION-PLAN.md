# Code Migration Plan: Documents → Envelopes

## Overview
This document outlines all code changes needed to migrate from the document-based system to the envelope-based system. The database schema and migration script are complete. This plan covers updating all API routes, pages, and components.

## Migration Strategy
1. Create new `/api/envelopes/*` routes in parallel with `/api/documents/*`
2. Update dashboard pages to use new envelope schema
3. Update components to work with envelope data structure
4. Add redirects from old URLs to new URLs
5. Test thoroughly
6. Deploy
7. (Optional) Remove old document routes after successful migration

## Completed Work
✅ Database schema (src/lib/db/schema.ts)
✅ Migration SQL script (migration-to-envelopes.sql)
✅ Migration guide (MIGRATION-GUIDE.md)
✅ Core envelope API routes:
  - `/api/envelopes/[id]/route.ts` (GET, PATCH, DELETE)
  - `/api/envelopes/upload/route.ts` (POST)
  - `/api/envelopes/[id]/send/route.ts` (POST with routing order)

## Remaining API Routes to Create

### 1. Recipients Routes

#### `/api/envelopes/[id]/recipients/route.ts`
**Source**: `src/app/api/documents/[id]/recipients/route.ts`

**Changes**:
```typescript
// OLD
import { documents, recipients } from "@/lib/db/schema";
const [document] = await db.select().from(documents)...
const recipientsList = await db.select().from(recipients)
  .where(eq(recipients.documentId, params.id))
  .orderBy(recipients.orderIndex);  // 0-based

// NEW
import { envelopes, envelopeRecipients } from "@/lib/db/schema";
const [envelope] = await db.select().from(envelopes)...
const recipientsList = await db.select().from(envelopeRecipients)
  .where(eq(envelopeRecipients.envelopeId, params.id))
  .orderBy(envelopeRecipients.routingOrder);  // 1-based

// POST - Add recipient
await db.insert(envelopeRecipients).values({
  envelopeId: params.id,
  email,
  name,
  routingOrder: maxRoutingOrder + 1,  // was orderIndex
  action: "needs_to_sign",  // NEW field
  status: "pending",
  signingToken: crypto.randomUUID(),
});
```

#### `/api/envelopes/[id]/recipients/[recipientId]/route.ts`
**Source**: `src/app/api/documents/[id]/recipients/[recipientId]/route.ts`

**Changes**:
```typescript
// OLD
from(recipients).where(
  and(
    eq(recipients.id, params.recipientId),
    eq(recipients.documentId, params.id)
  )
)

// NEW
from(envelopeRecipients).where(
  and(
    eq(envelopeRecipients.id, params.recipientId),
    eq(envelopeRecipients.envelopeId, params.id)
  )
)
```

### 2. Fields Routes

#### `/api/envelopes/[id]/fields/route.ts`
**Source**: `src/app/api/documents/[id]/fields/route.ts`

**Changes**:
```typescript
// OLD
import { documentFields, recipients } from "@/lib/db/schema";
await db.insert(documentFields).values({
  documentId: params.id,
  recipientId,
  type, page, xPosition, yPosition, width, height, required
});

// NEW
import { envelopeFields, envelopeDocuments, envelopeRecipients } from "@/lib/db/schema";

// Get the envelope document (assume first document for now, or pass documentId)
const [envelopeDoc] = await db.select()
  .from(envelopeDocuments)
  .where(eq(envelopeDocuments.envelopeId, params.id))
  .limit(1);

await db.insert(envelopeFields).values({
  envelopeDocumentId: envelopeDoc.id,  // NEW - links to specific document
  recipientId,  // Still references envelopeRecipients
  type, page, xPosition, yPosition, width, height, required
});
```

**Note**: For multi-document envelopes, you'll need to pass `documentId` in the request body to specify which envelope document the field belongs to.

#### `/api/envelopes/[id]/fields/[fieldId]/route.ts`
**Source**: `src/app/api/documents/[id]/fields/[fieldId]/route.ts`

**Changes**:
```typescript
// OLD
from(documentFields).where(eq(documentFields.id, params.fieldId))

// NEW
from(envelopeFields).where(eq(envelopeFields.id, params.fieldId))
```

### 3. Utility Routes

#### `/api/envelopes/count/route.ts`
**Source**: `src/app/api/documents/count/route.ts`

**Changes**:
```typescript
// OLD
const total = await db.select({ count: count() })
  .from(documents)
  .where(eq(documents.userId, session.user.id));

const completed = await db.select({ count: count() })
  .from(documents)
  .where(and(
    eq(documents.userId, session.user.id),
    eq(documents.status, 'completed')
  ));

// NEW
const total = await db.select({ count: count() })
  .from(envelopes)
  .where(eq(envelopes.userId, session.user.id));

const completed = await db.select({ count: count() })
  .from(envelopes)
  .where(and(
    eq(envelopes.userId, session.user.id),
    eq(envelopes.status, 'completed')
  ));
```

#### `/api/envelopes/[id]/download/route.ts`
**Source**: `src/app/api/documents/[id]/download/route.ts`

**Changes**:
```typescript
// OLD - Single document
const [document] = await db.select().from(documents)...
const fileResponse = await fetch(document.fileUrl);

// NEW - Multiple documents in envelope
const [envelope] = await db.select().from(envelopes)...
const documents = await db.select()
  .from(envelopeDocuments)
  .where(eq(envelopeDocuments.envelopeId, params.id))
  .orderBy(envelopeDocuments.orderIndex);

const fields = await db.select()
  .from(envelopeFields)
  .where(/* join with envelope documents */);

// If single document, return PDF with signatures
// If multiple documents, return ZIP file with all PDFs
if (documents.length === 1) {
  // Return single PDF
} else {
  // Create ZIP file with all documents
}
```

#### `/api/envelopes/[id]/resend/route.ts`
**Source**: `src/app/api/documents/[id]/resend/route.ts`

**Changes**:
```typescript
// OLD
const documentRecipients = await db.select()
  .from(recipients)
  .where(and(
    eq(recipients.documentId, params.id),
    eq(recipients.status, 'pending')
  ));

// NEW - Respect routing order
const [envelope] = await db.select().from(envelopes)...

// Only resend to recipients at current routing order who haven't completed
const recipientsToResend = await db.select()
  .from(envelopeRecipients)
  .where(and(
    eq(envelopeRecipients.envelopeId, params.id),
    eq(envelopeRecipients.routingOrder, envelope.currentRoutingOrder),
    eq(envelopeRecipients.status, 'sent')  // or 'viewed' but not 'completed'
  ));
```

## Dashboard Pages to Update

### 1. Main Envelopes List Page

#### `/app/(dashboard)/dashboard/envelopes/page.tsx`
**Source**: `src/app/(dashboard)/dashboard/documents/page.tsx`

**Changes**:
```typescript
// OLD
import { documents, recipients } from "@/lib/db/schema";

const userDocuments = await db.select({
  id: documents.id,
  title: documents.title,
  status: documents.status,
  createdAt: documents.createdAt,
  recipientCount: count(recipients.id),
}).from(documents)
  .leftJoin(recipients, eq(recipients.documentId, documents.id))
  .where(eq(documents.userId, session.user.id))
  .groupBy(documents.id);

// NEW
import { envelopes, envelopeRecipients } from "@/lib/db/schema";

const userEnvelopes = await db.select({
  id: envelopes.id,
  name: envelopes.name,  // was 'title'
  status: envelopes.status,
  createdAt: envelopes.createdAt,
  recipientCount: count(envelopeRecipients.id),
  documentCount: count(envelopeDocuments.id),  // NEW - show # of docs
}).from(envelopes)
  .leftJoin(envelopeRecipients, eq(envelopeRecipients.envelopeId, envelopes.id))
  .leftJoin(envelopeDocuments, eq(envelopeDocuments.envelopeId, envelopes.id))
  .where(eq(envelopes.userId, session.user.id))
  .groupBy(envelopes.id);
```

**UI Changes**:
- Update links: `/dashboard/documents/${id}` → `/dashboard/envelopes/${id}`
- Update button: "New Document" → "New Envelope"
- Display document count per envelope (e.g., "3 documents, 5 recipients")
- Update column headers: "Document" → "Envelope"

### 2. Envelope Details Page

#### `/app/(dashboard)/dashboard/envelopes/[id]/page.tsx`
**Source**: `src/app/(dashboard)/dashboard/documents/[id]/page.tsx`

**Key Changes**:
```typescript
// Fetch envelope with all related data
const [envelope] = await db.select()
  .from(envelopes)
  .where(and(
    eq(envelopes.id, params.id),
    eq(envelopes.userId, session.user.id)
  ));

const documents = await db.select()
  .from(envelopeDocuments)
  .where(eq(envelopeDocuments.envelopeId, params.id))
  .orderBy(envelopeDocuments.orderIndex);

const recipients = await db.select()
  .from(envelopeRecipients)
  .where(eq(envelopeRecipients.envelopeId, params.id))
  .orderBy(envelopeRecipients.routingOrder);

const fields = await db.select()
  .from(envelopeFields)
  .where(/* join with envelope documents */);
```

**UI Changes**:
- Show multiple documents (tabs or list)
- Show routing order badges on recipients (1, 2, 3...)
- Update status badges to include "sent" and "in_progress"
- Update all links to use `/envelopes/` instead of `/documents/`
- Update component imports

### 3. Envelope Edit Page

#### `/app/(dashboard)/dashboard/envelopes/[id]/edit/page.tsx`
**Source**: `src/app/(dashboard)/dashboard/documents/[id]/edit/page.tsx`

**Key Changes**:
- Support multiple documents per envelope
- Show routing order input for recipients (instead of orderIndex)
- Allow adding multiple PDFs
- Update API calls to `/api/envelopes/` endpoints
- Handle envelope name instead of document title

## Components to Update

### 1. Document Preview Component

#### `/components/pdf/document-preview.tsx`
**No major changes** - still renders single PDF, just receives different props

### 2. Signed Document Preview Component

#### `/components/pdf/signed-document-preview.tsx`
**Changes**:
```typescript
// Props update
interface SignedDocumentPreviewProps {
  fileUrl: string;
  fields: Array<{
    id: string;
    type: string;
    page: number;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
    value: string | null;
    recipientId: string;
    envelopeDocumentId: string;  // NEW - instead of documentId
  }>;
}
```

### 3. Send Document Component

#### `/components/documents/send-document-with-workflow.tsx`
**Rename to**: `/components/envelopes/send-envelope-with-workflow.tsx`

**Changes**:
- Update API endpoint: `/api/documents/${id}/send` → `/api/envelopes/${id}/send`
- Update props: `documentId` → `envelopeId`, `documentTitle` → `envelopeName`
- Update success messages to mention "envelope" instead of "document"

### 4. Delete Document Component

#### `/components/documents/delete-document-button.tsx`
**Rename to**: `/components/envelopes/delete-envelope-button.tsx`

**Changes**:
- Update API endpoint and terminology

### 5. Download Button Component

#### `/components/documents/download-button.tsx`
**Rename to**: `/components/envelopes/download-button.tsx`

**Changes**:
- Handle multiple documents (ZIP download if > 1 document)
- Update API endpoint

### 6. Resend Emails Component

#### `/components/documents/resend-emails-button.tsx`
**Rename to**: `/components/envelopes/resend-emails-button.tsx`

**Changes**:
- Update to only resend to current routing order
- Update API endpoint

## Sign Page (Public-facing)

### `/app/sign/[token]/page.tsx`
**Changes needed**:
```typescript
// OLD
const [recipient] = await db.select()
  .from(recipients)
  .where(eq(recipients.signingToken, params.token));

const [document] = await db.select()
  .from(documents)
  .where(eq(documents.id, recipient.documentId));

const fields = await db.select()
  .from(documentFields)
  .where(and(
    eq(documentFields.documentId, recipient.documentId),
    eq(documentFields.recipientId, recipient.id)
  ));

// NEW
const [recipient] = await db.select()
  .from(envelopeRecipients)
  .where(eq(envelopeRecipients.signingToken, params.token));

const [envelope] = await db.select()
  .from(envelopes)
  .where(eq(envelopes.id, recipient.envelopeId));

const documents = await db.select()
  .from(envelopeDocuments)
  .where(eq(envelopeDocuments.envelopeId, recipient.envelopeId))
  .orderBy(envelopeDocuments.orderIndex);

const fields = await db.select()
  .from(envelopeFields)
  .where(eq(envelopeFields.recipientId, recipient.id));
```

**UI Changes**:
- Support viewing multiple documents
- Show progress: "Document 1 of 3"
- Update to handle envelope terminology

## Automatic Routing Logic

### New Feature: Auto-send to Next Routing Order

Create `/lib/envelope-routing.ts`:
```typescript
import { db } from "@/lib/db";
import { envelopes, envelopeRecipients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSignerInviteEmail } from "@/lib/email";

/**
 * Checks if all recipients at current routing order have completed.
 * If so, sends notifications to next routing order recipients.
 */
export async function advanceEnvelopeRouting(envelopeId: string) {
  const [envelope] = await db.select()
    .from(envelopes)
    .where(eq(envelopes.id, envelopeId));

  if (!envelope || envelope.status === "completed") {
    return;
  }

  // Get all recipients at current routing order
  const currentRecipients = await db.select()
    .from(envelopeRecipients)
    .where(and(
      eq(envelopeRecipients.envelopeId, envelopeId),
      eq(envelopeRecipients.routingOrder, envelope.currentRoutingOrder)
    ));

  // Check if all have completed
  const allCompleted = currentRecipients.every(r => r.status === "completed");

  if (!allCompleted) {
    return; // Wait for all at current order to complete
  }

  // Find next routing order
  const allRecipients = await db.select()
    .from(envelopeRecipients)
    .where(eq(envelopeRecipients.envelopeId, envelopeId))
    .orderBy(envelopeRecipients.routingOrder);

  const nextRoutingOrder = allRecipients.find(
    r => r.routingOrder > envelope.currentRoutingOrder
  )?.routingOrder;

  if (!nextRoutingOrder) {
    // All routing orders complete - mark envelope as completed
    await db.update(envelopes)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(envelopes.id, envelopeId));
    return;
  }

  // Send notifications to next routing order
  const nextRecipients = allRecipients.filter(
    r => r.routingOrder === nextRoutingOrder
  );

  await Promise.all([
    // Update envelope
    db.update(envelopes)
      .set({
        currentRoutingOrder: nextRoutingOrder,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(envelopes.id, envelopeId)),

    // Update recipients
    ...nextRecipients.map(r =>
      db.update(envelopeRecipients)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(envelopeRecipients.id, r.id))
    ),

    // Send emails
    ...nextRecipients.map(r =>
      sendSignerInviteEmail({
        signerEmail: r.email,
        signerName: r.name,
        senderName: "...", // get from user
        documentTitle: envelope.name,
        signUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign/${r.signingToken}`,
        message: envelope.emailMessage,
      })
    ),
  ]);
}
```

**Call this function** in `/app/api/sign/complete/route.ts` after a recipient completes signing.

## URL Redirects

### Add to `/middleware.ts` or create redirect component:
```typescript
// Redirect old document URLs to new envelope URLs
const redirects = {
  '/dashboard/documents': '/dashboard/envelopes',
  '/dashboard/documents/:id': '/dashboard/envelopes/:id',
  '/dashboard/documents/:id/edit': '/dashboard/envelopes/:id/edit',
  '/api/documents': '/api/envelopes',
  // ... all document routes
};
```

## Testing Checklist

- [ ] Upload new envelope with single PDF
- [ ] Upload envelope with multiple PDFs
- [ ] Add recipients with different routing orders
- [ ] Add fields to documents
- [ ] Send envelope (verify only routing order 1 gets notified)
- [ ] Sign as first recipient
- [ ] Verify second routing order gets notified automatically
- [ ] Complete all signatures
- [ ] Download completed envelope (single PDF)
- [ ] Download completed envelope with multiple docs (ZIP)
- [ ] Test resend emails
- [ ] Test delete envelope
- [ ] Verify all old document URLs redirect to envelope URLs
- [ ] Verify audit logs work correctly
- [ ] Test template with roles
- [ ] Test bulk send (future feature)

## Deployment Steps

1. Complete all code updates above
2. Run build: `npm run build`
3. Fix any TypeScript errors
4. Test locally
5. Backup production database
6. Deploy code (with new envelope tables)
7. Run migration script on production database
8. Monitor for issues
9. After 2-4 weeks, remove old document routes and backup tables

## Estimated Time

- API Routes: 4-6 hours
- Dashboard Pages: 3-4 hours
- Components: 2-3 hours
- Routing Logic: 1-2 hours
- Testing: 2-3 hours
- **Total: 12-18 hours** of development time

## Next Steps

Choose one:

**Option A**: Continue with full migration now
- I can systematically create all remaining API routes
- Update all dashboard pages
- Update all components
- Complete the entire migration in this session

**Option B**: Incremental approach
- You review the completed routes and migration plan
- I continue with specific parts you prioritize
- We test incrementally

**Option C**: You take over
- Use this plan as a guide
- Follow the patterns in completed routes
- I'm available for specific questions

Which approach would you prefer?
