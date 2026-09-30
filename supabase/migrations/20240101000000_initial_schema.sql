-- ─────────────────────────────────────────────────────────────────────────────
-- analyses table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  input_type      text not null check (input_type in ('zip', 'github')),
  input_ref       text not null,
  status          text not null default 'pending' check (status in ('pending', 'done', 'error')),
  report          jsonb,
  context_summary text,
  created_at      timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists analyses_user_id_idx on public.analyses(user_id);

-- Row-Level Security
alter table public.analyses enable row level security;

create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- chat_messages table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

-- Index for fast per-analysis queries ordered by time
create index if not exists chat_messages_analysis_id_idx on public.chat_messages(analysis_id, created_at);

-- Row-Level Security (access via parent analyses row ownership)
alter table public.chat_messages enable row level security;

create policy "Users can view their own chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = chat_messages.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.analyses
      where analyses.id = chat_messages.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

create policy "Users can delete their own chat messages"
  on public.chat_messages for delete
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = chat_messages.analysis_id
        and analyses.user_id = auth.uid()
    )
  );
