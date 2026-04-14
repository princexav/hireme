-- Fix 1: Add 'suggested' to the jobs status check constraint
-- The pipeline inserts jobs with status='suggested' but the original constraint omitted it.

DO $$
DECLARE
  c text;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'jobs'
    AND tc.constraint_schema = 'public'
    AND cc.check_clause LIKE '%status%';

  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.jobs DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('suggested','saved','queued','applied','interview','offer','rejected'));

-- Also update the column default to match the pipeline's default incoming status
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'suggested';
