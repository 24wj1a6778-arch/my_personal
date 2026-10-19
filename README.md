# WhatsApp AI Assistant (Free-Tier Stack)

Auto-replies to incoming WhatsApp messages using Meta Cloud API + Google Gemini + Upstash Redis.
Runs on Render/Railway free tier.

## Architecture
WhatsApp message → Meta Cloud API webhook → Express server
  → Upstash Redis (fetch conversation history)
  → Google Gemini API (generate reply)
  → Upstash Redis (save updated history)
  → Meta Cloud API (send reply back to user)
## 1. Prerequisites

- Node.js 18+ installed
- VSCode installed
- A Meta (Facebook) developer account
- A Google account (for Gemini API)
- An Upstash account (for Redis)

## 2. Get your API keys

### A. Meta WhatsApp Cloud API (free tier: 1,000 conversations/month)
1. Go to https://developers.facebook.com and create an app → select **Business** type.
2. Add the **WhatsApp** product to your app.
3. Under WhatsApp → API Setup, you'll find:
   - A **temporary access token** (valid 24 hrs — for testing only)
   - Your **Phone Number ID**
   - A test recipient number you can message immediately
4. For a permanent token: go to Business Settings → System Users → create a system user → generate a **permanent token** with `whatsapp_business_messaging` permission.
5. Choose your random string as `WHATSAPP_VERIFY_TOKEN` (you'll enter this same string in Meta's webhook setup later — it's just a shared secret to confirm the webhook is really coming from Meta).

### B. Google Gemini API (free tier)
1. Go to https://aistudio.google.com/apikey
2. Sign in and click **Create API key**.
3. Copy the key — this is your `GEMINI_API_KEY`.

### C. Upstash Redis (free tier)
1. Go to https://console.upstash.com and sign up.
2. Create a new Redis database (choose a region close to your backend host).
3. In the database details page, copy the **REST URL** and **REST Token** — these are `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## 3. Run the project locally in VSCode

1. Open this folder in VSCode.
2. Copy `.env.example` to `.env` and fill in all the values you collected above:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm run dev
   ```
   You should see `Server running on port 3000`.

## 4. Expose your local server for webhook testing (development only)

Meta needs a public HTTPS URL to send webhooks to. Use ngrok for local testing:

1. Install ngrok: https://ngrok.com/download
2. Run:
   ```
   ngrok http 3000
   ```
3. Copy the `https://xxxx.ngrok-free.app` URL it gives you.
   
## 5. Configure the webhook in Meta

1. In your Meta App → WhatsApp → Configuration → Webhook.
2. Callback URL: `https://xxxx.ngrok-free.app/webhook` (or your deployed URL + `/webhook`)
3. Verify Token: the same string you set as `WHATSAPP_VERIFY_TOKEN` in `.env`.
4. Click **Verify and Save** (this triggers the GET request your server already handles).
5. Subscribe to the **messages** field under Webhook Fields.

## 6. Test it

Send a WhatsApp message to your test number from the number Meta added as a tester.
You should see logs in your terminal, and receive an auto-reply back on WhatsApp within a few seconds.

## 7. Deploy for free (so it runs without your laptop/ngrok)

### Using Render (recommended, simplest)
1. Push this project to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect your repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all variables from `.env` under Render's **Environment** tab.
6. Once deployed, copy your Render URL (e.g., `https://your-app.onrender.com`) and update the webhook Callback URL in Meta to `https://your-app.onrender.com/webhook`.

### Using Railway (alternative)
Same steps as Render — connect repo, set env vars, deploy, update webhook URL.

**Note:** Free tiers on Render/Railway may "sleep" after inactivity, causing a delay (10-30 sec) on the first message after idle time. This is expected on free tier.

## 8. Free-tier limits to watch

| Service | Free limit |
|---|---|
| Meta Cloud API | 1,000 conversations/month (resets monthly) |
| Google Gemini (Flash) | Generous free requests/day, but rate-limited per minute |
| Upstash Redis | 10,000 commands/day on free tier |
| Render/Railway | Free web service sleeps after ~15 min inactivity |

If you outgrow these, the only paid step usually needed first is Meta's Cloud API conversations beyond 1,000/month — everything else has headroom for personal-scale use.

## 9. Customizing behavior

Edit the `SYSTEM_INSTRUCTIONS` string in `src/services/gemini.js` to change tone, add business-specific rules (e.g., "if asked about pricing, say X"), or restrict what topics it replies to.
