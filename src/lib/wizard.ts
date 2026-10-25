export type Step = 1 | 2 | 3 | 4

export interface WizardState {
  step: Step
  name: string
  cook: string
  description: string
  allergens: string[]
  noAllergens: boolean
}

export type TextField = 'name' | 'cook' | 'description'

export type WizardAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: Step }
  | { type: 'set'; field: TextField; value: string }
  | { type: 'toggleAllergen'; id: string }
  | { type: 'toggleNone' }
  | { type: 'load'; state: WizardState }

export const initialWizard: WizardState = {
  step: 1,
  name: '',
  cook: '',
  description: '',
  allergens: [],
  noAllergens: false,
}

export function wizardReducer(s: WizardState, a: WizardAction): WizardState {
  switch (a.type) {
    case 'next':
      return { ...s, step: Math.min(4, s.step + 1) as Step }
    case 'back':
      return { ...s, step: Math.max(1, s.step - 1) as Step }
    case 'goto':
      return { ...s, step: a.step }
    case 'set':
      return { ...s, [a.field]: a.value }
    case 'toggleAllergen':
      if (s.noAllergens) return s
      return {
        ...s,
        allergens: s.allergens.includes(a.id) ? s.allergens.filter((x) => x !== a.id) : [...s.allergens, a.id],
      }
    case 'toggleNone':
      return { ...s, noAllergens: !s.noAllergens, allergens: [] }
    case 'load':
      return a.state
  }
}

export function canAdvance(s: WizardState): boolean {
  if (s.step === 1) return s.name.trim().length >= 2
  if (s.step === 3) return s.noAllergens || s.allergens.length > 0
  return true
}

// Mirrors the server's chiliInput; schemas.ts stays out of the client bundle.
export function toPayload(s: WizardState, deviceId: string) {
  const cook = s.cook.trim()
  const description = s.description.trim()
  return {
    deviceId,
    name: s.name.trim(),
    ...(cook && { cook }),
    ...(description && { description }),
    ...(s.noAllergens ? { noAllergens: true as const } : { allergens: s.allergens }),
  }
}
