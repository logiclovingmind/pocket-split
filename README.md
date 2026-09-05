# Pocket Split

Split shared expenses with a group, offline.

A local-first PWA: every action writes to IndexedDB immediately and syncs to Supabase
when a connection exists. The UI never waits on the network, and the app stays fully
usable on a phone with no signal.

## Why it's built this way

Expense splitting happens in exactly the situations where connectivity is worst — a
restaurant basement, a trip abroad, a rented house in the hills. An app that needs the
network to record a ₹400 auto fare is useless at the moment you need it.

So the network is treated as an optimisation, not a requirement:

- **Dexie / IndexedDB** is the source of truth for the running session. Writes land
  locally and render instantly.
- **An offline queue** holds mutations that haven't reached the server yet and drains
  them when connectivity returns.
- **Supabase realtime** pushes other members' changes into the local store as they
  happen, so an open session stays current without polling.
- **Conflict resolution is last-write-wins.** Deliberate: for a shared expense list the
  cost of a rare overwrite is far lower than the cost of asking non-technical users to
  resolve a merge. The alternative — CRDTs — was not worth the complexity here.

## Features

- Multiple groups, each with its own members and currency
- Ten expense categories
- Per-member colour coding
- Room-code joining, no account required
- Installable to the home screen, with safe-area handling for notched devices

## Stack

React 19 · Vite · Tailwind · Dexie (IndexedDB) · Supabase (Postgres + realtime) · Vercel

## Running it

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and anon key
npm run dev
```

## Layout

```
src/
  components/   RoomGate, GroupsScreen, GroupView, ExpenseForm, MemberPicker
  lib/          db (Dexie schema + migrations), sync (queue + realtime),
                room, group, format, supabase
```
