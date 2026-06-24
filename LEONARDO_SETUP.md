# Leonardo API Integration Setup

## Overview
The AI Studio's Create Image page is now fully integrated with the Leonardo API. All image generations go through your backend, which calls Leonardo's REST API.

## Setup Steps

### 1. Get Leonardo API Key
1. Visit [Leonardo.AI](https://leonardo.ai)
2. Sign up and go to Account Settings
3. Find your API key in the Integrations section
4. Copy the key

### 2. Set Environment Variable
Add to your `.env` file in the root directory:

```bash
LEONARDO_API_KEY=your_leonardo_api_key_here
```

Alternatively, set it in your deployment platform (Vercel, Railway, etc.)

### 3. Run Database Migration
Run the migration to create the `ai_image_generations` table:

```bash
npx supabase migration up --db-url="your_supabase_connection_string"
```

Or manually run the SQL from:
```
supabase/migrations/00190_ai_image_generations.sql
```

### 4. Restart Dev Server
```bash
npm run dev
```

## How It Works

### Frontend Flow
1. User enters prompt and clicks "Generate" on `/ai-studio/create-image`
2. Frontend calls `POST /api/ai-studio/generate/image`
3. User sees real-time status updates while image generates
4. Completed images display in the gallery with download/regenerate options

### Backend Flow
1. API validates workspace and creates generation record in Supabase
2. Calls Leonardo API with generation parameters
3. Returns generation ID to frontend
4. Frontend polls `/api/ai-studio/generations/:id` for status updates
5. When Leonardo returns images, backend stores URLs in database
6. Frontend displays completed images with hover actions

## API Endpoints

### Generate Image
```
POST /api/ai-studio/generate/image
Headers: x-workspace-id: <workspace_id>
Body: {
  prompt: string
  style: string
  aspectRatio: '1:1' | '4:5' | '16:9' | '9:16'
  model: string
  quantity: number
  negativePrompt?: string
  referenceImage?: string
}

Response: {
  id: string
  status: 'processing' | 'queued'
  outputUrl: ''
  type: 'image'
  estimatedCredits: number
}
```

### Get Generation Status
```
GET /api/ai-studio/generations/:id
Headers: x-workspace-id: <workspace_id>

Response: {
  id: string
  status: 'processing' | 'completed' | 'failed'
  outputUrl: string
  type: 'image'
  estimatedCredits: number
}
```

## Database Schema

### ai_image_generations Table
- `id` - UUID, primary key
- `workspace_id` - Reference to workspaces
- `prompt` - Text description
- `negative_prompt` - Negative prompts
- `style` - Style preset
- `aspect_ratio` - Image dimensions
- `model` - AI model used
- `quantity` - Number of images to generate
- `status` - 'queued', 'processing', 'completed', 'failed'
- `provider` - 'leonardo' (extensible for other providers)
- `provider_job_id` - Leonardo's job ID for polling
- `output_url` - First generated image URL
- `output_urls` - JSON array of all image URLs
- `created_at`, `updated_at` - Timestamps

## Features

✅ **Real-time Status Updates** — Automatic polling every 2 seconds
✅ **Error Handling** — Graceful failures with user feedback
✅ **Workspace Isolation** — Row-level security ensures users only see their generations
✅ **Multiple Images** — Generate 1-8 images per prompt
✅ **Aspect Ratio Control** — 1:1, 4:5, 16:9, 9:16 aspect ratios
✅ **Style Presets** — 8 pre-configured styles
✅ **Credit Tracking** — 10 credits per image generated
✅ **Download/Regenerate** — Hover over images for quick actions

## Troubleshooting

### "Leonardo API key not configured"
- Check `.env` file has `LEONARDO_API_KEY`
- Restart dev server after adding env var
- Make sure key is valid from Leonardo dashboard

### Generations stuck in "processing"
- Check Leonardo's status page: https://status.leonardo.ai
- Verify API key has sufficient credits
- Check browser console for polling errors

### Database errors
- Ensure migration 00190 has run
- Check workspace_id is being sent in request headers
- Verify user has access to workspace

## Future Enhancements

- [ ] Support for Midjourney, DALL-E 3, Stable Diffusion
- [ ] Batch generation with discount pricing
- [ ] Image upscaling and enhancement
- [ ] Prompt templates and suggestions
- [ ] Generation history and favorites
- [ ] Bulk download generated images
- [ ] API rate limiting per workspace
- [ ] Cost analytics and usage dashboard

## Files Modified/Created

- `apps/api/src/config.ts` — Added LEONARDO_API_KEY
- `apps/api/src/adapters/leonardo.ts` — Leonardo API client (NEW)
- `apps/api/src/routes/ai-studio/images.ts` — Image generation endpoints (NEW)
- `apps/dashboard/src/lib/api/ai-studio.ts` — Updated to call real backend
- `supabase/migrations/00190_ai_image_generations.sql` — Database schema (NEW)
- `apps/api/src/index.ts` — Registered image routes
