import { useEffect, useState } from 'react'
import type { ServiceEvent } from './serviceEvent'
import {
  useAssignmentSnapshot,
  useAssignmentStore,
} from './assignmentStoreContext'

const timeFormatter = new Intl.DateTimeFormat('en-CA', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Toronto',
})

type AssignmentBoardPanelProps = {
  readonly event: ServiceEvent
  readonly canManageSchedule: boolean
}

export function AssignmentBoardPanel({
  event,
  canManageSchedule,
}: AssignmentBoardPanelProps) {
  const store = useAssignmentStore()
  const snapshot = useAssignmentSnapshot()
  const [selectedVolunteers, setSelectedVolunteers] = useState<
    Readonly<Record<string, string>>
  >({})

  useEffect(() => {
    void store.load(event.id)
  }, [event.id, store])

  const board =
    snapshot.status === 'ready' && snapshot.eventId === event.id
      ? snapshot
      : undefined

  return (
    <section className="assignment-board" aria-labelledby="assignment-heading">
      <div className="assignment-heading">
        <div>
          <p className="eyebrow">Coordinator board</p>
          <h2 id="assignment-heading">Ministry assignments</h2>
        </div>
        {board && (
          <p className="assignment-version">Schedule version {board.eventVersion}</p>
        )}
      </div>

      {!board && snapshot.status === 'error' && snapshot.eventId === event.id ? (
        <div className="state-panel error-state" role="alert">
          <p>{snapshot.message}</p>
          <button
            className="retry-action"
            type="button"
            onClick={() => void store.retry()}
          >
            Try again
          </button>
        </div>
      ) : !board ? (
        <p className="state-panel" role="status">
          Loading the assignment board…
        </p>
      ) : board.positions.length === 0 ? (
        <div className="state-panel empty-state">
          <h3>No assignable positions</h3>
          <p>Positions have not been configured for this service event.</p>
        </div>
      ) : (
        <>
          <p className="assignment-summary">
            {board.assignedPositions} assigned across the schedule.{' '}
            {board.assignments.length} of {board.positions.length} configured
            positions filled.
          </p>

          {board.notice && (
            <p
              className={`assignment-notice ${board.notice.kind}`}
              role={board.notice.kind === 'success' ? 'status' : 'alert'}
            >
              {board.notice.message}
            </p>
          )}

          <ul className="position-list">
            {board.positions.map((position) => {
              const assignment = store.assignmentFor(position.id)
              const eligibleVolunteers = store.volunteersFor(position)
              const selectedVolunteer = selectedVolunteers[position.id] ?? ''

              return (
                <li key={position.id}>
                  <div className="position-copy">
                    <span>{position.ministry}</span>
                    <h3>{position.roleName}</h3>
                    <p>
                      <time dateTime={position.startsAt}>
                        {timeFormatter.format(new Date(position.startsAt))}
                      </time>
                      {'–'}
                      <time dateTime={position.endsAt}>
                        {timeFormatter.format(new Date(position.endsAt))}
                      </time>
                    </p>
                  </div>

                  {assignment ? (
                    <div className="assigned-volunteer">
                      <strong>{assignment.volunteerDisplayName}</strong>
                      <span
                        className={
                          assignment.syncStatus === 'pending'
                            ? 'saving'
                            : undefined
                        }
                      >
                        {assignment.syncStatus === 'pending'
                          ? 'Saving…'
                          : 'Confirmed'}
                      </span>
                    </div>
                  ) : canManageSchedule ? (
                    <div className="assignment-action">
                      <label htmlFor={`volunteer-${position.id}`}>
                        Volunteer
                      </label>
                      <select
                        id={`volunteer-${position.id}`}
                        value={selectedVolunteer}
                        onChange={(changeEvent) =>
                          setSelectedVolunteers((current) => ({
                            ...current,
                            [position.id]: changeEvent.target.value,
                          }))
                        }
                      >
                        <option value="">Choose a volunteer</option>
                        {eligibleVolunteers.map((volunteer) => (
                          <option key={volunteer.id} value={volunteer.id}>
                            {volunteer.displayName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedVolunteer}
                        onClick={() => {
                          const result = store.assign(
                            position.id,
                            selectedVolunteer,
                          )
                          if (result.valid) {
                            setSelectedVolunteers((current) => ({
                              ...current,
                              [position.id]: '',
                            }))
                          }
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  ) : (
                    <p className="assigned-volunteer">Unfilled</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
