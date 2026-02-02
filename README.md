# Impostor vs Crew (MVP)

Voice-first social game inspired by Among Us, built to play while talking in an X Space.

## Features

- Lobby with room code and optional password.
- Roles: Impostor and Crew (default 1 impostor).
- Phases: discussion, voting, reveal, win condition.
- Realtime with PartyKit (authoritative server).
- Spanish UI, mobile-first.

## Stack

- Frontend: Next.js + TypeScript
- Realtime: PartyKit (WebSocket + room storage)
- Game engine: pure functions in `packages/game`
- Validation: zod on the server

## Repo structure

```text
/apps
  /web        Next.js
  /party      PartyKit server
/packages
  /game       Pure game engine
  /shared     Types and validators
/docs
```

## Requirements

- Node 18+
- pnpm

## Install

```bash
pnpm install
```

## Environment variables

Frontend (`apps/web`):

- `NEXT_PUBLIC_PARTYKIT_HOST=http://localhost:1999`

Server (`apps/party`):

- `ROOM_PASSWORD_SALT=local_salt`
- `PARTYKIT_API_KEY=...` (deploy only)

## Local development (2 processes)

```bash
pnpm -C apps/party dev
pnpm -C apps/web dev
```

The frontend will be at `http://localhost:3000` (or 3001 if busy).

## Useful scripts

From the repo root:

```bash
pnpm dev
pnpm test
```

Tests:

```bash
pnpm -C packages/game test
pnpm -C apps/party test
```

Simulate N players (PartyKit):

```bash
PARTY_HOST=ws://localhost:1999 ROOM_CODE=TEST1 PLAYER_COUNT=6 pnpm -C apps/party ts-node scripts/simulate.ts
```

## Deploy

Frontend (Vercel):

```bash
vercel --prod
```

PartyKit:

```bash
pnpm -C apps/party deploy
```

## Notes

- The server is the source of truth.
- No real auth: `clientId` is stored in localStorage.
- Session persistence only (PartyKit storage can reset).
