import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChiliDetail } from '@/components/ChiliDetail'

describe('ChiliDetail', () => {
  it('shows description, allergens, disclaimer and back link', () => {
    render(
      <ChiliDetail
        chili={{ id: 'a', potNumber: 5, name: 'Green Machine', description: 'Tomatillo heavy', cook: 'Bo', allergenIds: ['milk', 'soy'] }}
        allergens={[
          { id: 'milk', label: 'Milk', sort: 1 },
          { id: 'soy', label: 'Soy', sort: 2 },
        ]}
      />,
    )
    expect(screen.getByText('Tomatillo heavy')).toBeInTheDocument()
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Soy')).toBeInTheDocument()
    expect(screen.getByText("Allergen info comes from the cook; ask them if you're unsure.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all chilis' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('Bo')).not.toBeInTheDocument()
  })
})
