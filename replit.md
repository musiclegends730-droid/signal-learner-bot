# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## QuantumTrade AI - Signal Learner Bot

A multi-user AI-powered trading signal application.

### Features
- **16 Technical Indicators**: RSI, MACD, Bollinger Bands, EMA (8/21), Stochastic, Price Action, ATR, Williams %R, CCI, ADX (Wilder's smoothing), OBV, Parabolic SAR, ROC, MFI, Donchian Channel, Ichimoku
- **Per-User ML Engine**: Each user has their own indicator weight table that updates on WIN/LOSS feedback via gradient nudging
- **Multi-User Auth**: Custom JWT (HMAC-SHA256 via Node crypto), bcryptjs password hashing; first registered user becomes admin
- **Admin Panel**: View all users, delete non-admin users
- **Cyberpunk UI**: Bloomberg terminal dark theme with electric cyan (#00FFFF) accents, monospace typography

### Architecture
- `artifacts/api-server` — Express 5 REST API (`@workspace/api-server`)
- `artifacts/signal-learner` — React + Vite frontend (`@workspace/signal-learner`)
- `lib/db` — Drizzle ORM schema + migrations (`@workspace/db`)
- `lib/api-spec` — OpenAPI spec source of truth (`@workspace/api-spec`)
- `lib/api-client` — Generated Axios API client (`@workspace/api-client`)
- `lib/api-client-react` — Generated React Query hooks (`@workspace/api-client-react`)

### Database Schema
- `users` — id, username, passwordHash, role (user|admin), createdAt
- `signals` — id, userId (FK), asset, action (BUY|SELL|NEUTRAL), price, confidence, result (PENDING|WIN|LOSS), indicators (JSONB), timeframe, createdAt
- `indicator_weights` — id, userId (FK), name, weight, correctPredictions, totalPredictions, updatedAt

### API Routes
- `POST /api/auth/register` — Register new user (first user = admin)
- `POST /api/auth/login` — Login; returns JWT
- `GET /api/auth/me` — Get current user
- `POST /api/signals/generate` — Generate signal with 16 indicators
- `GET /api/signals` — List user's signals
- `GET /api/signals/stats` — User's win/loss stats
- `GET /api/signals/weights` — User's ML indicator weights
- `PATCH /api/signals/:id/result` — Update signal outcome (WIN/LOSS)
- `GET /api/admin/users` — Admin: list all users
- `DELETE /api/admin/users/:id` — Admin: delete a user

### Auth Details
- Token stored in `localStorage` as `slb_token`
- Custom JWT: `header.payload.signature` (HMAC-SHA256)
- Admin guard: `requireAdmin` middleware checks `req.user.role === 'admin'`
- Forex pairs: slash removed, `=X` appended (e.g. `EUR/USD` → `EURUSD=X`)
- Market data: Yahoo Finance v8 chart API
