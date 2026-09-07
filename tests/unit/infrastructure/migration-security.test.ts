import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL(
    '../../../supabase/migrations/0001_auth_family_people_profiles.sql',
    import.meta.url,
  ),
  'utf8',
)

const tables = [
  'families',
  'family_accounts',
  'people',
  'medical_profiles',
  'medical_profile_items',
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
  })
})
