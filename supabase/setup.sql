-- Pocket Split — run this once in the Supabase SQL editor.

create table if not exists public.entries (
  id uuid primary key,
  room text not null,
  type text not null check (type in ('topup', 'spend', 'settle')),
  method text not null check (method in ('cash', 'upi')),
  actor text not null check (actor in ('zei', 'yasir')),
  amount numeric not null check (amount > 0),
  note text not null default '',
  category text not null default '',
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  shared boolean not null default true
);

create index if not exists entries_room_updated_at on public.entries (room, updated_at);
create index if not exists entries_room_happened_at on public.entries (room, happened_at);

alter table public.entries enable row level security;

-- The client sends its room id in an `x-room` header (set in supabase.js).
-- Writes are only allowed when the row's room matches that header, so a
-- leaked anon key can't write into another room without knowing its id.
-- Select stays open (rooms are long random strings) because Supabase
-- Realtime can't see custom headers when evaluating policies.
create policy "read entries" on public.entries
  for select using (true);

create policy "insert own room" on public.entries
  for insert with check (
    room = (current_setting('request.headers', true)::json ->> 'x-room')
  );

create policy "update own room" on public.entries
  for update using (
    room = (current_setting('request.headers', true)::json ->> 'x-room')
  );

-- Realtime
alter publication supabase_realtime add table public.entries;
