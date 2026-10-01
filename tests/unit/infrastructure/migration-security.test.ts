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
  'measurement_types',
  'measurements',
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
    expect(migration).toContain(
      'fa.family_id=measurement_types.family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'fa.family_id=measurements.family_id and fa.account_id=auth.uid()',
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
    expect(migration).toMatch(
      /public\.create_measurement\([\s\S]*security definer set search_path=''/,
    )
    expect(migration).toMatch(
      /public\.update_measurement\([\s\S]*security definer set search_path=''/,
    )
    expect(migration).toMatch(
      /public\.delete_measurement\([\s\S]*security definer set search_path=''/,
    )
    expect(migration).toContain(
      'create role app_measurement_writer nologin noinherit nobypassrls',
    )
    for (const signature of [
      'create_measurement(uuid,uuid,jsonb)',
      'update_measurement(uuid,uuid,uuid,jsonb)',
      'delete_measurement(uuid,uuid,uuid)',
    ]) {
      expect(migration).toContain(
        `revoke execute on function public.${signature} from public`,
      )
      expect(migration).toContain(
        `grant execute on function public.${signature} to authenticated`,
      )
    }
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

// M003: types and measurements (spec §§10–11).
describe('measurement migration contract', () => {
  it('keeps type and measurement ownership inside one family/person', () => {
    expect(migration).toContain(
      'foreign key (measurement_type_id, family_id) references public.measurement_types(id, family_id) on delete restrict',
    )
    expect(migration).toContain(
      'foreign key (episode_id, family_id, person_id) references public.episodes(id, family_id, person_id) on delete set null (episode_id)',
    )
    expect(migration).toContain(
      'foreign key (person_id, family_id) references public.people(id, family_id) on delete cascade',
    )
  })

  it('constrains type fields, active duplicates and allowed units', () => {
    expect(migration).toContain(
      "value_type text not null check (value_type in ('number', 'text', 'boolean', 'compound', 'image'))",
    )
    expect(migration).toContain(
      "status text not null default 'active' check (status in ('active', 'archived'))",
    )
    expect(migration).toContain(
      'check (public.measurement_units_valid(allowed_units))',
    )
    expect(migration).toContain(
      "create unique index measurement_types_active_name_unit_uidx on public.measurement_types(family_id, lower(btrim(name)), coalesce(unit, '')) where status='active'",
    )
    expect(migration).toContain(
      'create policy measurement_types_read on public.measurement_types for select',
    )
    expect(migration).toContain(
      'create policy measurement_types_update on public.measurement_types for update',
    )
    expect(migration).toContain('not measurement_types.is_preset')
    expect(migration).not.toContain('create policy measurement_types_delete')
  })

  it('stores exactly one bounded value and UTC instants', () => {
    expect(migration).toContain(
      'num_nonnulls(numeric_value, text_value, boolean_value, compound_value) = 1',
    )
    expect(migration).toContain('occurred_at timestamptz not null')
    expect(migration).toContain(
      'comment text check (comment is null or char_length(comment) <= 1000)',
    )
    expect(migration).toContain(
      'text_value text check (text_value is null or char_length(text_value) between 1 and 2000)',
    )
  })

  it('allows measurement writes only through RLS-bound atomic RPCs', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on public.measurements from anon, authenticated',
    )
    expect(migration).toContain(
      'alter function public.create_measurement(uuid,uuid,jsonb) owner to app_measurement_writer',
    )
    expect(migration).toContain(
      'where fa.family_id=p_family_id and fa.account_id=auth.uid()',
    )
    expect(migration).toContain(
      'v_occurred_at, left(v_type.name, 120), v_description, v_source, auth.uid()',
    )
    expect(migration).not.toContain(
      'p_author_id uuid\n) returns public.measurements',
    )
    expect(migration).toContain("current_user <> 'app_measurement_writer'")
  })

  it('keeps existing values compatible when a type is already in use', () => {
    expect(migration).toContain(
      'create trigger protect_used_measurement_type_value_type',
    )
    expect(migration).toContain(
      "raise exception 'measurement type is in use' using errcode='P1001'",
    )
  })

  it('links one measurement event through subject_id', () => {
    expect(migration).toContain(
      'alter table public.medical_events add column subject_id uuid',
    )
    expect(migration).toContain(
      'create unique index medical_events_subject_uidx on public.medical_events(family_id, type, subject_id) where subject_id is not null',
    )
    expect(migration).toMatch(
      /public\.create_measurement\([\s\S]*insert into public\.measurements[\s\S]*insert into public\.medical_events/,
    )
    expect(migration).toMatch(
      /public\.update_measurement\([\s\S]*update public\.measurements[\s\S]*update public\.medical_events/,
    )
    expect(migration).toMatch(
      /public\.delete_measurement\([\s\S]*delete from public\.medical_events[\s\S]*delete from public\.measurements/,
    )
  })

  it('seeds all six canonical presets for existing and new families', () => {
    for (const name of [
      'Температура',
      'Вес',
      'Рост',
      'Артериальное давление',
      'Пульс',
      'Сатурация',
    ]) {
      expect(migration).toContain(`'${name}'`)
    }
    expect(migration).toContain("'Предустановленные показатели'")
    expect(migration).toMatch(
      /create or replace function public\.setup_family\([\s\S]*insert into public\.measurement_types/,
    )
  })
})
