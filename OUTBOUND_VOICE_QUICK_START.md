# Outbound Voice Calls — Quick Start Guide

## Prerequisites

1. **Workspace & Voice Agent**
   - You have a workspace ID
   - You have created a voice agent (with an active bot)
   - The agent is marked as active

2. **Phone Infrastructure**
   - Your workspace has at least one phone number rented from Telnyx
   - Telnyx API key is configured (`TELNYX_API_KEY` env var)
   - Gemini API key is configured (`GEMINI_API_KEY` env var)

3. **Database**
   - Migration `00194_outbound_call_campaigns.sql` has been applied to Supabase
   - Tables `outbound_campaigns` and `outbound_call_records` exist

## Test It Out (5 minutes)

### Step 1: Get Your IDs

From your dashboard:

```
Workspace ID: [copy from settings]
Voice Agent ID: [copy from phone > voice agents]
Test Phone: [E.164 format, e.g., +12125551234]
```

### Step 2: Start the API

```bash
npm run dev --workspace=@saas/api
# Should see: "Server listening on http://0.0.0.0:3001"
```

### Step 3: Make a Test Call

```bash
curl -X POST http://localhost:3001/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "YOUR_WORKSPACE_ID",
    "voice_agent_id": "YOUR_AGENT_ID",
    "to_phone_number": "+12125551234",
    "contact_data": {
      "name": "Test User",
      "email": "test@example.com",
      "company": "Test Company"
    },
    "custom_context": {
      "campaign": "Test Campaign",
      "product": "Premium Plan",
      "discount": "10% off"
    }
  }'
```

### Step 4: Check the Response

You should get:

```json
{
  "ok": true,
  "call_session_id": "uuid-here",
  "call_control_id": "call-control-id-here",
  "to_phone_number": "+12125551234"
}
```

### Step 5: Answer Your Phone!

The test phone should ring in 2–5 seconds. Pick up and talk to the AI agent.

### Step 6: Check the Dashboard

1. Go to **Phone > Call History**
2. Find your test call
3. View the transcript

---

## Create a Bulk Campaign (Advanced)

### 1. Create the Campaign

```bash
curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "YOUR_WORKSPACE_ID",
    "voice_agent_id": "YOUR_AGENT_ID",
    "name": "Spring Sales 2026",
    "description": "Testing bulk outbound calls",
    "calls_per_minute": 2,
    "retry_on_failure": true,
    "max_retries": 2,
    "metadata": {
      "product": "Premium Plan",
      "discount_percent": 10,
      "promo_code": "SPRING10"
    }
  }'
```

Save the `campaign_id`.

### 2. Prepare Contact List

Create a CSV file (`contacts.csv`):

```csv
phone_number,name,email,company
+12015551234,John Smith,john@example.com,Acme Corp
+13105556789,Sarah Johnson,sarah@example.com,Tech Solutions
+14155551111,Mike Davis,mike@example.com,StartUp Inc
```

### 3. Upload to S3 (or your storage)

Store the CSV at a URL you can pass to the API.

### 4. Update Campaign with Contact List

```bash
curl -X PATCH http://localhost:3001/campaigns/CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "contact_list_url": "https://s3.example.com/contacts.csv",
    "total_contacts": 3,
    "status": "scheduled"
  }'
```

### 5. Start the Campaign

When ready, update the status to `running`:

```bash
curl -X PATCH http://localhost:3001/campaigns/CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "running",
    "scheduled_start": "2026-07-09T14:00:00Z"
  }'
```

The system will begin calling contacts at the specified rate (2 calls/minute in this example).

### 6. Monitor Progress

```bash
curl -X GET http://localhost:3001/campaigns/CAMPAIGN_ID \
  -H "Content-Type: application/json"
```

You'll see:
- `calls_initiated` — how many calls have been started
- `calls_completed` — how many calls finished
- `calls_failed` — how many failed
- `avg_duration_sec` — average call length

---

## What the AI Agent Will Say

The system dynamically builds a system prompt that includes:

