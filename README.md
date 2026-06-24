# VoiceGift

Production-oriented Next.js application for creating an original personal song with a user’s verified voice.

The repository runs in two modes:

- `APP_MODE=mock`: no external accounts are required; creation, verification, generation, payment, and downloads are simulated.
- `APP_MODE=live`: Supabase, PayPal, Turnstile, OpenAI, email, and a media-provider bridge are required.

The product deliberately does **not** accept an uploaded commercial song. It creates original music to avoid building the business around unauthorized cover-song processing.

## Included

- Responsive marketing site and four-step creation flow
- Browser microphone recording and audio file upload
- Short-lived signed voice-verification challenge
- Supabase private Storage uploads and expiring download links
- OpenAI Responses API lyrics generation
- Replaceable asynchronous music, voice-conversion, and lyric-video adapter
- Idempotent PayPal Orders v2 create/capture flow
- PayPal webhook signature verification
- Provider callback processing and stage persistence
- Free preview and paid full-song state machine
- Private project access tokens encrypted at rest
- Explicit public-share toggle with revocable share URLs
- One revision request per paid project
- Immediate user deletion and daily retention cleanup
- Supabase Auth protected admin dashboard
- Turnstile abuse protection and database-backed rate limiting
- Legal/safety page templates
- Mock mode for full local testing

## Architecture

```text
Browser
  ├─ Next.js UI on Vercel
  ├─ direct signed upload → Supabase private Storage
  └─ PayPal JS SDK

Next.js Route Handlers
  ├─ Supabase Postgres (orders, jobs, audit, revision queue)
  ├─ PayPal Orders API + verified webhook
  ├─ OpenAI Responses API (lyrics)
  ├─ media-provider bridge (music → voice → video)
  ├─ Resend email
  └─ Turnstile verification
```

Media generation is asynchronous. Provider callbacks advance a persisted state machine, so a user can close the browser without losing the job.

## Local setup

Requirements: Node.js 24 and npm/pnpm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

The defaults run in mock mode at `http://localhost:3000`.

Run all checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and execute:

   `supabase/migrations/202606220001_voicegift.sql`

3. Confirm the private `voicegift-private` bucket exists.
4. Configure Supabase Auth email magic links.
5. Add the site URL and `/auth/callback` to Auth redirect URLs.
6. Put the URL, publishable key, and secret key in Vercel environment variables.

Use the new Supabase publishable/secret keys when available. The secret key is server-only.

## PayPal setup

1. Create a PayPal Developer application.
2. Start with sandbox credentials.
3. Add a webhook pointing to:

   `https://YOUR_DOMAIN/api/webhooks/paypal`

4. Subscribe at minimum to:

   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`

5. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
6. Set the client ID as `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
7. Set the client secret only as `PAYPAL_CLIENT_SECRET`.

The server validates project reference, amount, currency, capture status, and webhook signature. Never unlock a song from a client-side callback alone.

## Media provider bridge contract

VoiceGift is intentionally vendor-neutral. Configure a small bridge that normalizes the selected music and voice vendors. All three create endpoints receive an idempotency key and return:

```json
{ "jobId": "provider-job-123" }
```

### `POST MEDIA_PROVIDER_MUSIC_PATH`

Receives:

```json
{
  "externalId": "generation-uuid",
  "projectId": "project-uuid",
  "kind": "preview",
  "stage": "music",
  "callbackUrl": "https://.../api/webhooks/provider?secret=...",
  "durationSeconds": 15,
  "lyrics": "[Verse]...",
  "style": "warm_pop",
  "recipientName": "Emma",
  "safety": {
    "verifiedSelfVoice": true,
    "prohibitArtistImitation": true,
    "originalCompositionOnly": true
  }
}
```

The output should be an original guide-vocal song or a provider-supported input suitable for voice conversion.

### `POST MEDIA_PROVIDER_VOICE_PATH`

Also receives:

```json
{
  "sourceUrl": "expiring signed guide-vocal URL",
  "voiceUrl": "expiring signed verified voice URL"
}
```

The output should be the final MP3 with the user’s permitted voice.

### `POST MEDIA_PROVIDER_VIDEO_PATH`

Receives the final song URL and lyrics. The output should be a vertical MP4.

### `POST MEDIA_PROVIDER_VERIFY_PATH`

Receives:

```json
{
  "audioUrl": "expiring signed voice sample URL",
  "expectedPhrase": "I am creating this VoiceGift...",
  "checks": ["speech_match", "liveness", "single_speaker", "audio_quality"]
}
```

Returns:

```json
{ "verified": true, "confidence": 0.97 }
```

### Provider callback

The bridge calls `callbackUrl` with:

```json
{
  "projectId": "project-uuid",
  "kind": "preview",
  "stage": "music",
  "providerJobId": "provider-job-123",
  "status": "succeeded",
  "outputUrl": "https://temporary-provider-output"
}
```

On failure:

```json
{
  "projectId": "project-uuid",
  "kind": "preview",
  "stage": "music",
  "providerJobId": "provider-job-123",
  "status": "failed",
  "error": "Provider-safe error message"
}
```

Before launch, strengthen callback authentication to HMAC signatures if the selected bridge supports custom callback headers. The query secret is provided as a compatibility baseline.

## Deployment to Vercel

Recommended workflow:

1. Create a private GitHub repository.
2. Push the `voicegift` directory as the repository root.
3. Import the repository into Vercel.
4. Add environment variables to Development, Preview, and Production scopes.
5. Deploy with `APP_MODE=mock` first.
6. Verify the complete flow.
7. Configure Supabase and PayPal sandbox.
8. Switch to `APP_MODE=live` only after every live variable is present.
9. Test sandbox payment, webhooks, generation callbacks, deletion, and cleanup.
10. Promote the tested preview deployment to production.

Vercel automatically invokes the daily cleanup cron declared in `vercel.json`. Set `CRON_SECRET`; Vercel sends it as a bearer token.

## Required production variables

See `.env.example`. Secrets must be entered in Vercel, never committed to GitHub and never prefixed with `NEXT_PUBLIC_`.

Public browser variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Server secrets:

- `SUPABASE_SECRET_KEY`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `OPENAI_API_KEY`
- `MEDIA_PROVIDER_API_KEY`
- `RESEND_API_KEY`
- encryption, access-token, webhook, and cron secrets

## Launch blockers that code cannot solve

Before accepting real payments:

- Select media providers whose terms explicitly permit commercial output and user-consented voice conversion.
- Execute data-processing agreements where needed.
- Review privacy, terms, refund policy, and voice consent with counsel.
- Confirm PayPal merchant availability, settlement, tax, and digital-goods requirements for the operating entity.
- Add a support/privacy email and company identity.
- Run abuse tests for third-party voices, celebrities, minors, copyrighted lyrics, and living-artist imitation.
- Verify output quality across genders, accents, languages, noise levels, and vocal ranges.

## Operational behavior

- User projects are private and accessed through a 256-bit opaque token.
- Only a SHA-256 token hash and AES-GCM encrypted recovery copy are stored.
- Share links are disabled by default.
- Source and output files use private storage and short-lived signed URLs.
- Rate limiting is atomic in Postgres.
- Payment and generation callbacks are idempotent.
- Generation claiming is atomic to prevent duplicate jobs.
- Failed jobs appear in the admin retry queue.
- Expired projects are anonymized after assets are deleted.

