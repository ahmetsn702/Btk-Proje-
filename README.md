# BTK Market — Gamified E-Commerce + DeFi Platform

A hackathon project combining e-commerce with DeFi mechanics and gamification. Users complete tasks to earn category-based points (CP), swap them for a universal currency (XP) on-chain via an AMM, and spend XP as discounts at checkout. Point values shift automatically based on supply, demand, and stock dynamics.

## Overview

BTK Market is built around a closed reward loop: **complete tasks → earn CP → swap CP for XP → spend XP for discounts**. Each product category has its own CP/XP liquidity pool, and an off-chain pricing engine continuously adjusts conversion rates using market and stock signals.

## Key Features

- **Task system** — Users earn category-specific Credit Points (CP) by completing tasks (reviews, surveys, quizzes, referrals, social shares)
- **AMM-based swap** — CP is converted to universal XP through per-category liquidity pools with slippage protection and price-impact warnings
- **Dynamic pricing** — Conversion rates respond to CP supply, swap demand, product stock, and market volume
- **Surge mechanics** — When supply runs low, CP rewards temporarily multiply (2x/3x) for the affected category
- **XP discounts at checkout** — Earned XP is applied as a real discount, server-validated, with a configurable per-user CP usage limit (7%–15%)
- **Seller accounts** — Users can register as sellers, list products, and manage incoming orders with a full status lifecycle
- **AI product descriptions** — Sellers generate product copy via Gemini 2.5 Flash
- **Order tracking** — Buyers follow a 4-step shipping tracker; sellers approve and advance order status
- **Web3 wallet** — Wallet connection via WalletConnect / RainbowKit for on-chain rewards

## Tech Stack

**Frontend**

- Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Zustand (state), React Hook Form + Zod (forms), Axios with JWT interceptor
- Wagmi + RainbowKit (Web3), lightweight-charts

**Backend**

- NestJS + TypeScript, Prisma 7, PostgreSQL, Redis
- JWT access (15 min) + refresh (7 days), argon2 hashing
- ThrottlerGuard, role-based access control (USER / SELLER / ADMIN)

**Blockchain & Algorithm** (separate workstream)

- Solidity + Hardhat, OpenZeppelin
- ERC-1155 CP token, ERC-20 XP token (UUPS upgradeable)
- Exchange AMM contract, TaskRewardManager
- Off-chain pricing engine + blockchain event listener
- Target networks: Polygon / Arbitrum

## Architecture

```
/
├── frontend/        Next.js app (UI, Web3 wallet UI)
├── backend/         NestJS API (auth, products, cart, orders, AI)
├── database/        Prisma schema, migrations, seed
├── contracts/       Solidity smart contracts
├── algorithm/       Dynamic pricing engine
├── listener/        Blockchain event listener
├── bridge/          Web3 ↔ Web2 sync bridge
└── shared/          Shared API contracts
```

## Prerequisites

- Node.js 20+
- pnpm
- Docker (PostgreSQL + Redis)
- A Gemini API key (for AI product descriptions)

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/ahmetsn702/Btk-Proje-.git
cd Btk-Proje-
```

### 2. Environment variables

Create `database/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btk_proje?schema=public"
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btk_proje"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
REDIS_URL="redis://localhost:6379"
PORT=3001
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Start database and Redis

```bash
docker compose up -d
```

### 4. Run migrations and seed

```bash
cd database
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the backend (port 3001)

```bash
cd backend
pnpm install
pnpm run start:dev
```

### 6. Start the frontend (port 3000)

```bash
cd frontend
pnpm install
pnpm run dev
```

The app is now available at `http://localhost:3000`.

> **Note (Windows / PowerShell):** PowerShell does not support `&&` as a command separator. Run each command on its own line.

## Core API Endpoints

**Auth**

- `POST /auth/register` (accepts optional `role`: `USER` | `SELLER`)
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

**Catalog & Cart**

- `GET /products`, `GET /products/:id`, `POST /products`
- `GET /categories`, `GET /categories/:id/products`
- `GET/POST/PATCH/DELETE /cart/items`

**Orders**

- `POST /orders/checkout`, `GET /orders`, `GET /orders/:id`
- `PATCH /orders/:id/status` (seller order lifecycle)

**Tasks & AI**

- `GET /tasks`, `POST /tasks/:id/complete`
- `POST /ai/generate-description` (Gemini-powered)

**Internal** (consumed by the pricing engine, protected by `x-internal-key`)

- `GET /internal/stock/:categoryId`
- `GET /internal/market-volume/:categoryId`

## Concepts

| Term                    | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| **CP (Category Point)** | Category-specific points. No direct cross-category conversion.               |
| **XP (Extended Point)** | Universal unit. All CP value is measured in XP; spent as checkout discounts. |
| **AMM**                 | Pool-based pricing; each category has its own CP/XP pool.                    |
| **Surge**               | Temporary 2x/3x CP reward boost when category supply is low.                 |
| **Slippage Tolerance**  | Max acceptable price movement on a swap (0.5%/1%/2%/5%).                     |
| **Price Impact**        | Pool imbalance from large swaps; a warning is shown above 30%.               |

## Pricing Formula

```
price = (xpPool / cpPool) × marketDemandFactor × stockScarcityFactor × incentiveFactor
```

## License

Built for the BTK Hackathon 2026.