1. **Base prompt** — from your bot (e.g., "You are a sales agent...")
2. **Contact info** — name, email, company from the call record
3. **Campaign context** — product, discount, promo code, talking points
4. **Voice rules** — keep responses short, be conversational, natural speech
5. **Opening instruction** — "When they answer, greet them naturally and introduce yourself"

Example prompt that gets sent to Gemini:

```
You are Sarah, a sales agent.

VOICE RULES: This is a real-time phone call.
Keep every response to 1–3 short sentences.
Be conversational and natural — no lists, no markdown.
Speak in plain, flowing sentences.

CONTACT INFO: You are calling John Smith, john@example.com, Acme Corp.

CAMPAIGN CONTEXT: campaign: Spring Sales 2026, product: Premium Plan, discount: 10% off

OPENING: When the callee answers, greet them naturally and introduce yourself briefly.
For example: "Hi, this is Sarah. Is this a good time to chat?"
```

**Result:** The agent calls, waits for you to answer, then greets you naturally and starts the conversation.

---

## Troubleshooting

### Call doesn't ring

**Check:**
1. Phone number is valid E.164 format (`+1-212-555-1234`)
2. Workspace has at least one Telnyx phone number rented
3. `TELNYX_API_KEY` is set and valid
4. Voice agent is marked `is_active = true`

**Debug:**
```bash
# Check API is running
curl http://localhost:3001/health

# Check agent exists
# Go to dashboard > Phone > Voice Agents
# Make sure it shows "Active"
```

### Call connects but no audio

**Check:**
1. `GEMINI_API_KEY` is set and valid
2. Bot has a system prompt (not empty)
3. Voice agent has a voice_name config (defaults to "Aoede")

**Debug:**
- Check API logs: `tail -f /tmp/api.log`
- Look for errors like "GEMINI_API_KEY not set"

### Campaign never starts

**Check:**
1. Campaign status is `running` (not `draft` or `paused`)
2. `scheduled_start` is in the past or very soon
3. Contact list CSV is accessible and properly formatted

**Debug:**
- GET /campaigns/:id to check status
- Check campaign metadata is valid JSON

---

## Contact Data Fields

You can pass any fields in `contact_data`. Common ones:

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "company": "Acme Corp",
  "phone": "+12015551234",
  "title": "VP Sales",
  "industry": "Technology",
  "lead_score": "high",
  "lead_source": "LinkedIn",
  "product_interest": "Premium Plan",
  "budget": "50000",
  "decision_timeline": "Q3 2026",
  "last_contact_date": "2026-06-15",
  "notes": "Mentioned budget constraints in last call"
}
```

All of this appears in the AI agent's system prompt for personalization.

---

## Campaign Context Fields

Similarly, you can add campaign-specific fields in `custom_context`:

```json
{
  "campaign_name": "Spring Sales 2026",
  "product": "Premium Plan",
  "discount_percent": 10,
  "promo_code": "SPRING10",
  "offer_valid_until": "2026-08-31",
  "talking_points": [
    "No setup fee",
    "Free training included",
    "30-day money-back guarantee"
  ],
  "target_industry": "Technology",
  "target_company_size": "50-500 employees"
}
```

---

## Common API Responses

### Success (single call)

```json
{
  "ok": true,
  "call_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "call_control_id": "call_control_id_v2_XXXXX",
  "to_phone_number": "+12125551234"
}
```

### Success (campaign created)

```json
{
  "ok": true,
  "campaign_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "draft"
}
```

### Error (missing field)

```json
{
  "error": "Missing required fields: workspace_id, voice_agent_id, to_phone_number"
}
```

### Error (not authorized)

```json
{
  "error": "Not authorized to access this workspace"
}
```

---

## Next: Build Dashboard UI

The API is working! Now you can:

1. Create a form in the dashboard to call `/calls/initiate`
2. Show campaign creation/management UI
3. Display call history with transcripts
4. Add call outcome tracking (interested, callback, not interested, etc.)

See [OUTBOUND_VOICE_AGENTS.md](./OUTBOUND_VOICE_AGENTS.md) for full documentation.
