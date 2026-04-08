-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles: one per user, stores resume + preferences
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
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
  match_score int not null default 0,
  match_reasons text[] not null default '{}',
  status text not null default 'saved'
    check (status in ('saved','queued','applied','interview','offer','rejected')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

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

create policy "own profile" on profiles for all using (auth.uid() = user_id);
create policy "own jobs" on jobs for all using (auth.uid() = user_id);
create policy "own resumes" on resumes for all using (auth.uid() = user_id);
