# Appalix Domain Setup Guide

This guide walks through setting up appalix.com with subdomains for the full application.

## Domain Structure

```
appalix.com              → Marketing site (landing page)
app.appalix.com         → Dashboard (Next.js frontend)
api.appalix.com         → API backend (Render)
```

## Step 1: DNS Configuration

Add these DNS records to your domain registrar (e.g., Namecheap, GoDaddy, Route53):

### 1. Marketing Site (appalix.com)
- **Type**: A or CNAME
- **Name**: @ (root)
- **Value**: Points to where your marketing site is hosted
- If using Render: `appalix-marketing.onrender.com` (CNAME)
- If using Vercel: Vercel's assigned domain (CNAME)

### 2. Dashboard (app.appalix.com)
- **Type**: CNAME
- **Name**: app
- **Value**: `appalix-dashboard.onrender.com` or your Vercel domain
- Example: If using Vercel, it would be something like `cname.vercel-dns.com`

### 3. API (api.appalix.com)
- **Type**: CNAME
- **Name**: api
- **Value**: `appalix-api.onrender.com`

### 4. SSL/TLS Certificates
- Most registrars auto-provision SSL
- If using Render: They auto-generate Let's Encrypt certs for custom domains
- If using Vercel: Also auto-generates certs
- Wait 10-30 minutes for certificates to activate

## Step 2: Render Configuration (API)

1. Go to your Render dashboard
2. Select **appalix-api** service
3. Click **Settings**
4. Scroll to **Custom Domains**
5. Add domain: `api.appalix.com`
6. Render will show you the CNAME target to add to DNS
7. Wait for SSL certificate to be provisioned

## Step 3: Environment Variables

### API (.env)
```env
PUBLIC_API_URL=https://api.appalix.com
```

Update in Render dashboard:
- Go to **appalix-api** → **Environment**
- Add/update: `PUBLIC_API_URL=https://api.appalix.com`

### Dashboard (.env)
```env
NEXT_PUBLIC_API_URL=https://api.appalix.com
```

Update in Render/Vercel:
- Dashboard needs to know where API is
- Set `NEXT_PUBLIC_API_URL=https://api.appalix.com`

## Step 4: Webhook URLs (Important!)

Update all webhook integrations to use the new domain:

### Telnyx
1. Go to Telnyx dashboard
2. **Webhooks** → **Messaging** and **Voice**
3. Update webhook URLs:
   - Change from: `https://appalix-api.onrender.com/webhooks/...`
   - Change to: `https://api.appalix.com/webhooks/...`

### Slack, WhatsApp, Facebook, etc.
- Find webhook/callback URL settings
- Replace `appalix-api.onrender.com` with `api.appalix.com`

### Example Webhook URLs to Update
- Telnyx SMS: `https://api.appalix.com/webhooks/telnyx-messaging`
- Telnyx Voice: `https://api.appalix.com/webhooks/telnyx-voice`
- Slack: `https://api.appalix.com/webhooks/slack`
- WhatsApp: `https://api.appalix.com/webhooks/whatsapp`
- Facebook: `https://api.appalix.com/webhooks/facebook`

## Step 5: Test the Setup

```bash
# Test API domain is working
curl https://api.appalix.com/health

# Should return:
# {"status":"ok","ts":"2026-07-11T...","env":"production"}
```

## Step 6: Update Dashboard Config

If your dashboard is deployed:
1. Set `NEXT_PUBLIC_API_URL=https://api.appalix.com` in deployment config
2. Redeploy the dashboard
3. Test that API calls work from the dashboard

## Deployment Services

### Render (API) - appalix-api
- Service type: Web
- Custom domain: `api.appalix.com`
- Auto SSL: Enabled
- Health check: `/health`

### Vercel (Dashboard) - optional
- If using Vercel for dashboard
- Custom domain: `app.appalix.com`
- Auto SSL: Enabled

### Marketing Site
- Can stay on current hosting or move to Vercel/Netlify
- Custom domain: `appalix.com`

## SSL Certificate Status

Render and Vercel auto-generate SSL certificates. To verify:
- Open browser to `https://api.appalix.com/health`
- Check certificate: Click lock icon → Certificate is valid
- Should show Let's Encrypt certificate

## Troubleshooting

### API returns 404
- Check DNS propagation: `nslookup api.appalix.com`
- Wait 24 hours for full DNS propagation
- Render custom domain not yet active: wait 10-30 minutes

### Webhooks not firing
- Verify webhook URLs updated in all platforms
- Check `https://api.appalix.com/health` responds
- Review webhook logs in Telnyx/Slack/etc. dashboards

### Dashboard can't reach API
- Check `NEXT_PUBLIC_API_URL` is set to `https://api.appalix.com`
- Redeploy dashboard after changing env var
- Check browser console for CORS errors

### Certificate not trusted
- Wait 30 minutes for SSL provisioning
- Try accessing from different device/network
- Clear browser cache

## Timeline

- **Immediate**: Add DNS records
- **10-30 minutes**: SSL certificates provisioned
- **30 minutes - 24 hours**: Full DNS propagation
- **After DNS propagates**: Update webhook URLs
- **After webhooks updated**: Full system should be live

## Files to Review

- `/apps/api/.env` — `PUBLIC_API_URL=https://api.appalix.com`
- Dashboard config — `NEXT_PUBLIC_API_URL=https://api.appalix.com`
- Render dashboard — Custom domains + environment variables
- Platform integrations — All webhook URLs
