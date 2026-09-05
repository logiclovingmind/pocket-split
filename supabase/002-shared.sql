-- Adds per-entry Shared/Personal flag and the 'settle' entry type.
alter table public.entries add column if not exists shared boolean not null default true;
alter table public.entries drop constraint if exists entries_type_check;
alter table public.entries add constraint entries_type_check
  check (type in ('topup', 'spend', 'settle'));
