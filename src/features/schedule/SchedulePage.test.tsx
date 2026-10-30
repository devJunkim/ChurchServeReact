import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SchedulePage } from './SchedulePage'

describe('SchedulePage', () => {
  it('renders the event collection and owns card selection', async () => {
    const user = userEvent.setup()
    render(<SchedulePage />)

    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.click(
      screen.getByRole('button', { name: 'View Sunday Morning Service' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sunday Morning Service selected',
    )
  })
})
