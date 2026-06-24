# Leonardo API Quick Start

## 30-Second Setup

### Step 1: Get Your API Key
1. Go to https://leonardo.ai
2. Sign up / Log in
3. Go to **Account Settings** → **API Keys**
4. Copy your API key

### Step 2: Add to Environment
Add this line to `.env` file in the root directory:
```
LEONARDO_API_KEY=your_key_here_starting_with_auth_
```

### Step 3: Run Migration
```bash
# If using local Supabase
supabase migration up --db-url "postgresql://..."

# Or manually execute SQL from:
supabase/migrations/00190_ai_image_generations.sql
```

### Step 4: Restart
```bash
npm run dev
```

## Done! ✅

Visit `localhost:3000/ai-studio/create-image` and generate your first image.

---

## Test It

1. Log in at localhost:3000
2. Go to **AI Studio** → **Create Image** (left sidebar)
3. Enter a prompt: *"A serene landscape with mountains and lakes"*
4. Click **Generate**
5. Watch the status update in real-time
6. When complete, download or regenerate

---

## What Just Happened

- Frontend sent your prompt to `/api/ai-studio/generate/image`
- Backend created a database record and called Leonardo API
- Leonardo generated the image (takes ~10-60 seconds)
- Backend polled for completion and stored the result
- Frontend displayed the finished image

Your API key is **never exposed to the frontend** — all calls go through your secure backend.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not configured" | Make sure `.env` has `LEONARDO_API_KEY=` and you restarted dev server |
| Generations never complete | Check Leonardo status at https://status.leonardo.ai |
| Database error | Run the migration from `supabase/migrations/00190_ai_image_generations.sql` |
| Can't see "Create Image" page | Make sure you're logged in and have admin access to workspace |

---

## API Costs

Leonardo pricing varies by image quality and model. Check your dashboard at https://leonardo.ai/account/usage for current rates.

This integration tracks all generations in your database for billing/analytics later.

---

## What's Next

Once Leonardo is working:
1. Apply same pattern to Create Video (Kling API)
2. Add Product Ads generation
3. Implement credit system tracking
4. Set up cost analytics dashboard

See `LEONARDO_SETUP.md` for full technical details.
