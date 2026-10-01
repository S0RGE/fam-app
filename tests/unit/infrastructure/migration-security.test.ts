import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '../../../supabase/migrations')
const migration = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
  .join('\n')

const tables = [
  'families',
  'family_accounts',
  'people',
  'medical_profiles',
  'medical_profile_items',
  'episodes',
  'episode_symptoms',
  'tags',
  'episode_tags',
  'medical_events',
]

describe('auth/family migration security contract', () => {
  it('enables and forces RLS on every family-data table', () => {
    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      )
      expect(migration).toContain(
        `alter table public.${table} force row level security`,
      )
    }
  })

  it('derives policies from auth.uid and scopes nested data by family', () => {
    expect(migration).toContain('account_id=auth.uid()')
    expect(migration).toContain(
      'fa.family_id=people.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=medical_profiles.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=medical_profile_items.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=episodes.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=episode_symptoms.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=tags.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=episode_tags.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=medical_events.family_id and fa.account_id=auth.uid()',
    )
  })

  it('hardens callable functions and grants only authenticated execution', () => {
    expect(migration).toMatch(
      /public\.setup_family\([\s\S]*security definer set search_path=''/,
    )
    expect(migration).toContain(
      'revoke all on function public.setup_family(text) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.setup_family(text) to authenticated',
    )
    expect(migration).toContain(
      'revoke execute on function public.put_medical_profile(uuid,uuid,jsonb) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.put_medical_profile(uuid,uuid,jsonb) to authenticated',
    )
    expect(migration).toMatch(
      /public\.upsert_episode\([\s\S]*security invoker set search_path=''/,
    )
    expect(migration).toContain(
      'revoke execute on function public.upsert_episode(uuid,uuid,jsonb) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.upsert_episode(uuid,uuid,jsonb) to authenticated',
    )
    expect(migration).toMatch(
      /public\.create_episode\([\s\S]*security invoker set search_path=''/,
    )
    expect(migration).toContain(
      'revoke execute on function public.create_episode(uuid,uuid,jsonb,uuid) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.create_episode(uuid,uuid,jsonb,uuid) to authenticated',
    )
    expect(migration).toMatch(
      /public\.complete_episode\([\s\S]*security invoker set search_path=''/,
    )
    expect(migration).toContain(
      'revoke execute on function public.complete_episode(uuid,uuid,uuid,timestamptz,text,uuid) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.complete_episode(uuid,uuid,uuid,timestamptz,text,uuid) to authenticated',
    )
  })
})

describe('medical_events migration contract', () => {
  it('declares the tenant identity and composite ownership constraints', () => {
    expect(migration).toContain(
      'foreign key (person_id, family_id) references public.people(id, family_id) on delete cascade',
    )
    expect(migration).toContain(
      'foreign key (episode_id, family_id) references public.episodes(id, family_id) on delete set null',
    )
    expect(migration).toMatch(
      /medical_events\s*\([\s\S]*?unique\(id, family_id\)/,
    )
  })

  it('constrains type, source and text fields (spec §8, M002 D5)', () => {
    expect(migration).toContain(
      "type text not null check (type in ('note', 'measurement', 'lab_report', 'visit', 'prescription', 'document', 'episode_start', 'episode_end'))",
    )
    expect(migration).toContain(
      "source text not null check (source in ('manual', 'import'))",
    )
    expect(migration).toContain(
      'title text not null check (char_length(title) between 1 and 120)',
    )
    expect(migration).toContain(
      'description text check (description is null or char_length(description) <= 5000)',
    )
  })

  it('stores UTC instants and a mandatory author account', () => {
    expect(migration).toContain('occurred_at timestamptz not null')
    expect(migration).toContain('author_id uuid not null')
    expect(migration).toContain('created_at timestamptz not null default now()')
    expect(migration).toContain('updated_at timestamptz not null default now()')
  })

  it('indexes the timeline and the episode linkage', () => {
    expect(migration).toContain(
      'create index medical_events_person_occurred_idx on public.medical_events(person_id, family_id, occurred_at desc)',
    )
    expect(migration).toContain(
      'create index medical_events_episode_idx on public.medical_events(episode_id, family_id)',
    )
  })

  it('emits the auto episode events with the episode author (M002 D2)', () => {
    expect(migration).toContain(
      "values(p_family_id, p_person_id, v_episode.id, 'episode_start', v_episode.started_at, v_episode.title, v_episode.description, 'manual', p_author_id)",
    )
    expect(migration).toContain(
      "values(p_family_id, p_person_id, p_episode_id, 'episode_end', p_ended_at, v_episode.title, v_episode.outcome, 'manual', p_author_id)",
    )
  })

  it('locks the episode row while completing to keep episode_end single', () => {
    expect(migration).toMatch(
      /public\.complete_episode\([\s\S]*for update;[\s\S]*end \$\$;?/,
    )
  })

  it('persists symptoms and tags in create_episode, mirroring 0002 (DATA-003)', () => {
    const match = migration.match(/public\.create_episode\([\s\S]*?end \$\$;/)
    expect(match).not.toBeNull()
    const body = match![0]
    expect(body).toContain(
      'insert into public.episode_symptoms(episode_id, family_id, name, description)',
    )
    expect(body).toContain(
      "jsonb_array_elements(coalesce(p_episode->'symptoms','[]'::jsonb))",
    )
    expect(body).toContain(
      "where char_length(btrim(x->>'name')) between 1 and 200",
    )
    expect(body).toContain(
      "jsonb_array_elements_text(coalesce(p_episode->'tags','[]'::jsonb))",
    )
    expect(body).toContain('on conflict(name, family_id) do nothing')
    expect(body).toContain(
      'insert into public.episode_tags(episode_id, tag_id, family_id)',
    )
    expect(body).toContain('t.family_id=p_family_id and t.name = any(v_names)')
  })
})
