-- Episodes module (spec §9). Forward migration.
-- Episodes, their symptoms and family-shared tags with RLS and tenant constraints.

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 5000),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null,
  ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  outcome text check (outcome is null or char_length(outcome) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, family_id),
  foreign key (person_id, family_id) references public.people(id, family_id) on delete cascade
);
create index episodes_person_created_idx on public.episodes(person_id, created_at, id);

create table public.episode_symptoms (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  episode_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (episode_id, family_id) references public.episodes(id, family_id) on delete cascade
);
create index episode_symptoms_episode_idx on public.episode_symptoms(episode_id, family_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, family_id)
);

create table public.episode_tags (
  episode_id uuid not null,
  tag_id uuid not null,
  family_id uuid not null references public.families(id) on delete cascade,
  primary key (episode_id, tag_id),
  foreign key (episode_id, family_id) references public.episodes(id, family_id) on delete cascade,
  foreign key (tag_id, family_id) references public.tags(id, family_id) on delete cascade
);

alter table public.episodes enable row level security;
alter table public.episodes force row level security;
alter table public.episode_symptoms enable row level security;
alter table public.episode_symptoms force row level security;
alter table public.tags enable row level security;
alter table public.tags force row level security;
alter table public.episode_tags enable row level security;
alter table public.episode_tags force row level security;

create policy episodes_member on public.episodes for all
  using (exists(select 1 from public.family_accounts fa where fa.family_id=episodes.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=episodes.family_id and fa.account_id=auth.uid()));
create policy episode_symptoms_member on public.episode_symptoms for all
  using (exists(select 1 from public.family_accounts fa where fa.family_id=episode_symptoms.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=episode_symptoms.family_id and fa.account_id=auth.uid()));
create policy tags_member on public.tags for all
  using (exists(select 1 from public.family_accounts fa where fa.family_id=tags.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=tags.family_id and fa.account_id=auth.uid()));
create policy episode_tags_member on public.episode_tags for all
  using (exists(select 1 from public.family_accounts fa where fa.family_id=episode_tags.family_id and fa.account_id=auth.uid()))
  with check (exists(select 1 from public.family_accounts fa where fa.family_id=episode_tags.family_id and fa.account_id=auth.uid()));

-- Atomic compound upsert of an episode with its symptoms and tags. Runs as the
-- authenticated user (security invoker) so RLS applies; explicit family/person
-- checks provide the application-layer ownership guarantee.
create function public.upsert_episode(p_family_id uuid,p_person_id uuid,p_episode jsonb) returns public.episodes language plpgsql security invoker set search_path='' as $$
declare
  v_id uuid := p_episode->>'id';
  v_status text := coalesce(p_episode->>'status', 'active');
  v_episode public.episodes;
  v_names text[];
begin
  if not exists(select 1 from public.people pe where pe.id=p_person_id and pe.family_id=p_family_id) then
    raise exception 'not found' using errcode='P0002';
  end if;

  if v_id is not null and v_id <> '' then
    if not exists(select 1 from public.episodes e where e.id=v_id and e.family_id=p_family_id and e.person_id=p_person_id) then
      raise exception 'not found' using errcode='P0002';
    end if;
    insert into public.episodes(id, family_id, person_id, title, description, status, started_at, ended_at, outcome)
    values(v_id, p_family_id, p_person_id, p_episode->>'title', p_episode->>'description', v_status, p_episode->>'startedAt', p_episode->>'endedAt', p_episode->>'outcome')
    on conflict(id, family_id) do update set title=excluded.title, description=excluded.description, status=excluded.status, started_at=excluded.started_at, ended_at=excluded.ended_at, outcome=excluded.outcome, updated_at=now();
  else
    insert into public.episodes(family_id, person_id, title, description, status, started_at, ended_at, outcome)
    values(p_family_id, p_person_id, p_episode->>'title', p_episode->>'description', v_status, p_episode->>'startedAt', p_episode->>'endedAt', p_episode->>'outcome')
    returning * into v_episode;
    v_id := v_episode.id;
  end if;

  delete from public.episode_symptoms where episode_id=v_id and family_id=p_family_id;
  insert into public.episode_symptoms(episode_id, family_id, name, description)
  select v_id, p_family_id, x->>'name', x->>'description'
  from jsonb_array_elements(coalesce(p_episode->'symptoms','[]'::jsonb)) x
  where char_length(btrim(x->>'name')) between 1 and 200;

  select array_agg(btrim(t)) into v_names
  from jsonb_array_elements_text(coalesce(p_episode->'tags','[]'::jsonb)) t
  where char_length(t) between 1 and 100;

  delete from public.episode_tags where episode_id=v_id and family_id=p_family_id;
  if array_length(v_names, 1) is not null then
    insert into public.tags(family_id, name)
    select p_family_id, unnest(v_names)
    on conflict(name, family_id) do nothing;
    insert into public.episode_tags(episode_id, tag_id, family_id)
    select v_id, t.id, p_family_id
    from public.tags t
    where t.family_id=p_family_id and t.name = any(v_names);
  end if;

  select * into v_episode from public.episodes where id=v_id and family_id=p_family_id;
  return v_episode;
end $$;
revoke execute on function public.upsert_episode(uuid,uuid,jsonb) from public;
grant execute on function public.upsert_episode(uuid,uuid,jsonb) to authenticated;
