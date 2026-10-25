import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PotNumber } from '@/components/PotNumber'

describe('PotNumber', () => {
  it('has an accessible name and the pot font', () => {
    render(<PotNumber n={7} />)
    const el = screen.getByLabelText('Pot 7')
    expect(el).toHaveClass('font-pot')
    expect(el).toHaveTextContent('7')
  })
})
