-- Medical events module (spec §8). Forward migration.
-- Timeline event table with RLS and tenant constraints, plus the atomic
-- episode + auto-event compound functions (M002 decision D2).

create table public.medical_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null,
  episode_id uuid,
  type text not null check (type in ('note', 'measurement', 'lab_report', 'visit', 'prescription', 'document', 'episode_start', 'episode_end')),
  occurred_at timestamptz not null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 5000),
  source text not null check (source in ('manual', 'import')),
  author_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, family_id),
  foreign key (person_id, family_id) references public.people(id, family_id) on delete cascade,
  foreign key (episode_id, family_id) references public.episodes(id, family_id) on delete set null
);
create index medical_events_person_occurred_idx on public.medical_events(person_id, family_id, occurred_at desc);
create index medical_events_episode_idx on public.medical_events(episode_id, family_id);

alter table public.medical_events enable row level security;
alter table public.medical_events force row level security;

create policy medical_events_member on public.medical_events for all
  using (exists(select 1 from public.family_accounts fa where fa.family_id=medical_events.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=medical_events.family_id and fa.account_id=auth.uid()));

-- Atomic "episode + auto timeline event" compound operations. Runs as the
-- authenticated user (security invoker) so RLS applies; explicit
-- family/person checks provide the application-layer ownership guarantee.
-- create_episode mirrors the create path of 0002 upsert_episode and inserts
-- the episode_start event (occurred_at = started_at) in the same statement
-- block/transaction (M002 decision D2). 0002 is intentionally unchanged.
create function public.create_episode(p_family_id uuid,p_person_id uuid,p_episode jsonb,p_author_id uuid) returns public.episodes language plpgsql security invoker set search_path='' as $$
declare
  v_episode public.episodes;
  v_names text[];
begin
  if not exists(select 1 from public.people pe where pe.id=p_person_id and pe.family_id=p_family_id) then
    raise exception 'not found' using errcode='P0002';
  end if;

  insert into public.episodes(family_id, person_id, title, description, status, started_at, ended_at, outcome)
  values(p_family_id, p_person_id, p_episode->>'title', p_episode->>'description', 'active', p_episode->>'startedAt', p_episode->>'endedAt', p_episode->>'outcome')
  returning * into v_episode;

  insert into public.episode_symptoms(episode_id, family_id, name, description)
  select v_episode.id, p_family_id, x->>'name', x->>'description'
  from jsonb_array_elements(coalesce(p_episode->'symptoms','[]'::jsonb)) x
  where char_length(btrim(x->>'name')) between 1 and 200;

  select array_agg(btrim(t)) into v_names
  from jsonb_array_elements_text(coalesce(p_episode->'tags','[]'::jsonb)) t
  where char_length(t) between 1 and 100;

  if array_length(v_names, 1) is not null then
    insert into public.tags(family_id, name)
    select p_family_id, unnest(v_names)
    on conflict(name, family_id) do nothing;
    insert into public.episode_tags(episode_id, tag_id, family_id)
    select v_episode.id, t.id, p_family_id
    from public.tags t
    where t.family_id=p_family_id and t.name = any(v_names);
  end if;

  insert into public.medical_events(family_id, person_id, episode_id, type, occurred_at, title, description, source, author_id)
  values(p_family_id, p_person_id, v_episode.id, 'episode_start', v_episode.started_at, v_episode.title, v_episode.description, 'manual', p_author_id);

  return v_episode;
end $$;
revoke execute on function public.create_episode(uuid,uuid,jsonb,uuid) from public;
grant execute on function public.create_episode(uuid,uuid,jsonb,uuid) to authenticated;

-- Completes an active episode and inserts the episode_end event
-- (occurred_at = ended_at) atomically. Reopening a completed episode
-- (status update) intentionally creates no events and stays on the plain
-- RLS update path. Manually editing episode dates does not rewrite existing
-- auto-event moments.
create function public.complete_episode(p_family_id uuid,p_person_id uuid,p_episode_id uuid,p_ended_at timestamptz,p_outcome text,p_author_id uuid) returns public.episodes language plpgsql security invoker set search_path='' as $$
declare
  v_episode public.episodes;
begin
  select * into v_episode from public.episodes
  where id=p_episode_id and family_id=p_family_id and person_id=p_person_id
  for update;
  if not found then
    raise exception 'not found' using errcode='P0002';
  end if;

  if v_episode.status <> 'active' then
    raise exception 'invalid state' using errcode='22023';
  end if;

  update public.episodes
  set status='completed', ended_at=p_ended_at, outcome=coalesce(p_outcome, outcome), updated_at=now()
  where id=p_episode_id and family_id=p_family_id and person_id=p_person_id
  returning * into v_episode;

  insert into public.medical_events(family_id, person_id, episode_id, type, occurred_at, title, description, source, author_id)
  values(p_family_id, p_person_id, p_episode_id, 'episode_end', p_ended_at, v_episode.title, v_episode.outcome, 'manual', p_author_id);

  return v_episode;
end $$;
revoke execute on function public.complete_episode(uuid,uuid,uuid,timestamptz,text,uuid) from public;
grant execute on function public.complete_episode(uuid,uuid,uuid,timestamptz,text,uuid) to authenticated;
