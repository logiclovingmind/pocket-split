# CLAUDE.md — Pocket Split (PWA)

## What this is
A **Splitwise-style expense splitter** PWA. As of 2026-07-15 it was pivoted from its
original design (a two-person UPI pool ledger) into a full multi-group splitter.
A "room" (secret link) is a whole space that holds many **groups**. Each group has its
own **members** and **currency**. Members log **expenses** — who paid (one or more payers)
and how the cost is split among participants (equal / exact amounts / percentages / shares).
The app computes each member's **net balance**, simplifies "who owes whom" across the group,
and records **settle-up** payments.

> The original pool-ledger sections below were replaced by this pivot. Any remaining
> references to "the pool", "topup/spend", or "two users only" are historical.

## Users & devices
- **Any number of members per group**, named freely. "Who am I" is chosen per group and
  stored in `localStorage` (`ps_me:<groupId>`), used only for attribution/highlighting.
- **Devices**: iPhone (Safari) + MacBook (any browser), over the open internet.
- **Must be a PWA**: installable to iPhone home screen, works offline, syncs when online.

## Auth model — "shared secret link" (deliberately simple)
- No login screen, no passwords, no Supabase Auth.
- Access is via a secret room id embedded in the URL, e.g. `?room=<long-random-string>`.
- On first load, the app asks once: **"Who are you? [zEi] [Yasir]"** and stores the
  choice in `localStorage` (key: `ledger_identity`). This is the attribution, not security.
- Anyone with the link can read/write. Acceptable for two family members. Do not post the URL.
- Keep the Supabase anon key in the client (normal for Supabase). Lock down with RLS scoped
  to the `room` value so a leaked key can't read other rooms.

## Core data model

Two synced tables (schema in `supabase/003-splitwise.sql`). Both carry `room` for RLS.

### `groups`
| field | type | notes |
|-------|------|-------|
| id | uuid | client-generated |
| room | text | secret space id; RLS filters on it |
| name | text | group name |
| members | jsonb | `[{ id, name, color }]` |
| currency | text | ISO code, per group (INR default) |
| updated_at / deleted | | for sync + soft delete |

### `expenses`
| field | type | notes |
|-------|------|-------|
| id | uuid | client-generated |
| room / group_id | text/uuid | space + owning group |
| description, amount, currency, category | | the expense |
| type | text | `'expense'` \| `'settle'` |
| paid_by | jsonb | `[{ member, amount }]` — supports multiple payers |
| split | jsonb | `[{ member, amount }]` — **precomputed owed amounts** |
| split_mode | text | `equal` \| `exact` \| `percent` \| `shares` |
| split_meta | jsonb | raw inputs (%/shares/exact) so edit reopens correctly |
| happened_at / updated_at / deleted | | |

### Math (compute in the client, don't store) — see `src/lib/`
- **`split.js`** turns a mode + inputs into exact per-person owed amounts (integer paise, exact sum).
- **`balances.js`** nets each member (paid − owed), then greedy **debt simplification** for who-owes-whom.
- A `settle` expense is a payment: `paid_by` = payer, `split` = receiver.

## Offline + sync strategy
- **Local store**: IndexedDB (use a tiny wrapper like `idb`, or Dexie).
- **Write path**: every create/edit writes to IndexedDB first (instant UI), then queues a
  Supabase upsert. If offline, it stays queued and flushes on reconnect.
- **Sync**: on load and on reconnect, pull all rows for `room` where `updated_at` >
  last-synced cursor; upsert into IndexedDB. Use Supabase Realtime channel on `entries`
  filtered by `room` for live updates when both are online.
- **Conflict rule**: last-write-wins on `updated_at`. Two people editing the *same* entry
  at the same second is near-impossible here, so don't over-engineer CRDTs.
- **Deletes**: soft delete only (`deleted = true`), so a delete syncs like any other edit.

## Tech stack (keep it boring)
- **React + Vite** PWA. `vite-plugin-pwa` for service worker + manifest + install prompt.
- **Supabase JS client** (`@supabase/supabase-js`) for db + realtime.
- **Dexie** (or `idb`) for IndexedDB.
- **Tailwind** for styling.
- No login libs, no state-management library — React state + a couple of hooks is enough.

## Supabase setup (do this first)
1. Create a Supabase project. Note the URL + anon key → put in `.env` as
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Create the `entries` table matching the schema above.
3. Enable Row Level Security. Policy: allow select/insert/update where
   `room = current_setting or matches the room passed by the client`. Since there's no auth,
   scope RLS by requiring the `room` value on every query (client always filters by room).
   At minimum, ensure one room's data is never returned without its room id.
4. Enable Realtime on the `entries` table.
5. Add an index on `(room, updated_at)` and `(room, happened_at)`.

## UI — this is the point of the app (zEi wants UI, not a spreadsheet)
Premium-minimal, dark, aligned to zEi's taste. Dark-navy background (#0b0c16), neon
pink→violet→cyan gradient accents matching the app icon (zEi's own design, source at
scripts/icon-source.png), lots of whitespace, big readable numbers. Fonts: Sora (headings), Martian Mono (numbers),
Oxanium optional for the pool-balance hero.

### Screens
1. **Home / Dashboard**
   - Hero card: **UPI Pool Balance** — big number, amber, updates live.
   - Secondary stats row: Total spent · zEi spent · Yasir spent · Cash out.
   - A "+ Add entry" floating button.
   - Recent entries list below (date, who, method chip, note, amount). Cash vs UPI shown
     with a small colored chip. Tap an entry to edit/delete.
2. **Add entry (sheet/modal)**
   - Toggle: **Top-up** / **Spend**.
   - Toggle: **Cash** / **UPI**.
   - Who: defaults to *me* (the stored identity), can switch.
   - Amount (big numeric keypad-friendly input), note, category, date (defaults now).
   - Save = instant, works offline.
3. **History**
   - Full filterable list: by person, by method, by date range.
   - Running pool balance shown alongside.
   - Simple month grouping.

### UX rules
- Everything one-thumb reachable on iPhone. MacBook just gets a wider layout.
- Offline indicator: a small dot — green (synced) / amber (queued, offline).
- Never block the UI on the network. Optimistic updates always.
- Amounts in ₹, Indian number formatting (₹1,20,000).

## Build order (for Claude Code)
1. Scaffold Vite React PWA + Tailwind + `vite-plugin-pwa`. Confirm it installs on iPhone.
2. Set up Supabase client + `.env`. Create table + RLS + realtime in Supabase dashboard.
3. Dexie schema mirroring `entries`. Write the local-first write + read layer.
4. Sync engine: pull-on-load, realtime subscribe, offline queue + flush on reconnect.
5. Identity picker (zEi/Yasir) + room-id from URL.
6. Dashboard with derived pool balance + stats.
7. Add-entry sheet.
8. History + filters.
9. Polish: offline indicator, ₹ formatting, empty states, install prompt.

## Explicit non-goals (do NOT build these)
- No real auth / password flows. Access stays via the secret room link.
- No LAN server. No native iOS app. Web PWA only.
- No charts, receipt OCR, comments, or recurring expenses in this pass — see `TODO.md`.
- No cross-currency FX conversion; currency is fixed per group.

## Guardrail for Claude Code
Ship v1 = the list above and nothing more. If a "nice to have" appears (charts, budgets,
recurring entries, exports), note it in a `TODO` and keep moving. The goal is a working
synced ledger both devices trust — not a finance suite.
