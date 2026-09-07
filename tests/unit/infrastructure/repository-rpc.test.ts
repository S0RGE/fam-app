import { describe, expect, it } from 'vitest'
import { SupabaseFamilyRepository } from '../../../infrastructure/supabase/family-repository'
import { SupabaseMedicalProfileRepository } from '../../../infrastructure/supabase/medical-profile-repository'
describe('Supabase RPC contracts', () => {
  it('uses exposed RPC names', async () => {
    const calls: unknown[][] = []
    const family = new SupabaseFamilyRepository({
      rpc: async (...a: unknown[]) => {
        calls.push(a)
        return {
          data: { id: 'f', name: 'N', created_at: 'c', updated_at: 'u' },
          error: null,
        }
      },
    })
    await family.setup('a', 'N')
    const chain = {
      eq: () => chain,
      maybeSingle: async () => ({
        data: {
          id: 'p',
          family_id: 'f',
          person_id: 'x',
          medical_profile_items: [],
        },
        error: null,
      }),
    }
    const profile = new SupabaseMedicalProfileRepository({
      rpc: async (...a: unknown[]) => {
        calls.push(a)
        return { error: null }
      },
      from: () => ({ select: () => chain }),
    })
    await profile.put('f', 'x', { items: [] })
    expect(calls).toEqual([
      ['setup_family', { p_name: 'N' }],
      [
        'put_medical_profile',
        { p_family_id: 'f', p_person_id: 'x', p_profile: { items: [] } },
      ],
    ])
  })
})
