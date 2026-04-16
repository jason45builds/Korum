# Korum Architecture

## Product Boundary

Korum covers the coordination window before a match starts:

- team membership
- match creation
- availability collection
- RSVP and join flow
- payment confirmation
- squad locking

It intentionally excludes gameplay, scoring, and statistics.

## Backend Shape

The backend uses Next.js route handlers and Supabase PostgreSQL. Route handlers authenticate the caller with a Supabase access token, validate payloads with Zod, and perform writes through a service-role Supabase client. Database functions and triggers enforce slot and lifecycle rules close to the data.

## Match Lifecycle

`DRAFT -> RSVP_OPEN -> PAYMENT_PENDING -> LOCKED -> READY`

- `DRAFT`: match exists but is not collecting responses
- `RSVP_OPEN`: players can RSVP or accept invites
- `PAYMENT_PENDING`: the captain expects payments and slot holds are allowed
- `LOCKED`: captain freezes the paid squad
- `READY`: captain has completed readiness checks

## Slot Safety

There are two protections against overbooking:

1. Application code only creates payment holds when capacity is available.
2. Database routines confirm a paid participant atomically and reject overflow cases by marking the payment for refund review.

## Realtime

Supabase subscriptions update the UI when:

- a participant joins or changes status
- a payment is confirmed or fails
- the match state changes

## Payments

Razorpay orders are created server-side. The client opens the hosted checkout with the returned order details. The webhook route verifies signatures and finalizes payment state in the database. Repeated webhook deliveries are safe because confirmation writes are idempotent.
