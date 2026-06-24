# Talking Actors Management Page

Complete management interface for custom talking actors in the Talking Actors Studio.

## Overview

Users can now upload, manage, and organize their custom talking actors at `/dashboard/studio/actors`. The page provides a professional interface for creating and organizing custom AI actor avatars.

## Features

### Actor Upload
- **Image Upload** — Upload photos to create actor avatars (JPEG, PNG, WebP)
- **Video Upload** — Upload videos for actor demonstrations (MP4, MOV, WebM)
- **Drag & Drop** — Drag files directly onto the upload area
- **File Validation** — Max 10MB for images, 100MB for videos
- **Preview** — Real-time preview before uploading

### Actor Management
- **Actor Grid** — Browse all uploaded actors with thumbnails
- **Actor Details** — View full actor information and metadata
- **Quick Actions** — Delete or view details on hover
- **Sorting** — Automatically sorts by upload date (newest first)
- **Search Ready** — Prepared for adding search functionality

### Actor Card Display
- Actor name and upload date
- Type badge (Built-in or Custom)
- Video indicator if video is attached
- Hover actions (view, delete)
- Full preview image/video

## File Structure

### Pages
```
apps/dashboard/src/app/(dashboard)/studio/actors/page.tsx
```
- Main actors management page
- Grid layout with empty state
- Actor cards with actions
- Detail modal for viewing actor info

### Components
```
apps/dashboard/src/components/studio/talking-actors/actor-upload-dialog.tsx
```
- Reusable upload dialog modal
- Tabs for Image/Video upload modes
- Drag & drop file input
- File validation and error handling
- Success/error notifications
- Progress indicators

### Database Tables

**talking_actors**
```sql
id               UUID (PK)
workspace_id     UUID (FK → workspaces)
actor_name       TEXT
image_url        TEXT (nullable)
video_url        TEXT (nullable)
type             TEXT ('builtin' | 'custom')
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

**RLS Policies**
- Users can only view/manage actors in their workspace
- Automatic workspace isolation

## Navigation

Added to Sidebar under new "Studio" section:
```
Studio
├── Talking Actors  (/studio/actors) ← NEW
└── Video Generator (/videos)
```

## API Endpoints (Ready to Implement)

### Get Actors
```
GET /api/talking-actors

Response:
{
  "actors": [
    {
      "id": "uuid",
      "name": "John Smith",
      "image_url": "https://...",
      "video_url": null,
      "type": "custom",
      "created_at": "2026-06-15T..."
    }
  ]
}
```

### Upload Actor
```
POST /api/talking-actors/upload
Content-Type: multipart/form-data

Form data:
- file: File
- actorName: string
- type: 'image' | 'video'

Response:
{
  "actor": {
    "id": "uuid",
    "name": "John Smith",
    ...
  }
}
```

### Delete Actor
```
DELETE /api/talking-actors/:actorId

Response:
{
  "success": true,
  "message": "Actor deleted"
}
```

## UI Components

### ActorCard
- Displays actor preview (image/emoji)
- Shows name and upload date
- Type and video badges
- Hover actions (view/delete)
- Responsive grid layout

### ActorDetailModal
- Full actor information
- Large preview image/video
- Metadata display
- Quick actions
- Close and "Use in Video" buttons

### ActorUploadDialog
- Two-tab interface (Image/Video)
- Actor name input
- Drag & drop upload zone
- File preview
- Error/success messages
- Upload progress

## Styling

- **Dark Mode Support** — Full dark mode compatibility
- **Responsive** — Works on mobile, tablet, desktop
- **Professional** — Consistent with Appalix design system
- **Icons** — Lucide icons throughout
- **Accessibility** — Proper labels, ARIA attributes, keyboard support

## Integration Points

### With Talking Actors Studio
The uploaded actors appear in the Composer actor selector:
1. User uploads actor at `/studio/actors`
2. Actor saved to `talking_actors` table
3. Actor list fetched in Composer
4. User selects actor for video generation

### With Video Generation
When generating a video:
1. User selects custom actor from dropdown
2. Actor ID passed to generation API
3. API uses actor image/video in Tavus/AI generation
4. Video generated with selected actor

## Usage Flow

### 1. Upload New Actor
```
/studio/actors → Upload Button → Select File → Name Actor → Create
```

### 2. View Actor Details
```
/studio/actors → Actor Card Hover → View Details Button → Modal Shows
```

### 3. Delete Actor
```
/studio/actors → Actor Card Hover → Delete Button → Confirm → Actor Removed
```

### 4. Use in Video
```
/studio/actors → Detail Modal → Use in Video Button → Redirect to Studio
```

## States

### Empty State
- Large upload icon
- Helpful message
- "Upload Your First Actor" button
- Encourages user action

### Loading State
- Spinner animation
- "Loading actors..." text
- Full height centered

### Loaded State
- Actor count display
- Grid of actor cards
- Responsive layout (1/2/3 columns)

### Success State
- Green notification with checkmark
- Confirmation message
- Auto-dismiss after 1.5 seconds

### Error State
- Red notification with alert icon
- Error message
- File not cleared for retry

## Performance Considerations

- **Lazy Loading** — Actors fetched on page load (ready for pagination)
- **Image Optimization** — File size limits enforced
- **Preview Generation** — Uses FileReader API for instant preview
- **Grid Layout** — CSS Grid for efficient rendering
- **Modal Lazy Load** — Detail modal only rendered when needed

## Future Enhancements

1. **Search/Filter** — Search actors by name or upload date
2. **Tags** — Add custom tags to organize actors
3. **Bulk Operations** — Select multiple actors for batch delete
4. **Edit Actor Info** — Update actor name after upload
5. **Duplicate Actor** — Clone existing actor with new name
6. **Export** — Download actor as file
7. **Pagination** — Load actors in batches (50 per page)
8. **Sorting Options** — Sort by name, date, or type
9. **Analytics** — Track actor usage in videos
10. **Preview Library** — Show videos generated with each actor

## Security

- **RLS Enforcement** — Database-level workspace isolation
- **File Validation** — Type and size checks before upload
- **Auth Required** — Admin-only access
- **Secure Upload** — Server-side validation of all files
- **Data Isolation** — Users only see their workspace's actors

## Accessibility

- **Semantic HTML** — Proper heading hierarchy
- **ARIA Labels** — Buttons have meaningful labels
- **Keyboard Navigation** — All controls keyboard accessible
- **Color Contrast** — WCAG AA compliant
- **Focus States** — Visible focus indicators
- **Screen Readers** — Proper semantic markup

## Testing Checklist

- [ ] Upload image actor (JPEG, PNG, WebP)
- [ ] Upload video actor (MP4, MOV, WebM)
- [ ] Drag and drop file upload
- [ ] File size validation (too large file)
- [ ] Invalid file type validation
- [ ] Preview displays correctly
- [ ] Actor name validation (required)
- [ ] Delete actor confirmation
- [ ] View actor details modal
- [ ] Empty state displays
- [ ] Loading state displays
- [ ] Error message displays
- [ ] Success message displays
- [ ] Responsive on mobile (1 column)
- [ ] Responsive on tablet (2 columns)
- [ ] Responsive on desktop (3 columns)
- [ ] Dark mode styling
- [ ] Navigation link highlights correctly
- [ ] RLS prevents viewing other users' actors
- [ ] Admin-only access enforced
