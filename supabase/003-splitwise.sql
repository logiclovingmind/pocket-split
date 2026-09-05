-- Pocket Split v2 — Splitwise-style model. Run once in the Supabase SQL editor.
-- A "room" (secret link) is a whole space that can hold many groups.

-- Old pool-ledger table is no longer used. Keep it or drop it:
-- drop table if exists public.entries;

create table if not exists public.groups (
  id uuid primary key,
  room text not null,
  name text not null default '',
  members jsonb not null default '[]',   -- [{ id, name, color }]
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.expenses (
  id uuid primary key,
  room text not null,
  group_id uuid not null,
  description text not null default '',
  amount numeric not null check (amount >= 0),
  currency text not null default 'INR',
  category text not null default '',
  type text not null default 'expense' check (type in ('expense', 'settle')),
  paid_by jsonb not null default '[]',   -- [{ member, amount }]
  split jsonb not null default '[]',     -- [{ member, amount }]  (owed, precomputed)
  split_mode text not null default 'equal',
  split_meta jsonb not null default '{}',-- raw inputs so edit reopens correctly
  note text not null default '',
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists groups_room_updated_at on public.groups (room, updated_at);
create index if not exists expenses_room_updated_at on public.expenses (room, updated_at);
create index if not exists expenses_group_happened_at on public.expenses (group_id, happened_at);

alter table public.groups enable row level security;
alter table public.expenses enable row level security;

-- Same room-scoped pattern as v1: the client sends its room id in an `x-room`
-- header (set in supabase.js). Reads stay open (rooms are long random strings and
-- Realtime can't see custom headers); writes require the header to match the row.
create policy "read groups" on public.groups for select using (true);
create policy "insert groups" on public.groups for insert with check (
  room = (current_setting('request.headers', true)::json ->> 'x-room'));
create policy "update groups" on public.groups for update using (
  room = (current_setting('request.headers', true)::json ->> 'x-room'));

create policy "read expenses" on public.expenses for select using (true);
create policy "insert expenses" on public.expenses for insert with check (
  room = (current_setting('request.headers', true)::json ->> 'x-room'));
create policy "update expenses" on public.expenses for update using (
  room = (current_setting('request.headers', true)::json ->> 'x-room'));

alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.expenses;
