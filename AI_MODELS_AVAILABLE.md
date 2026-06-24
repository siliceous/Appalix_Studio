# AI Studio - Available Models

## Image Generation Models

| Model | Description | Credits | Status |
|-------|-------------|---------|--------|
| 🎨 **Leonardo Image** | High-quality realistic images | 10 | ✅ Featured |
| 🖼️ **DALL-E 3** | Advanced image generation with exceptional detail | 15 | ✅ Featured |
| 🌈 **Midjourney** | Artistic and creative image generation | 20 | ✅ Featured |
| ⚡ **Stable Diffusion 3** | Fast and efficient image generation | 8 | Standard |

**Available on:** `/ai-studio/create-image`

**Features:**
- 8 Style presets (Photorealistic, Illustration, Digital Art, Oil Painting, 3D Render, Anime, Watercolor, Concept Art)
- 4 Aspect ratios (1:1, 4:5, 16:9, 9:16)
- Generate 1-8 images per prompt
- Reference image upload support

---

## Video Generation Models

| Model | Description | Credits | Status |
|-------|-------------|---------|--------|
| 🎬 **Sora** | Advanced text-to-video generation | 80 | ✅ Featured |
| 🎥 **Kling Video** | Professional video generation | 50 | ✅ Featured |
| 🎞️ **Runway Gen 3** | AI video generation and editing | 40 | ✅ Featured |
| 🎭 **Pika Labs** | Quick video generation from images | 35 | Standard |

**Available on:** `/ai-studio/create-video`

**Features:**
- Text-to-video generation
- Image-to-video conversion
- Duration control (5-60 seconds)
- Aspect ratio selection
- Camera movement options

---

## Voice & Avatar Models

| Model | Description | Credits | Status |
|-------|-------------|---------|--------|
| 👤 **Tavus** | AI talking avatar videos | 60 | ✅ Featured |
| 🎙️ **Gemini Voice** | Natural voice synthesis and lip-sync | 5 | ✅ Featured |
| 🔊 **ElevenLabs** | Premium voice synthesis | 8 | Standard |

**Available on:** `/ai-studio/talking-ad`

**Features:**
- Avatar selection (4 options)
- 5+ voice options per avatar
- Script-based generation
- Lip-sync support
- Language selection
- Background customization

---

## Text Generation Models

| Model | Description | Credits | Status |
|-------|-------------|---------|--------|
| ✍️ **GPT-4** | Advanced text generation and analysis | 2 | ✅ Featured |
| 🤖 **Claude 3** | Intelligent text generation | 2 | Standard |

**Available on:** Dashboard (future implementation)

---

## Feature Availability by Page

### Create Image (`/ai-studio/create-image`)
- ✅ Leonardo Image
- ✅ DALL-E 3
- ✅ Midjourney
- ✅ Stable Diffusion 3
- **Total:** 4 image models
- **Featured:** 3
- **Credits per image:** 8-20

### Create Video (`/ai-studio/create-video`)
- ✅ Sora
- ✅ Kling Video
- ✅ Runway Gen 3
- ✅ Pika Labs
- **Total:** 4 video models
- **Featured:** 3
- **Credits per video:** 35-80

### Product Ads (`/ai-studio/product-ads`)
- Uses video generation models (Kling, Sora, Runway)
- Custom prompt engineering for product ads
- **Credits:** 75 per ad (combo of image + video)

### Talking Ad (`/ai-studio/talking-ad`)
- ✅ Tavus (talking avatars)
- ✅ Gemini Voice (voice synthesis)
- ✅ ElevenLabs (premium voice)
- **Credits:** 100 per video (avatar + voice)

### Dashboard (`/ai-studio`)
- Shows all featured models (6 total)
- Leonardo Image, DALL-E 3, Midjourney (images)
- Sora, Kling, Tavus (videos)
- Quick cards for each tool
- Recent projects gallery

---

## Model Features Comparison

### Image Models

| Feature | Leonardo | DALL-E 3 | Midjourney | Stable Diffusion |
|---------|----------|----------|-----------|------------------|
| Realism | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Creativity | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cost | $ | $$ | $$$ | $ |

### Video Models

| Feature | Sora | Kling | Runway | Pika |
|---------|------|-------|--------|------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Stability | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Cost | $$$$ | $$ | $$ | $ |

---

## Credit System

### Budget by Use Case

**Creating one image:**
- Leonardo Image: 10 credits
- DALL-E 3: 15 credits
- Midjourney: 20 credits
- Stable Diffusion: 8 credits

**Creating one video (30 sec):**
- Sora: 80 credits
- Kling: 50 credits
- Runway: 40 credits
- Pika Labs: 35 credits

**Creating a talking avatar (60 sec):**
- Tavus + Gemini Voice: 100 credits
- Base avatar: 60 credits
- Voice: 5 credits per utterance

### Standard Allocations

**Free Plan:**
- 50 credits/month
- Image focus (5 images @ Leonardo)
- Video: Limited to 1 video

**Pro Plan ($99/month):**
- 2,000 credits/month
- Mix of images, videos, and avatars
- Priority queue

**Enterprise:**
- Custom allocations
- Dedicated support
- API access

---

## Future Models (Planned)

- 🎞️ **Synthesia** — Video avatar with different presenters
- 🎨 **Adobe Firefly** — Creative image generation
- 📹 **HeyGen** — More talking avatar options
- 🔊 **Google Cloud TTS** — Additional voice options

---

## Implementation Status

✅ **Leonardo Image** — Fully integrated, backend API live  
🔄 **Other Image Models** — Mock data ready, backend routes needed  
🔄 **All Video Models** — Mock data ready, Kling API integration in progress  
🔄 **Voice Models** — Mock data ready, Gemini integration live  
⏳ **Text Models** — Mock data ready, GPT-4 integration planned  

---

## For Developers

### Adding a New Model

1. Update `apps/dashboard/src/lib/api/ai-studio.ts` mockModels array
2. Create API adapter in `apps/api/src/adapters/[model].ts`
3. Create endpoint in `apps/api/src/routes/ai-studio/[model].ts`
4. Create database migration for tracking
5. Update frontend component to include model

### Backend API Pattern

```typescript
// Adapter pattern
export async function generateWithModel(params: GenerationParams): Promise<string>
export async function checkStatus(jobId: string): Promise<GenerationResult>

// Endpoint pattern
POST /api/ai-studio/generate/[type]
GET /api/ai-studio/generations/:id
```

---

## Support

For issues with specific models:
- Check Leonardo status: https://status.leonardo.ai
- Check OpenAI status: https://status.openai.com
- Check Runway status: https://status.runway.com
- Check Kling status: https://www.klingai.com

Last updated: 2026-06-19
