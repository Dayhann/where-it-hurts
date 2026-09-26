create table if not exists public.sessions (
  id text primary key,
  status text not null,
  starts_at timestamptz not null,
  red_flag boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_status_idx on public.sessions (status);
create index if not exists sessions_starts_at_idx on public.sessions (starts_at);
create index if not exists sessions_queue_idx on public.sessions (red_flag desc, starts_at);

alter table public.sessions enable row level security;
