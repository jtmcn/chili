import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Results } from '@/components/Results'
import type { ResultRow } from '@/lib/types'

const row = (o: Partial<ResultRow>): ResultRow => ({
  chiliId: 'a', potNumber: 1, name: 'Brisket Fire', cook: 'Sam', points: 9, firsts: 3, seconds: 0, thirds: 0, rank: 1, ...o,
})

describe('Results', () => {
  it('prints rank text on the ribbon and shows cook and tags', () => {
    render(
      <Results
        rows={[row({}), row({ chiliId: 'b', name: 'Bean Team', cook: 'Ann', rank: 2, points: 5 })]}
        topTags={(id) => (id === 'a' ? [{ label: 'Smoky', count: 4 }] : [])}
      />,
    )
    expect(within(screen.getByTestId('ribbon-1')).getByText('1st')).toBeInTheDocument()
    expect(within(screen.getByTestId('ribbon-2')).getByText('2nd')).toBeInTheDocument()
    expect(screen.getByText(/Sam/)).toBeInTheDocument()
    expect(screen.getByText('Smoky')).toHaveTextContent('Smoky 4')
  })

  it('labels ties with T- and gives tied top-3 ranks ribbons', () => {
    render(<Results rows={[row({ rank: 1 }), row({ chiliId: 'b', name: 'B', rank: 1 }), row({ chiliId: 'c', name: 'C', rank: 3 }), row({ chiliId: 'd', name: 'D', rank: 4 })]} topTags={() => []} />)
    expect(screen.getAllByText('T-1st')).toHaveLength(2)
    expect(screen.getByText('3rd')).toBeInTheDocument()
    expect(screen.getByText('4th')).toBeInTheDocument()
  })

  it('has no emoji', () => {
    const { container } = render(<Results rows={[row({})]} topTags={() => []} />)
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
