# Outbound AI Agent Phone Calls

This document describes the outbound voice call system that enables your AI agents to make phone calls to contacts.

## Architecture Overview

The outbound voice system builds on top of the existing inbound voice infrastructure:

- **Telnyx API**: Makes the actual phone calls and handles audio streaming
- **Gemini Live API**: Powers the AI conversation engine
- **Supabase**: Stores call sessions, campaign data, and transcripts
- **Database**: Tracks campaigns, outbound call records, and call metadata

## Database Schema

### `outbound_campaigns` table
Stores bulk campaign configurations for outbound calls.

```sql
- id: UUID (primary key)
- workspace_id: UUID (workspace owner)
- voice_agent_id: UUID (the AI agent making calls)
- name: text (campaign name)
- description: text (optional campaign description)
- status: text ('draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled')
- contact_list_url: text (S3 URL to CSV file)
- total_contacts: integer (number of contacts to call)
- calls_per_minute: integer (rate limiting, default 5)
- retry_on_failure: boolean (retry failed calls)
- max_retries: integer (max retry attempts)
- calls_initiated: integer (stats)
- calls_completed: integer (stats)
- calls_failed: integer (stats)
- avg_duration_sec: integer (average call duration)
- scheduled_start: timestamptz (when to start)
- scheduled_end: timestamptz (when to end)
- started_at: timestamptz (actual start time)
- completed_at: timestamptz (actual completion time)
- metadata: jsonb (custom campaign config)
```

### `outbound_call_records` table
Tracks individual call attempts (for both ad-hoc and campaign calls).

```sql
- id: UUID (primary key)
- workspace_id: UUID (workspace owner)
- campaign_id: UUID (links to campaign, null for ad-hoc calls)
- call_session_id: UUID (links to call_sessions table)
- contact_id: UUID (the contact being called)
- to_phone_number: text (E.164 format, e.g., +12125551234)
- status: text ('pending' | 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'cancelled')
- attempted: boolean (whether call was answered)
- duration_seconds: integer (how long the call lasted)
- hangup_cause: text (why the call ended)
- contact_data: jsonb (name, email, company, custom fields)
- custom_context: jsonb (campaign-specific context for AI)
- scheduled_at: timestamptz
- initiated_at: timestamptz
- answered_at: timestamptz
- completed_at: timestamptz
```

## API Endpoints

### 1. Initiate a Single Outbound Call

**POST** `/calls/initiate`

Initiates a single outbound call (ad-hoc, not part of a campaign).

**Request body:**
```json
{
  "workspace_id": "uuid",
  "voice_agent_id": "uuid",
  "to_phone_number": "+12125551234",
  "contact_id": "uuid (optional)",
  "contact_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "lead_score": "high"
  },
  "custom_context": {
    "campaign": "Spring Sales 2026",
    "product": "Premium Plan",
    "discount": "20% off"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "call_session_id": "uuid",
  "call_control_id": "string (Telnyx ID)",
  "to_phone_number": "+12125551234"
}
```

**Notes:**
- The AI agent waits for the callee to speak first
- `contact_data` and `custom_context` are injected into the Gemini system prompt
- Authentication: User must be a member of the workspace
- Phone number must be in E.164 format (e.g., +1-212-555-1234)

---

### 2. Create an Outbound Campaign

**POST** `/campaigns`

Creates a bulk outbound campaign (to call many contacts).

**Request body:**
```json
{
  "workspace_id": "uuid",
  "voice_agent_id": "uuid",
  "name": "Spring Sales Campaign 2026",
  "description": "Outbound sales calls for new product launch",
  "contact_list_url": "s3://bucket/contacts.csv",
  "total_contacts": 500,
  "calls_per_minute": 5,
  "retry_on_failure": true,
  "max_retries": 3,
  "metadata": {
    "product": "Premium Plan",
    "discount": "20% off",
    "promo_code": "SPRING26"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "campaign_id": "uuid",
  "status": "draft"
}
```

**Notes:**
- Campaign starts in `draft` status
- CSV file should have columns: `phone_number`, `name`, `email`, `company`, etc.
- Use `PATCH /campaigns/:id` to change status to `scheduled` or `running`

