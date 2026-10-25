import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChiliCard } from '@/components/ChiliCard'
import { ChiliList } from '@/components/ChiliList'
import type { PublicChili, RefItem } from '@/lib/types'

const allergens: RefItem[] = [
  { id: 'milk', label: 'Milk', sort: 1 },
  { id: 'eggs', label: 'Eggs', sort: 2 },
]
const chili: PublicChili = {
  id: 'abc',
  potNumber: 3,
  name: 'Brisket Fire',
  description: null,
  cook: 'Ann',
  allergenIds: ['eggs'],
  photoPath: null,
}

describe('ChiliCard', () => {
  it('shows pot, name and allergen badge', () => {
    render(<ChiliCard chili={chili} allergens={allergens} />)
    expect(screen.getByRole('img', { name: 'Pot 3' })).toBeInTheDocument()
    expect(screen.getByText('Brisket Fire')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()
  })
  it('never shows the cook', () => {
    render(<ChiliCard chili={chili} allergens={allergens} />)
    expect(screen.queryByText(/Ann/)).not.toBeInTheDocument()
  })
  it('is a 72px link to the detail page', () => {
    render(<ChiliCard chili={chili} allergens={allergens} />)
    const link = screen.getByRole('link')
    expect(link).toHaveClass('min-h-[72px]')
    expect(link).toHaveAttribute('href', '/chili/abc')
  })
  it('shows top tags with counts', () => {
    render(<ChiliCard chili={chili} allergens={allergens} topTags={[{ label: 'Smoky', count: 4 }]} />)
    expect(screen.getByText('Smoky')).toHaveTextContent('Smoky 4')
  })
})

describe('ChiliList', () => {
  it('links Add it only when entries are open', () => {
    const { rerender } = render(<ChiliList chilis={[]} allergens={[]} entriesOpen />)
    expect(screen.getByText(/No chilis yet\. Bringing one\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add it' })).toHaveAttribute('href', '/add')
    rerender(<ChiliList chilis={[]} allergens={[]} entriesOpen={false} />)
    expect(screen.getByText('No chilis yet. Bringing one? Add it.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
