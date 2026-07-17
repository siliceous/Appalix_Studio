# Domain Setup Checklist

Follow these steps in order to set up appalix.com with subdomains.

## Phase 1: DNS Configuration (15 min)

- [ ] Log in to your domain registrar (Namecheap, GoDaddy, Route53, etc.)
- [ ] Go to DNS settings for appalix.com
- [ ] Add DNS record for `api.appalix.com`:
  - Type: CNAME
  - Name: api
  - Value: `appalix-api.onrender.com`
- [ ] Add DNS record for `app.appalix.com` (if using separate dashboard service):
  - Type: CNAME
  - Name: app
  - Value: `appalix-dashboard.onrender.com` or your Vercel domain
- [ ] Add DNS record for `appalix.com` (marketing site):
  - Type: CNAME or A record
  - Name: @ (root)
  - Value: Your marketing site host
- [ ] Save changes

**Wait 5-10 minutes for DNS to propagate**

## Phase 2: Render Configuration (10 min)

- [ ] Go to Render.com dashboard
- [ ] Select **appalix-api** service
- [ ] Click **Settings**
- [ ] Scroll to **Custom Domains**
- [ ] Click **Add Custom Domain**
- [ ] Enter: `api.appalix.com`
- [ ] Click **Add Domain**
- [ ] Render will show CNAME target (verify it matches what you added to DNS)
- [ ] Wait for SSL certificate to be generated (10-30 minutes)
  - Status should change from "Pending" to "Active"

## Phase 3: Environment Variables (5 min)

### Render API Environment
- [ ] In Render, go to **appalix-api** service
- [ ] Click **Environment**
- [ ] Find or add variable: `PUBLIC_API_URL`
- [ ] Set value to: `https://api.appalix.com`
- [ ] Click **Save**
- [ ] Service will auto-redeploy

### Dashboard Environment (if applicable)
- [ ] Go to your dashboard deployment (Vercel/Render/etc.)
- [ ] Find or add variable: `NEXT_PUBLIC_API_URL`
- [ ] Set value to: `https://api.appalix.com`
- [ ] Save and redeploy

## Phase 4: Verify DNS & SSL (10 min)

- [ ] Open terminal and run:
  ```bash
  nslookup api.appalix.com
  ```
  Should show the Render IP address

- [ ] Test API endpoint:
  ```bash
  curl https://api.appalix.com/health
  ```
  Should return: `{"status":"ok","ts":"...","env":"production"}`

- [ ] In browser, visit `https://api.appalix.com/health`
  - Check SSL certificate: Click lock icon
  - Should show "Let's Encrypt" certificate

## Phase 5: Update Webhook URLs (20 min)

**IMPORTANT: Do this after DNS is live and working**

### Telnyx Webhooks
- [ ] Go to Telnyx.com dashboard
- [ ] Go to **Webhooks** → **Messaging**
  - [ ] Find webhook URL for SMS
  - [ ] Change from: `https://appalix-api.onrender.com/webhooks/telnyx-messaging`
  - [ ] Change to: `https://api.appalix.com/webhooks/telnyx-messaging`
- [ ] Go to **Webhooks** → **Voice**
  - [ ] Find webhook URL for calls
  - [ ] Change from: `https://appalix-api.onrender.com/webhooks/telnyx-voice`
  - [ ] Change to: `https://api.appalix.com/webhooks/telnyx-voice`
- [ ] Save changes

### Other Platform Webhooks
- [ ] **Slack**: Update callback/webhook URLs if any
- [ ] **WhatsApp**: Update webhook endpoint
- [ ] **Facebook**: Update webhook URL
- [ ] **WordPress**: Update webhook URL if using
- [ ] **Google Chat**: Update webhook URL if using
- [ ] **Instagram**: Update webhook URL if using

## Phase 6: Final Testing (10 min)

- [ ] Test inbound SMS to your Telnyx number
  - Should reach dashboard without errors
  
- [ ] Test inbound phone call to your Telnyx number
  - Should connect to AI agent without errors

- [ ] Test from dashboard:
  - Make an API call from the dashboard
  - Should reach `https://api.appalix.com`
  - Check browser Network tab to verify

- [ ] Test webhook delivery:
  - Send test webhook from Telnyx
  - Verify it's received by API

## Post-Setup Maintenance

- [ ] Save API domain URL: `https://api.appalix.com`
- [ ] Save dashboard domain: `app.appalix.com` (if using separate service)
- [ ] Save marketing domain: `appalix.com`
- [ ] Document in team wiki/Slack
- [ ] Update any external documentation

## Troubleshooting

If any step fails:
1. **DNS not resolving**: Wait 24 hours, try from different network
2. **SSL certificate pending**: Wait 10-30 minutes in Render dashboard
3. **API returns 404**: Check `PUBLIC_API_URL` env var is set correctly
4. **Webhooks not firing**: Check updated URLs in Telnyx/Slack/etc., verify API is responding
5. **Dashboard can't reach API**: Check `NEXT_PUBLIC_API_URL` env var, redeploy dashboard

## Support

See `DOMAIN_SETUP.md` for detailed troubleshooting and configuration steps.

---

**Estimated Total Time: 1-2 hours** (most time is waiting for DNS/SSL propagation)

**Recommended Approach:**
1. Do Phase 1 (DNS) + Phase 2 (Render) now
2. Wait 30 minutes for DNS/SSL
3. Do Phase 4 (Verify) - confirm it's working
4. Do Phase 5 (Webhooks) - update all integrations
5. Do Phase 6 (Testing) - verify end-to-end