---

### 3. Get Campaign Details

**GET** `/campaigns/:id`

Retrieves campaign information and call statistics.

**Response:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "voice_agent_id": "uuid",
  "name": "Spring Sales Campaign 2026",
  "description": "...",
  "status": "running",
  "contact_list_url": "s3://...",
  "total_contacts": 500,
  "calls_per_minute": 5,
  "calls_initiated": 125,
  "calls_completed": 110,
  "calls_failed": 15,
  "avg_duration_sec": 245,
  "scheduled_start": "2026-07-09T12:00:00Z",
  "scheduled_end": "2026-07-10T18:00:00Z",
  "started_at": "2026-07-09T12:00:15Z",
  "completed_at": null,
  "metadata": { ... },
  "created_at": "2026-07-08T10:00:00Z",
  "updated_at": "2026-07-09T10:13:00Z"
}
```

---

### 4. Update Campaign Status

**PATCH** `/campaigns/:id`

Update campaign settings or status.

**Request body:**
```json
{
  "status": "running",
  "calls_per_minute": 10,
  "scheduled_start": "2026-07-09T14:00:00Z",
  "scheduled_end": "2026-07-10T18:00:00Z"
}
```

**Allowed fields:**
- `status` ('draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled')
- `name`
- `description`
- `calls_per_minute`
- `retry_on_failure`
- `max_retries`
- `scheduled_start`
- `scheduled_end`
- `metadata`

**Response:**
```json
{
  "ok": true,
  "id": "uuid"
}
```

---

## How It Works: The Call Flow

### 1. **Initiate Call**
- POST `/calls/initiate` creates `call_sessions` + `outbound_call_records` rows
- Telnyx API is called to dial the number
- Call status changes to `initiated`

### 2. **Call Answered**
- Telnyx webhook `/telnyx/voice` receives `call.answered` event
- `call_sessions.status` → `answered`
- `outbound_call_records.status` → `answered`
- Telnyx starts audio streaming to `/telnyx/call-ws` WebSocket

### 3. **AI Conversation**
- `telnyx-call-handler.ts` receives caller audio
- AI agent's system prompt includes:
  - Base prompt (from bot or agent)
  - Contact data (name, email, company, etc.)
  - Custom campaign context
  - Voice rules (keep responses short, natural speech)
- Audio is forwarded to **Gemini Live API**
- Gemini responds with agent voice audio
- Agent waits for caller to speak (passive, not aggressive)

### 4. **Call Ends**
- Telnyx webhook receives `call.hangup` event
- Call duration, transcript, and metadata are saved
- `outbound_call_records` is updated with final status
- Transcript is inserted into conversations/messages tables

### 5. **Post-Call**
- Call transcript becomes a conversation in the dashboard
- Stats are aggregated for the campaign
- Billing is recorded based on call duration

---

## System Prompt Injection

When an outbound call is initiated, the Gemini system prompt is built dynamically:

```
[Base bot prompt or "You are {agent_name}, a helpful AI agent."]

VOICE RULES: This is a real-time phone call.
Keep every response to 1–3 short sentences.
Be conversational and natural — no lists, no markdown.
Speak in plain, flowing sentences.

CONTACT INFO: You are calling John Doe, john@example.com, Acme Corp.

CAMPAIGN CONTEXT: campaign: Spring Sales 2026, product: Premium Plan, discount: 20% off

OPENING: When the callee answers, greet them naturally and introduce yourself briefly.
For example: "Hi, this is {agent_name}. Is this a good time to chat?"
```

This is built by the `buildCallContext()` function in `outbound-calls.service.ts`.

---

## Contact Data Format

The `contact_data` and `custom_context` fields can include any JSON data:

**Example contact_data:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "phone": "+12125551234",
  "lead_score": "high",
  "product_interest": "Premium",
  "last_contact": "2026-06-15",
  "notes": "Mentioned budget concerns in last email"
}
```

**Example custom_context (campaign-specific):**
```json
{
  "campaign_name": "Spring Sales 2026",
  "campaign_id": "uuid",
  "product": "Premium Plan",
  "discount_percent": 20,
  "promo_code": "SPRING26",
  "offer_valid_until": "2026-08-31",
  "talking_points": ["No setup fee", "Free training", "30-day trial"]
}
```

