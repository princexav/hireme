-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles: one per user, stores resume + preferences
-- user_id is the PK (no surrogate key needed — one profile per user)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  raw_resume_text text not null default '',
  extracted_skills text[] not null default '{}',
  preferences jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Jobs: each job the user has seen/saved
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  company text not null,
  url text not null,
  jd_text text not null default '',
  match_score int not null default 0 check (match_score between 0 and 100),
  match_reasons text[] not null default '{}',
  status text not null default 'saved'
    check (status in ('saved','queued','applied','interview','offer','rejected')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Index on jobs.user_id for fast per-user queries
create index jobs_user_id_idx on jobs (user_id);

-- Resumes: tailored resume per job
create table resumes (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  tailored_text text not null,
  pdf_url text,
  created_at timestamptz not null default now()
);

-- Row-level security: users only see their own data
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table resumes enable row level security;

create policy "own profile" on profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own jobs" on jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own resumes" on resumes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
