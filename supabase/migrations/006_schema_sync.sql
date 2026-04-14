-- 006_schema_sync.sql
-- Documents columns that were added directly to the live DB outside of migration files.
-- Uses ADD COLUMN IF NOT EXISTS throughout so this is safe to apply to the live DB
-- (columns already exist there) and will correctly build the schema from scratch in
-- any new environment (staging, local, restored DB).

-- jobs: columns added after the initial migration
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS location    text,
  ADD COLUMN IF NOT EXISTS salary_min  integer,
  ADD COLUMN IF NOT EXISTS salary_max  integer,
  ADD COLUMN IF NOT EXISTS applied_at  timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at   timestamptz;

-- resumes: ATS scoring columns + changes log
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS ats_keywords       text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_ats_score integer,
  ADD COLUMN IF NOT EXISTS tailored_ats_score integer,
  ADD COLUMN IF NOT EXISTS changes            text[]  NOT NULL DEFAULT '{}';
