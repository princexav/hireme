-- supabase/migrations/002_seen_jobs.sql

create table seen_jobs (
  user_id  uuid references auth.users(id) on delete cascade,
  job_url  text not null,
  seen_at  timestamptz not null default now(),
  primary key (user_id, job_url)
);

-- Index for the 30-day TTL query: WHERE user_id = $1 AND seen_at > $2
create index seen_jobs_user_id_seen_at_idx on seen_jobs (user_id, seen_at);

alter table seen_jobs enable row level security;

create policy "own seen_jobs" on seen_jobs
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
