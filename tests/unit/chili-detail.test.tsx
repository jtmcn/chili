import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChiliDetail } from '@/components/ChiliDetail'

describe('ChiliDetail', () => {
  it('shows description, allergens, disclaimer and back link', () => {
    render(
      <ChiliDetail
        chili={{ id: 'a', potNumber: 5, name: 'Green Machine', description: 'Tomatillo heavy', cook: 'Bo', allergenIds: ['milk', 'soy'], photoPath: null }}
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

describe('ChiliDetail photo', () => {
  const base = { id: 'a', potNumber: 5, name: 'Green Machine', description: null, cook: null, allergenIds: [] }
  it('renders the photo when photoPath is set', () => {
    render(<ChiliDetail chili={{ ...base, photoPath: 'a/p.jpg' }} allergens={[]} />)
    const img = screen.getByRole('img', { name: 'Photo of Green Machine' })
    expect(img.getAttribute('src')).toMatch(/\/storage\/v1\/object\/public\/chili-photos\/a\/p\.jpg$/)
    expect(img).toHaveAttribute('loading', 'lazy')
  })
  it('renders no photo when photoPath is null', () => {
    render(<ChiliDetail chili={{ ...base, photoPath: null }} allergens={[]} />)
    expect(screen.queryByRole('img', { name: /^Photo of/ })).not.toBeInTheDocument()
  })
})
