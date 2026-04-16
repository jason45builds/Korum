# Korum Project Structure

This repository follows a lightweight monorepo layout:

- `apps/web`: Next.js application and API routes
- `packages/types`: shared domain types
- `packages/utils`: shared utility helpers
- `packages/config`: shared environment helpers
- `supabase/migrations`: PostgreSQL schema, enums, triggers, and functions
- `supabase/seeds`: sample development data
- `docs`: implementation notes

## Web App Breakdown

- `app`: App Router pages and serverless API routes
- `components`: reusable UI and domain-specific presentation components
- `hooks`: auth, match, invite, payment, and realtime hooks
- `services/api`: typed fetch wrappers for the serverless routes
- `services/core`: business rules shared by UI and backend
- `services/supabase`: Supabase clients for browser and server code
- `store`: Zustand client state
- `lib`: constants, helpers, validators

## Data Boundaries

- Business rules stay in `services/core`
- Input validation stays in `lib/validators`
- Route handlers orchestrate auth, validation, and persistence
- UI components stay display-focused and avoid domain mutations directly
