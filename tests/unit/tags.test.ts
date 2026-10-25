import { describe, expect, it } from 'vitest'
import { topTags } from '@/lib/tags'

const tags = [
  { id: 'spicy', label: 'Spicy', sort: 1 },
  { id: 'mild', label: 'Mild', sort: 2 },
  { id: 'smoky', label: 'Smoky', sort: 3 },
  { id: 'meaty', label: 'Meaty', sort: 4 },
]

describe('topTags', () => {
  it('returns top 3 by count, breaking ties by tag sort', () => {
    const counts = [
      { chiliId: 'a', tagId: 'meaty', count: 2 },
      { chiliId: 'a', tagId: 'smoky', count: 2 },
      { chiliId: 'a', tagId: 'spicy', count: 5 },
      { chiliId: 'a', tagId: 'mild', count: 1 },
      { chiliId: 'b', tagId: 'mild', count: 9 },
    ]
    expect(topTags(counts, 'a', tags).map((t) => [t.id, t.count])).toEqual([
      ['spicy', 5],
      ['smoky', 2],
      ['meaty', 2],
    ])
  })
})
