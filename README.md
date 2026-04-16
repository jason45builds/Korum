# Korum

Korum is a production-ready, mobile-first sports match readiness platform built with Next.js, Supabase, Razorpay, and Zustand. It helps captains create matches, invite players, confirm availability, collect payments, and lock squads before kickoff.

## Core Flow

1. Captains create a team and a match.
2. Players RSVP or join from a shared link.
3. Active participants reserve a payment window.
4. Razorpay webhook confirms paid slots.
5. Captains lock the squad and move the match to ready status.

The product intentionally stops at match readiness. It does not include live scoring, stats, or post-match workflows.

## Stack

- Next.js App Router with TypeScript
- Supabase PostgreSQL, Auth OTP, and Realtime
- Razorpay order + webhook integration
- Zustand for lightweight client state

## Scripts

Run these from the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
```

`npm install` from the repo root automatically installs `apps/web` using its local lockfile.

## Environment

Populate `.env` with:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

## Database

Apply the SQL files in `supabase/migrations` in ascending order, then optionally load `supabase/seeds/seed.sql`.

## Architecture Notes

- Match lifecycle is enforced as `DRAFT -> RSVP_OPEN -> PAYMENT_PENDING -> LOCKED -> READY`.
- Slot protection happens in the database and in payment finalization routines.
- Payment webhooks are idempotent and can safely handle retries.
