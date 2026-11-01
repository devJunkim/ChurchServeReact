import { Link } from 'react-router'
import { hasPermission, PERMISSIONS } from '../core/auth/session'
import { useSession } from '../core/auth/sessionContext'

export function HomePage() {
  const { state } = useSession()
  const user = state.status === 'authenticated' ? state.user : undefined
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Volunteer and ministry scheduling</p>
        <h1>Serve together with a schedule everyone can understand.</h1>
        <p className="introduction">
          ChurchServe helps coordinators plan services, organize ministry
          positions, and see where volunteers are still needed.
        </p>

        <div className="actions">
          {hasPermission(user, PERMISSIONS.scheduleRead) && (
            <Link className="primary-action" to="/schedule">
              View the schedule
            </Link>
          )}
          {hasPermission(user, PERMISSIONS.volunteerRead) && (
            <Link className="secondary-action" to="/volunteers">
              View volunteers
            </Link>
          )}
        </div>
      </div>

      <aside className="preview" aria-labelledby="preview-heading">
        <p className="preview-label">Coming in this tutorial</p>
        <h2 id="preview-heading">One application, built in useful steps</h2>
        <ul>
          <li>Plan services and ministry positions</li>
          <li>Coordinate volunteer availability</li>
          <li>Find gaps before publishing a schedule</li>
        </ul>
      </aside>
    </section>
  )
}
