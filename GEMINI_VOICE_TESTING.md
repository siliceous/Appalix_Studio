# Gemini Voice Integration — Quick Testing Guide

## Pre-Test Setup

```bash
# 1. Run database migration
npx supabase push

# 2. Verify gemini_voices data exists
npx supabase query "SELECT COUNT(*) FROM gemini_voices;"

# 3. Start API server
npm run dev

# 4. Start dashboard
npm run dev (in separate terminal)
```

## Test 1: API Endpoints

### 1.1 Get All Gemini Voices

```bash
curl -X GET http://localhost:3000/api/gemini-voice/voices/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:** 
- Status 200
- Response includes `voices` array with 47+ items
- Each voice has: id, voice_name, language_code, ssml_gender

### 1.2 Get Available Languages

```bash
curl -X GET http://localhost:3000/api/gemini-voice/languages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
- Status 200
- Languages array: ["en-US", "es-ES", "fr-FR", "de-DE", ...]

### 1.3 Get Voices by Language

```bash
curl -X GET "http://localhost:3000/api/gemini-voice/voices/language/en-US?workspaceId=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
- Status 200
- Voices array filtered to en-US only

## Test 2: UI Integration

### 2.1 Voice Selector Loading

1. Open browser → http://localhost:3000/dashboard/studio
2. Switch to Talking Actors mode
3. **Scroll down** to Composer section
4. Look for "Voice" dropdown
5. Check browser console (F12 → Console tab)

**Expected:**
- Dropdown shows "Voice (loading...)" briefly
- After ~1 second, "loading..." disappears
- Dropdown contains 57 voices total:
  - Built-in section: ~10 voices (male/female/neutral)
  - Gemini section: ~47 voices
- Default selected voice is first in list

**Troubleshoot if failing:**
```javascript
// In browser console:
fetch('/api/gemini-voice/voices/all')
  .then(r => r.json())
  .then(d => console.log(d.voices.length, 'voices loaded'))
  .catch(e => console.error('Error:', e))
```

### 2.2 Voice Selection

1. Click Voice dropdown
2. Scroll down to "Gemini Voices" section
3. Select any voice (e.g., "en-US-Neural2-A - en-US")
4. Confirm selection updates dropdown display

**Expected:**
- Selected voice shows in dropdown
- Selected voice details stored in state
- Selecting different voices updates instantly

### 2.3 Generation with Selected Voice

1. Fill in script (e.g., "Hello world")
2. Select actor, background, emotion, etc.
3. Select a **Gemini voice** from dropdown
4. Click "Generate Video"

**Expected:**
- Request sent with selected voice ID
- Video generation starts (status = "generating")
- Video appears in gallery after 3-5 seconds
- Console shows no errors

## Test 3: Database Verification

```bash
# Check talking_actor_voice_links table exists
npx supabase query "SELECT * FROM talking_actor_voice_links LIMIT 5;"

# If empty, that's OK — table will populate when users link voices

# Check RLS policies are enabled
npx supabase query "\d talking_actor_voice_links;" # PostgreSQL

# Verify view exists
npx supabase query "SELECT * FROM actor_voice_combinations LIMIT 5;"
```

## Test 4: Voice-Actor Linking (Advanced)

### 4.1 Link a Voice to an Actor

```bash
curl -X POST "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/VOICE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "YOUR_WORKSPACE_ID",
    "lipSyncStrength": 0.8
  }'
```

**Expected:**
- Status 200
- Response includes link object with lip_sync_strength: 0.8

### 4.2 Get Voices for Actor

```bash
curl -X GET "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
- Status 200
- Array of voices linked to this actor

### 4.3 Update Lip-Sync Strength

```bash
curl -X PATCH "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/VOICE_ID/lip-sync" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lipSyncStrength": 0.9
  }'
```

**Expected:**
- Status 200
- Message: "Lip-sync strength updated"

### 4.4 Unlink Voice from Actor

```bash
curl -X DELETE "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/VOICE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
- Status 200
- Message: "Voice unlinked from actor"

## Test 5: Error Cases

### 5.1 Missing Workspace ID

```bash
curl -X POST "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/VOICE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lipSyncStrength": 0.8}'
```

**Expected:**
- Status 400
- Error: "workspaceId is required"

### 5.2 Invalid Lip-Sync Strength

```bash
curl -X PATCH "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/VOICE_ID/lip-sync" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lipSyncStrength": 1.5}'
```

**Expected:**
- Status 400
- Error: "lipSyncStrength must be a number between 0 and 1"

### 5.3 Non-existent Voice

```bash
curl -X GET "http://localhost:3000/api/gemini-voice/actors/ACTOR_ID/voices/BAD_VOICE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**
- Status 500 or 404 (depending on implementation)
- Error message

## Test 6: Performance

### 6.1 Voice List Loading Time

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh `/dashboard/studio`
4. Filter requests to `/gemini-voice`
5. Find GET `/voices/all` request

**Expected:**
- Request completes in < 500ms
- Response size < 50KB
- No 5xx errors

### 6.2 Voice Dropdown Render Time

1. Open DevTools → Performance tab
2. Click on Voice dropdown
3. Stop recording after dropdown appears

**Expected:**
- Dropdown renders in < 200ms
- No layout shifts
- Smooth scrolling through 57 voices

## Test 7: Workspace Isolation (RLS)

This tests that users from different workspaces can't see each other's data.

**Setup:** Create 2 test workspaces/users

```bash
# User 1 (workspace A)
curl -X POST "http://localhost:3000/api/gemini-voice/actors/ACTOR_A/voices/VOICE_A" \
  -H "Authorization: Bearer TOKEN_USER_1" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "WORKSPACE_A", "lipSyncStrength": 0.8}'

# User 2 (workspace B) tries to see User 1's link
curl -X GET "http://localhost:3000/api/gemini-voice/actors/ACTOR_A/voices" \
  -H "Authorization: Bearer TOKEN_USER_2"
```

**Expected:**
- User 2 sees empty array (RLS hides User 1's data)
- No 403 error (silent denial)

## Checklist

- [ ] Migration 00185 applied successfully
- [ ] API endpoints return 200 with correct data
- [ ] Voice selector loads in UI (no errors in console)
- [ ] 57 voices display (10 built-in + 47 Gemini)
- [ ] Selecting a voice updates state
- [ ] Generating video with Gemini voice works
- [ ] Voice-actor linking API works
- [ ] Lip-sync strength updates work
- [ ] Error cases handled gracefully
- [ ] Voice list loads in < 500ms
- [ ] RLS policies enforce workspace isolation

## Debugging

**If voices not loading:**
1. Check gemini_voices table has data: `SELECT COUNT(*) FROM gemini_voices;`
2. Check API returns data: `curl http://localhost:3000/api/gemini-voice/voices/all`
3. Check browser console for fetch errors
4. Verify JWT token is valid and includes workspace access

**If dropdown doesn't update:**
1. Check `voices` state in React DevTools
2. Verify `useEffect` hook is running (add console.log)
3. Check for TypeScript errors: `npm run type-check`

**If RLS denies access:**
1. Verify workspace_members table has correct user → workspace mapping
2. Check RLS policy: `npx supabase query "SELECT * FROM pg_policies WHERE tablename = 'talking_actor_voice_links';"`
3. Test with service role key first, then user key

## Next Steps After Testing

1. ✅ Confirm all 8 API endpoints work
2. ✅ Confirm voice selector loads voices
3. ✅ Verify generation flow includes selected voice
4. Next: Hook up actual speech synthesis (currently stubbed)
5. Next: Test end-to-end video generation with lip-sync
6. Next: Performance optimization if needed
