# Leonardo API Integration - Final Checklist ✅

## Status: READY TO TEST

### ✅ Completed Tasks

- [x] **Database Migration** — `ai_image_generations` table created with UUID support
  - Location: `supabase/migrations/00190_ai_image_generations.sql`
  - Status: Applied to production database
  - Includes: RLS policies, indexes, audit fields

- [x] **Leonardo API Adapter** — Complete API client
  - Location: `apps/api/src/adapters/leonardo.ts`
  - Features: Generation, status polling, aspect ratio handling
  - Error handling: Full error messages and logging

- [x] **Backend Routes** — Image generation endpoints
  - Location: `apps/api/src/routes/ai-studio/images.ts`
  - Endpoints:
    - `POST /api/ai-studio/generate/image` — Start generation
    - `GET /api/ai-studio/generations/:id` — Get status & results
  - Security: Workspace isolation, RLS enforcement

- [x] **Configuration** — Environment variable support
  - Location: `apps/api/src/config.ts`
  - Variable: `LEONARDO_API_KEY`
  - Status: Optional (warns if not set, fails gracefully)

- [x] **Frontend Integration** — Real API calls
  - Location: `apps/dashboard/src/lib/api/ai-studio.ts`
  - Updated: `generateImage()` and `getGenerationStatus()` functions
  - Features: Automatic polling, error handling, workspace context

- [x] **Route Registration** — API server configured
  - Location: `apps/api/src/index.ts`
  - Added: Image routes to the Fastify server

---

## Next Steps: Get Your API Key

### 1. Sign Up / Log In to Leonardo.AI
```
https://leonardo.ai
```

### 2. Get Your API Key
- Go to **Account Settings** (top right)
- Click **API Keys** or **Integrations**
- Copy your API key (looks like: `auth_XXXXXXXXXX...`)

### 3. Add to `.env`
```bash
# In /Users/manojkapoor/Saas-Project/Programs/Appalix/saas-platform/.env
LEONARDO_API_KEY=your_key_here
```

### 4. Restart Dev Server
```bash
npm run dev
```

### 5. Test It!
1. Open `http://localhost:3000`
2. Log in
3. Go to **AI Studio** (left sidebar)
4. Click **Create Image**
5. Enter prompt: *"A beautiful sunset over the ocean"*
6. Click **Generate**
7. Watch the real-time status updates
8. Download the generated image when complete

---

## System Architecture

```
User Interface (Create Image Page)
        ↓
Frontend API Service (lib/api/ai-studio.ts)
        ↓
POST /api/ai-studio/generate/image (Node.js/Fastify)
        ↓
Leonardo API Adapter (adapters/leonardo.ts)
        ↓
Leonardo.AI REST API
        ↓
Returns: generationId
        ↓
Database: Store in ai_image_generations table
        ↓
User polls: GET /api/ai-studio/generations/:id
        ↓
Frontend checks status every 2 seconds
        ↓
Complete → Download image from Leonardo CDN
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/adapters/leonardo.ts` | Leonardo API client (no key exposure) |
| `apps/api/src/routes/ai-studio/images.ts` | Backend endpoints |
| `apps/api/src/config.ts` | Config with LEONARDO_API_KEY |
| `apps/dashboard/src/lib/api/ai-studio.ts` | Frontend calls |
| `supabase/migrations/00190_ai_image_generations.sql` | Database schema |
| `apps/api/src/index.ts` | Route registration |

---

## API Endpoints

### Generate Image
```bash
POST /api/ai-studio/generate/image
Header: x-workspace-id: <uuid>
Body:
{
  "prompt": "A serene mountain landscape",
  "style": "Photorealistic",
  "aspectRatio": "16:9",
  "model": "Leonardo Image",
  "quantity": 1,
  "negativePrompt": "blurry, low quality"
}

Response:
{
  "id": "uuid",
  "status": "processing",
  "outputUrl": "",
  "type": "image",
  "estimatedCredits": 10
}
```

### Check Status
```bash
GET /api/ai-studio/generations/:id
Header: x-workspace-id: <uuid>

Response:
{
  "id": "uuid",
  "status": "completed",  // or "processing", "failed"
  "outputUrl": "https://cdn.leonardo.ai/...",
  "type": "image",
  "estimatedCredits": 10
}
```

---

## Database Schema

Table: `ai_image_generations`

```sql
- id: UUID (auto-generated)
- workspace_id: UUID (foreign key to workspaces)
- prompt: TEXT (required)
- negative_prompt: TEXT (optional)
- style: TEXT
- aspect_ratio: TEXT (1:1, 4:5, 16:9, 9:16)
- model: TEXT
- quantity: INT (default 1)
- status: TEXT (queued, processing, completed, failed)
- provider: TEXT (leonardo)
- provider_job_id: TEXT (Leonardo's job ID)
- output_url: TEXT (first image URL)
- output_urls: TEXT (JSON array of all URLs)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- created_by: TEXT (optional)
```

---

## Troubleshooting

### Issue: "Leonardo API key not configured"
**Solution:** Check `.env` has `LEONARDO_API_KEY=your_key` and restart dev server

### Issue: Generations stuck at "processing"
**Solution:** 
- Check Leonardo status: https://status.leonardo.ai
- Verify API key is valid in Leonardo dashboard
- Check browser console for HTTP errors

### Issue: "Failed to create generation record"
**Solution:**
- Verify migration was applied: Check Supabase dashboard
- Verify workspace_id is being sent in request headers
- Check database logs in Supabase

### Issue: Cannot see "Create Image" page
**Solution:**
- Make sure you're logged in
- Check you have admin access to workspace
- Clear browser cache and reload

---

## Cost & Limits

**Leonardo Pricing:**
- Free tier: Limited credits
- Pay-as-you-go: Varies by quality tier
- Pro: Subscription plans

**Rate Limits:**
- Check Leonardo documentation for API limits
- This integration handles rate limit errors gracefully

**Image Limits:**
- Max 8 images per generation
- Supported: All aspect ratios
- Styles: 8 presets available

---

## Success Criteria ✅

After setup, you should see:

1. ✅ No errors in browser console
2. ✅ No errors in server logs
3. ✅ Generation record created in database
4. ✅ Status updates every 2 seconds
5. ✅ Image displays when complete
6. ✅ Can download image
7. ✅ Can regenerate image

---

## Next: Advanced Features

Once basic Leonardo integration works:

- [ ] Webhook support for real-time notifications
- [ ] Batch generation with volume discounts
- [ ] Image upscaling
- [ ] Prompt templates & suggestions
- [ ] Generation history & favorites
- [ ] Cost analytics dashboard
- [ ] Support for other models (Midjourney, DALL-E 3)

---

## Questions?

Check:
- `LEONARDO_SETUP.md` — Full technical docs
- `LEONARDO_QUICK_START.md` — Quick reference
- Leonardo API Docs: https://docs.leonardo.ai/reference/creategeneration
