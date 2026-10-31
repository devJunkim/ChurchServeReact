import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ServiceEventForm } from './ServiceEventForm'

describe('ServiceEventForm', () => {
  it('reveals required errors without submitting an invalid form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ServiceEventForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Review the highlighted fields',
    )
    expect(screen.getByLabelText('Service name')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Enter a service name.')).toBeVisible()
  })

  it('rejects whitespace-only names and locations', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ServiceEventForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Service name'), '   ')
    await user.type(screen.getByLabelText('Location'), '   ')
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a service name.')).toBeVisible()
    expect(screen.getByText('Enter a service location.')).toBeVisible()
  })

  it('rejects an end time that is not after the start time', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ServiceEventForm onSubmit={onSubmit} />)

    await fillForm(user, {
      startsAt: '2026-11-01T10:00',
      endsAt: '2026-11-01T09:00',
    })
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('End time must be after start time.')).toBeVisible()
    expect(screen.getByLabelText('Ends')).toHaveAttribute('aria-invalid', 'true')
  })

  it('trims text and normalizes timestamps before submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ServiceEventForm onSubmit={onSubmit} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Prayer Night',
      startsAt: new Date('2026-11-06T19:00').toISOString(),
      endsAt: new Date('2026-11-06T20:00').toISOString(),
      location: 'Chapel',
    })
    expect(screen.getByLabelText('Service name')).toHaveValue('')
  })
})

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  times = {
    startsAt: '2026-11-06T19:00',
    endsAt: '2026-11-06T20:00',
  },
) {
  await user.type(screen.getByLabelText('Service name'), '  Prayer Night  ')
  await user.type(screen.getByLabelText('Starts'), times.startsAt)
  await user.type(screen.getByLabelText('Ends'), times.endsAt)
  await user.type(screen.getByLabelText('Location'), '  Chapel  ')
}
