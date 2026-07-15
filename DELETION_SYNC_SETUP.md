# Image Deletion & Cross-Browser Sync Setup

## Overview

The image deletion system has two modes:

1. **Local Mode** (Current - Graceful Fallback): Deletions are tracked in browser localStorage. This works but is not synced across browser tabs or devices.
2. **Server Mode** (Requires Setup): Deletions are synced to the `ai_image_deletions` database table, enabling cross-browser and cross-device synchronization.

## Current Status

- ✅ Frontend deletion UI fully implemented (talking-actors page and ai-studio page)
- ✅ Backend deletion endpoints implemented (`/api/ai-studio/trash-image`, `/restore-image`, `/deleted-images`)
- ✅ Graceful degradation: when the database table doesn't exist, deletions work locally without errors
- ❌ **REQUIRED**: Database table `ai_image_deletions` must be created to enable cross-browser sync

## How to Enable Cross-Browser Sync

### Step 1: Apply the Database Migration

The migration file exists at:
```
supabase/migrations/00196_ai_image_deletions.sql
```

To apply it to your Supabase instance:

```bash
# First, authenticate with Supabase
supabase login

# Link to your project (replace <project-ref> with your project ID, e.g., rudeaapjryxcswvsqida)
supabase link --project-ref <project-ref>

# Apply all pending migrations
supabase migration up

# Or manually run the migration via the Supabase dashboard SQL editor
```

The migration creates:
- `ai_image_deletions` table with workspace_id, image_id, deleted_at, created_at
- Indexes for efficient queries
- RLS policies for workspace isolation

### Step 2: Verify the Table was Created

Run this query in Supabase SQL editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'ai_image_deletions';
```

You should see one row with `ai_image_deletions`.

### Step 3: Test the Feature

1. Open the Talking Actors page in two browser tabs/windows (same workspace)
2. Delete an image in Tab A
3. The image should automatically disappear from Tab B's gallery within a few seconds
4. Restore the image in Tab B
5. It should reappear in Tab A

## How It Works

### Without Server Sync (Current Behavior)
```
User deletes image → Frontend state updated → localStorage updated
                   ✓ User sees change immediately
                   ✗ Other tabs/devices don't see the change
                   ✗ Changes lost on page refresh in other tabs
```

### With Server Sync (After Migration)
```
User deletes image → Frontend state updated → localStorage updated
                   ↓
           POST /api/ai-studio/trash-image
                   ↓
         Insert into ai_image_deletions table
                   ↓
        On other tabs: GET /api/ai-studio/deleted-images periodically
                   ↓
         Load deleted IDs from server, merge with localStorage
                   ↓
         Gallery updates to reflect server state
                   ✓ All tabs/devices see changes in real-time
                   ✓ Changes persist across refreshes
                   ✓ Changes persist across sessions
```

## Files Modified for This Feature

### Backend
- `apps/api/src/routes/ai-studio/deletions.ts` - Deletion endpoints with graceful fallback
- `apps/api/src/lib/init-deletion-table.ts` - Table initialization check on startup

### Frontend  
- `apps/dashboard/src/app/(dashboard)/studio/talking-actors/page.tsx` - Deletion UI and sync logic
- `apps/dashboard/src/app/(dashboard)/ai-studio/page.tsx` - Same deletion UI for main ai-studio page

### Database
- `supabase/migrations/00196_ai_image_deletions.sql` - Migration to create the table

## Troubleshooting

### Deletions aren't syncing across browsers
**Cause**: The `ai_image_deletions` table hasn't been created yet.  
**Fix**: Apply the migration as described in Step 1.

### Server returns "table_not_found" warning
**Status**: This is expected and not an error. The system is working in local mode.  
**Fix**: To enable cross-browser sync, apply the migration.

### Getting RLS errors after migration
**Cause**: RLS policies may not have been correctly applied.  
**Fix**: Run the following in Supabase SQL editor:
```sql
-- Enable RLS on the table
ALTER TABLE ai_image_deletions ENABLE ROW LEVEL SECURITY;

-- Create the policy
DROP POLICY IF EXISTS ai_image_deletions_workspace_access ON ai_image_deletions;
CREATE POLICY ai_image_deletions_workspace_access ON ai_image_deletions
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
```

## Environment Variables Required

The feature works with existing env vars:
- `SUPABASE_URL` - Used by frontend and backend
- `SUPABASE_SERVICE_ROLE_KEY` - Used by backend only (never exposed to frontend)

No additional configuration needed.

## Future Improvements

1. **Real-time Sync via Postgres Notify**: Use Supabase Realtime to push deletion updates instantly across all connected clients instead of polling
2. **Automatic Cleanup**: Implement a scheduled job to delete deletion records older than 30 days
3. **Bulk Operations**: Support deleting/restoring multiple images at once
4. **Audit Trail**: Add user_id to deletion records to track who deleted what
