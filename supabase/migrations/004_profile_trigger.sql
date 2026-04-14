-- Fix 2: Auto-create an empty profile row when a new user signs up.
-- Without this, new users get a 406 on every page load until they complete onboarding,
-- and the dashboard layout double-fires a profile check that always 404s.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, raw_resume_text, extracted_skills, preferences)
  values (new.id, '', '{}', '{}')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Drop if exists so this migration is safe to re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
