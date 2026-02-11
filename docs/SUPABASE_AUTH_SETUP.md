# Supabase Auth Setup Guide

This guide walks you through configuring Supabase Auth for ContentDeck v3.0.

## Prerequisites

- A Supabase project (free tier works)
- The `sql/setup.sql` schema already applied

## 1. Enable Auth Providers

Go to your Supabase Dashboard > Authentication > Providers.

### Magic Link (Email)

Enabled by default. No configuration needed.

Optionally customize the email template at Authentication > Email Templates.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret
7. In Supabase Dashboard > Auth > Providers > Google:
   - Toggle ON
   - Paste Client ID and Client Secret
   - Save

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Homepage URL to your app URL (e.g., `https://contentdeck.vercel.app`)
4. Set Authorization callback URL to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard > Auth > Providers > GitHub:
   - Toggle ON
   - Paste Client ID and Client Secret
   - Save

## 2. Configure Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://contentdeck.vercel.app` (your production URL)
- **Redirect URLs**: Add all environments:
  - `https://contentdeck.vercel.app`
  - `http://localhost:5173` (local dev)

## 3. Environment Variables

### Local Development

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find these in Supabase Dashboard > Settings > API.

### Vercel Deployment

In your Vercel project settings > Environment Variables, add:

- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key

Redeploy after adding the variables.

## 4. Verify

1. Open the app — you should see the AuthScreen with "Try Demo", email input, and OAuth buttons
2. Click "Try Demo" — demo mode should work as before
3. Enter your email and click "Send Magic Link" — check your email for the link
4. Click a magic link — you should be redirected to the dashboard
5. Try Google/GitHub sign in — should redirect and log you in
6. Sign out — should return to AuthScreen

## 5. Edge Function Deployment

The `save-bookmark` edge function enables the bookmarklet and iOS Shortcut to save bookmarks using a personal API token.

### Deploy the edge function

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy save-bookmark
```

The function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which are automatically available in the edge function environment.

### Apply the user_tokens migration

Run `sql/migrations/002_add_user_tokens.sql` in the Supabase SQL Editor.

### Generate a token

1. Open Settings in the app
2. Under "API Tokens", click "Generate API Token"
3. Copy the token (it's only shown once)
4. Use the bookmarklet or iOS Shortcut setup instructions shown after generation

## Troubleshooting

### OAuth redirect fails
- Verify the redirect URL in your OAuth provider matches exactly: `https://<ref>.supabase.co/auth/v1/callback`
- Check that your app URL is in the Supabase redirect URLs whitelist

### Magic link not received
- Check spam folder
- Verify email rate limits in Supabase (default: 4 emails/hour per address)
- Check Authentication > Logs in Supabase Dashboard

### "Missing VITE_SUPABASE_URL" error
- Ensure `.env.local` exists with both variables set
- Restart the dev server after adding env vars (Vite doesn't hot-reload env changes)
