import {
  Link,
  isRouteErrorResponse,
  useRevalidator,
  useRouteError,
} from 'react-router'
import './schedule.css'

export function ServiceEventDetailErrorPage() {
  const error = useRouteError()
  const revalidator = useRevalidator()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <section className="schedule-route-page" aria-labelledby="detail-heading">
      <Link className="back-link" to="/schedule">
        ← Back to schedule
      </Link>

      {isNotFound ? (
        <div className="missing-event" role="alert">
          <p className="eyebrow">Service event</p>
          <h1 id="detail-heading">Service not found</h1>
          <p>This event does not exist or is no longer available.</p>
          <Link to="/schedule">Return to the schedule</Link>
        </div>
      ) : (
        <div className="state-panel error-state" role="alert">
          <h1 id="detail-heading">We could not load this service</h1>
          <p>The scheduling service did not respond.</p>
          <button
            className="retry-action"
            type="button"
            disabled={revalidator.state !== 'idle'}
            onClick={() => revalidator.revalidate()}
          >
            {revalidator.state === 'loading' ? 'Trying again…' : 'Try again'}
          </button>
        </div>
      )}
    </section>
  )
}