All of this data is automatically woven into the system prompt so the AI agent has full context.

---

## Call Status Lifecycle

### Outbound Call Record States

```
pending      → initiated     → ringing       → answered      → completed ✓
                            ↓
                          failed
                            ↓
                          (retry if enabled)
                            ↓
                          pending → ...

(Also: cancelled if user stops campaign)
```

### Campaign States

```
draft        → scheduled     → running       → completed ✓
              ↓ (manual)    ↓ (auto)
              cancelled     paused
                ↓
              running → completed
```

---

## Authentication

All endpoints require user authentication (Supabase auth).

The request user must be a **workspace member** to:
- Initiate calls in that workspace
- Create campaigns in that workspace
- View campaign details and call records

---

## Example: Complete Test Flow

### 1. Get a workspace ID and voice agent ID
```bash
# You need these from your dashboard
WORKSPACE_ID="..."  # from workspace settings
VOICE_AGENT_ID="..."  # from voice agents page
```

### 2. Create a test campaign
```bash
curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "'$WORKSPACE_ID'",
    "voice_agent_id": "'$VOICE_AGENT_ID'",
    "name": "Test Campaign",
    "calls_per_minute": 1
  }'
```

### 3. Initiate a single test call
```bash
curl -X POST http://localhost:3001/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "'$WORKSPACE_ID'",
    "voice_agent_id": "'$VOICE_AGENT_ID'",
    "to_phone_number": "+12125551234",
    "contact_data": {
      "name": "Test Contact",
      "email": "test@example.com"
    }
  }'
```

### 4. Check the call in your dashboard
- Go to Phone > Call History
- Find your test call
- View the transcript and details

---

## Related Files

- **Database migrations:** `supabase/migrations/00194_outbound_call_campaigns.sql`
- **API routes:** `apps/api/src/routes/outbound-calls.ts`
- **Service logic:** `apps/api/src/services/outbound-calls.service.ts`
- **Call handler:** `apps/api/src/live/telnyx-call-handler.ts` (updated for outbound)
- **Webhooks:** `apps/api/src/routes/webhooks/telnyx-voice.ts` (updated for outbound)

---

## Next Steps

1. **Run the migration** to create the `outbound_campaigns` and `outbound_call_records` tables
2. **Add dashboard UI** to create campaigns and view call history
3. **Implement campaign scheduler** to auto-start campaigns at scheduled times
4. **Add retry logic** for failed calls
5. **Implement bulk contact import** from CSV
6. **Add call outcome tracking** (lead captured, interested, not interested, etc.)

---

## Troubleshooting

### Call fails to initiate
- Check `TELNYX_API_KEY` is set in environment
- Verify workspace has available phone numbers
- Verify voice agent is active and belongs to the workspace

### Call connects but no audio
- Check Gemini API key is set (`GEMINI_API_KEY`)
- Verify agent bot has a system prompt
- Check WebSocket URL (`PUBLIC_API_URL`) is correct

### Campaign won't run
- Check campaign status is `scheduled` or `running`
- Verify contact list CSV is accessible (if using bulk campaign)
- Check `calls_per_minute` isn't too high (may get rate-limited)

---

## Performance & Limits

- **Concurrent calls:** Limited by Telnyx account (typically 50–1000+)
- **Calls per minute:** Configurable per campaign (default 5)
- **Call timeout:** 1 hour max (Telnyx/Gemini API limits)
- **Transcript size:** No limit per se, but large transcripts may slow down queries
- **Campaign size:** Can handle 10,000+ contacts (queue-based processing)

---

## Security Notes

- All calls require workspace membership authentication
- Call transcripts are stored encrypted in Supabase
- Contact data and custom context are stored in the database
- Phone numbers are in E.164 format (no PII validation currently)
- Telnyx API keys are stored in environment variables (never logged)

---

## Cost Considerations

Outbound calls are billed like inbound calls:
- Per-minute rates depend on destination country
- Retry attempts incur additional charges
- Campaign settings allow rate limiting to control costs

See billing/voice-call-rates documentation for current pricing.
