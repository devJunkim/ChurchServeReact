import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ServiceEventForm } from './ServiceEventForm'
import { expectNoAccessibilityViolations } from '../../testing/expectNoAccessibilityViolations'

describe('ServiceEventForm', () => {
  it('reveals required errors without submitting an invalid form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<ServiceEventForm onSubmit={onSubmit} />)

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
    await waitFor(() =>
      expect(screen.getByLabelText('Service name')).toHaveFocus(),
    )
    expect(screen.getByLabelText('Service name')).toHaveAttribute(
      'aria-describedby',
      'service-title-error',
    )
    await expectNoAccessibilityViolations(container)
  })

  it('rejects whitespace-only names and locations', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
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
    const onSubmit = vi.fn().mockResolvedValue(undefined)
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
    const onSubmit = vi.fn().mockResolvedValue(undefined)
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
    await waitFor(() =>
      expect(screen.getByLabelText('Service name')).toHaveValue(''),
    )
  })

  it('preserves values and exposes pending feedback during submission', async () => {
    const user = userEvent.setup()
    let completeSubmission: () => void = () => undefined
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeSubmission = resolve
        }),
    )
    const view = render(<ServiceEventForm onSubmit={onSubmit} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Add to schedule' }))
    view.rerender(<ServiceEventForm isSubmitting onSubmit={onSubmit} />)

    expect(
      screen.getByRole('button', { name: 'Adding to schedule…' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Service name')).toHaveValue(
      '  Prayer Night  ',
    )

    completeSubmission()
    view.rerender(<ServiceEventForm onSubmit={onSubmit} />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add to schedule' }),
      ).toBeEnabled(),
    )
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
