import { z } from 'zod'

export const ALLERGEN_IDS = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts',
  'peanuts', 'wheat', 'soy', 'sesame', 'gluten',
] as const

const deviceId = z.string().min(1).max(100)
// Required so the reveal can credit every cook.
const cook = z.string().trim().min(1).max(40)

const chiliFields = z.object({
  deviceId,
  name: z.string().trim().min(2).max(40),
  cook,
  description: z.string().trim().max(200).optional(),
  allergens: z.array(z.enum(ALLERGEN_IDS)).optional(),
  noAllergens: z.literal(true).optional(),
})
const oneAllergenAnswer = (v: { allergens?: string[]; noAllergens?: true }) =>
  (v.allergens?.length ? 1 : 0) + (v.noAllergens ? 1 : 0) === 1

export const chiliInput = chiliFields.refine(oneAllergenAnswer, { message: 'Pick allergens or "no allergens"' })
export const chiliUpdateInput = chiliFields
  .extend({ chiliId: z.uuid() })
  .refine(oneAllergenAnswer, { message: 'Pick allergens or "no allergens"' })

export type ChiliInput = z.infer<typeof chiliInput>

export const TAG_IDS = [
  'spicy', 'mild', 'smoky', 'meaty', 'veggie',
  'beany', 'sweet', 'tangy', 'rich', 'unique',
] as const

export const tagInput = z.object({
  chiliId: z.uuid(),
  tagId: z.enum(TAG_IDS),
  deviceId,
  on: z.boolean(),
})

export const ballotInput = z.object({
  deviceId,
  picks: z
    .array(z.uuid())
    .length(3)
    .refine((p) => new Set(p).size === p.length, { message: 'Picks must be distinct' }),
})

export const photoInput = z.object({
  deviceId,
  chiliId: z.uuid(),
})

export const deviceInput = z.object({ deviceId })

const adminFields = {
  name: z.string().trim().min(2).max(40),
  cook,
  description: z.string().trim().max(200),
  allergens: z.array(z.enum(ALLERGEN_IDS)),
}

export const adminChiliInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: adminFields.name,
    cook: adminFields.cook,
    description: adminFields.description.optional(),
    allergens: adminFields.allergens.optional(),
    potNumber: z.number().int().positive().nullish(),
  }),
  z.object({
    action: z.literal('update'),
    chiliId: z.uuid(),
    name: adminFields.name.optional(),
    cook: adminFields.cook.optional(),
    description: adminFields.description.optional(),
    allergens: adminFields.allergens.optional(),
    potNumber: z.number().int().positive().nullish(),
  }),
  z.object({ action: z.literal('delete'), chiliId: z.uuid() }),
  z.object({ action: z.literal('removePhoto'), chiliId: z.uuid() }),
])

export const adminEventInput = z.object({
  status: z.enum(['setup', 'voting']).optional(),
  entriesOpen: z.boolean().optional(),
  revealAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revealNow: z.literal(true).optional(),
})

export const adminArchiveInput = z.object({
  year: z.number().int().min(1000).max(9999),
  heldOn: z.iso.date(),
})
