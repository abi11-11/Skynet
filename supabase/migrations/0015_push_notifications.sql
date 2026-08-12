-- Migration: 0015_push_notifications.sql

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, expo_push_token)
);

alter table public.user_push_tokens enable row level security;
alter table public.user_push_tokens force row level security;

create policy manage_own_push_tokens on public.user_push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.trigger_critical_risk_push()
returns trigger as $$
declare
  req_id bigint;
begin
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := json_build_object(
      'source', 'pg_net',
      'trigger', 'critical_risk_inserted',
      'record', row_to_json(new)
    )::jsonb
  ) into req_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_critical_risk_score on public.plot_risk_scores;
create trigger on_critical_risk_score
  after insert on public.plot_risk_scores
  for each row
  when (new.risk_level = 'critical')
  execute function public.trigger_critical_risk_push();
