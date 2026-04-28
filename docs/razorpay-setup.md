# Razorpay Setup Guide — Korum

## 1. Create a Razorpay account
Go to https://dashboard.razorpay.com → sign up → complete KYC for live mode.
For testing use Test mode — no KYC needed.

## 2. Get your API keys
Dashboard → Settings → API Keys → Generate Key

Copy:
- Key ID      → `RAZORPAY_KEY_ID`
- Key Secret  → `RAZORPAY_KEY_SECRET`

## 3. Set up webhook
Dashboard → Settings → Webhooks → Add new webhook

- URL: `https://korum.vercel.app/api/payments/webhook`
- Events to select:
  - ✅ `payment.captured`
  - ✅ `payment.failed`
  - ✅ `refund.processed`
- Generate a webhook secret → copy it → `RAZORPAY_WEBHOOK_SECRET`

## 4. Add to Vercel environment variables
Vercel dashboard → your project → Settings → Environment Variables

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
```

For local dev add to `apps/web/.env.local` (never commit this file).

## 5. Test mode keys (for development)
Use `rzp_test_` prefixed keys during development.
Test card: 4111 1111 1111 1111, any future expiry, any CVV.
Test UPI: success@razorpay

## 6. Platform fee model
Korum charges 2% on every match fee collected through Razorpay.
This is added ON TOP of the match fee — players pay (matchFee × 1.02).

Example:
- Captain sets ₹250/player
- Player pays ₹255 (₹250 + ₹5 platform fee)
- Korum earns ₹5 per player
- 11 players × ₹5 = ₹55 per match

Razorpay also charges ~2% — absorbed in the gross amount.
Net to Korum after Razorpay fees: ~₹0–3 per player (small but scales).

## 7. Manual UPI fallback
If Razorpay keys are not configured, the app automatically falls back to:
- Showing the captain's UPI ID to the player
- Player pays directly via their UPI app
- Player taps "I Have Paid" → notifies captain
- Captain reviews and confirms in the captain panel
- No platform fee collected in manual mode

## 8. Revenue tracking
After running migration 021_payment_hardening.sql:

```sql
-- Monthly revenue
select * from public.korum_revenue;

-- Per-captain breakdown  
select * from public.captain_payment_summary;
```

## 9. Refund flow (future)
To issue a refund via Razorpay API:
```
POST https://api.razorpay.com/v1/payments/{payment_id}/refund
{ "amount": amount_in_paise }
```
Update payment row: status = 'REFUNDED', refunded_at = now(), refund_id = razorpay_refund_id
