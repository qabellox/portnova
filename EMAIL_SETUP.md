# 📧 PortNova — Free Custom Email Notifications (autonomous)

Emails go out automatically — zero manual steps after this one-time setup.

- **Provider** gets an email when someone applies to their job.
- **Applicant** gets an email when their status changes (Accepted / Rejected).

## How it works (fully autonomous)

```
applications INSERT  ──►  Database Webhook  ──►  Edge Function `notify`  ──►  Resend  ──►  provider's email
applications UPDATE  ──►  Database Webhook  ──►  Edge Function `notify`  ──►  Resend  ──►  applicant's email
```

Nothing polls, nothing manual. Every new application or status change fires the email instantly.

---

## Step 1 — Free email provider (pick one; Resend recommended)

| Provider | Free tier | Notes |
|---|---|---|
| **Resend** (recommended) | 3,000/mo · 100/day | Best DX, official SDK |
| Brevo (Sendinblue) | 300/day | |
| SendGrid | 100/day | |
| Mailgun | 100/day | |

1. Create a free account at **resend.com** → **API Keys** → create a key → it looks like `re_...`.
2. **Custom "from" address (optional, needs your own domain):** Resend → **Domains** → add your domain (e.g. `mail.yourdomain.com`) → add the DNS records it shows (SPF / DKIM / DMARC) in your domain registrar → wait for verification. Then `EMAIL_FROM` can be `PortNova <no-reply@yourdomain.com>`.
   - *Without a verified domain*: use the default `PortNova <onboarding@resend.dev>` (Resend free can only email the account owner's address until you verify a domain — fine for testing).

## Step 2 — Set the function secrets (your secrets, never share them)

```bash
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>   # e.g. ogbfuauerayanuyphoen
npx supabase secrets set \
  RESEND_API_KEY="re_..." \
  WEBHOOK_SECRET="<any long random string>" \
  EMAIL_FROM="PortNova <onboarding@resend.dev>"
```

> `WEBHOOK_SECRET` is just a random string you choose (e.g. `openssl rand -hex 24`) — it authenticates the webhook call so only your database can trigger emails.

## Step 3 — Deploy the Edge Function

```bash
npx supabase functions deploy notify --no-verify-jwt
```

(If you haven't used Supabase CLI before: `npm i -g supabase` or run via `npx supabase`.)

## Step 4 — Enable the Database Webhooks (2 webhooks)

Supabase dashboard → **Database → Webhooks → Create a new webhook** — create **two**:

| Webhook | Table | Event | URL |
|---|---|---|---|
| `new-application-email` | `applications` | **Insert** | `https://<YOUR_REF>.functions.supabase.co/notify` |
| `status-change-email` | `applications` | **Update** | `https://<YOUR_REF>.functions.supabase.co/notify` |

For **both**, under *HTTP Headers* add:
```
Authorization: Bearer <WEBHOOK_SECRET>
```
(Use the same secret you set in Step 2. The `notify` function returns 401 without it.)

## Step 5 — Test

1. Apply to a job as a seeker → the **provider** gets "📬 New application…".
2. Accept/Reject in the studio → the **seeker** gets "🎉 accepted" / "Update on your application".

## Troubleshooting

- **No email in inbox** → check Resend → *Emails* log; and if using `onboarding@resend.dev`, make sure the recipient is the Resend account owner's email.
- **Webhook 401** → the `Authorization: Bearer <secret>` header doesn't match the `WEBHOOK_SECRET` env var.
- **Function 500** → open Supabase → **Edge Functions → notify → Logs**.
