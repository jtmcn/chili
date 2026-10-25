import { z } from 'zod'

export const ALLERGEN_IDS = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts',
  'peanuts', 'wheat', 'soy', 'sesame', 'gluten',
] as const

export const chiliInput = z
  .object({
    deviceId: z.string().min(1),
    name: z.string().trim().min(2).max(40),
    cook: z.string().trim().max(40).optional(),
    description: z.string().trim().max(200).optional(),
    allergens: z.array(z.enum(ALLERGEN_IDS)).optional(),
    noAllergens: z.literal(true).optional(),
  })
  .refine((v) => (v.allergens?.length ? 1 : 0) + (v.noAllergens ? 1 : 0) === 1, {
    message: 'Pick allergens or "no allergens"',
  })

export type ChiliInput = z.infer<typeof chiliInput>

export const TAG_IDS = [
  'spicy', 'mild', 'smoky', 'meaty', 'veggie',
  'beany', 'sweet', 'tangy', 'rich', 'unique',
] as const

export const tagInput = z.object({
  chiliId: z.uuid(),
  tagId: z.enum(TAG_IDS),
  deviceId: z.string().min(1),
  on: z.boolean(),
})

export const ballotInput = z.object({
  deviceId: z.string().min(1),
  picks: z
    .array(z.uuid())
    .length(3)
    .refine((p) => new Set(p).size === p.length, { message: 'Picks must be distinct' }),
})

export const ballotMineInput = z.object({ deviceId: z.string().min(1) })

const adminFields = {
  name: z.string().trim().min(2).max(40),
  cook: z.string().trim().max(40),
  description: z.string().trim().max(200),
  allergens: z.array(z.enum(ALLERGEN_IDS)),
}

export const adminChiliInput = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: adminFields.name,
    cook: adminFields.cook.optional(),
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
])

export const adminEventInput = z.object({
  status: z.enum(['setup', 'voting']).optional(),
  entriesOpen: z.boolean().optional(),
  revealAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revealNow: z.literal(true).optional(),
})
