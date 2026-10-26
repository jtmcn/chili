import { describe, expect, it } from 'vitest'
import { canAdvance, fromChili, toPayload, wizardReducer, type WizardState } from '@/lib/wizard'

const init: WizardState = { step: 1, name: '', cook: '', description: '', allergens: [], noAllergens: false }

describe('wizard', () => {
  it('back keeps name', () => {
    let s = wizardReducer(init, { type: 'set', field: 'name', value: 'Ab' })
    s = wizardReducer(s, { type: 'next' })
    s = wizardReducer(s, { type: 'back' })
    expect(s.step).toBe(1)
    expect(s.name).toBe('Ab')
  })

  it('requires a 2+ char name and a cook on step 1', () => {
    expect(canAdvance({ ...init, name: 'A', cook: 'Jo' })).toBe(false)
    expect(canAdvance({ ...init, name: 'Ab', cook: '  ' })).toBe(false)
    expect(canAdvance({ ...init, name: 'Ab', cook: 'Jo' })).toBe(true)
  })

  it('requires an allergen choice on step 3', () => {
    expect(canAdvance({ ...init, step: 3 })).toBe(false)
    expect(canAdvance(wizardReducer({ ...init, step: 3 }, { type: 'toggleAllergen', id: 'milk' }))).toBe(true)
  })

  it('toggleNone clears allergens and blocks toggleAllergen', () => {
    let s = wizardReducer({ ...init, step: 3 }, { type: 'toggleAllergen', id: 'milk' })
    s = wizardReducer(s, { type: 'toggleNone' })
    expect(s.allergens).toEqual([])
    expect(s.noAllergens).toBe(true)
    expect(wizardReducer(s, { type: 'toggleAllergen', id: 'soy' }).allergens).toEqual([])
    expect(canAdvance(s)).toBe(true)
  })

  it('builds the payload', () => {
    const s = { ...init, name: 'Hot', cook: ' Jo ', allergens: ['milk'] }
    expect(toPayload(s, 'd1')).toEqual({ deviceId: 'd1', name: 'Hot', cook: 'Jo', allergens: ['milk'] })
    expect(toPayload({ ...s, allergens: [], noAllergens: true, description: 'x' }, 'd1')).toEqual({
      deviceId: 'd1',
      name: 'Hot',
      cook: 'Jo',
      description: 'x',
      noAllergens: true,
    })
  })

  it('reopens a saved chili on review, treating no allergens as an explicit answer', () => {
    const c = { id: 'c1', potNumber: 1, name: 'Hot', cook: 'Jo', description: null, allergenIds: [], photoPath: null }
    expect(fromChili(c)).toEqual({ step: 4, name: 'Hot', cook: 'Jo', description: '', allergens: [], noAllergens: true })
    expect(fromChili({ ...c, allergenIds: ['soy'] })).toMatchObject({ allergens: ['soy'], noAllergens: false })
  })
})
