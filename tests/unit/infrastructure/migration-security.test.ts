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
  })
})
