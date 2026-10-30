import { NavLink, Outlet } from 'react-router'
import './styles/app.css'

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

export function App() {
  return (
    <div className="application-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="ChurchServe home">
          <span className="brand-mark" aria-hidden="true">
            CS
          </span>
          <span>ChurchServe</span>
        </NavLink>

        <nav aria-label="Primary navigation">
          <NavLink className={navLinkClassName} to="/schedule">
            Schedule
          </NavLink>
          <NavLink className={navLinkClassName} to="/volunteers">
            Volunteers
          </NavLink>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>Thoughtful scheduling for people who serve.</p>
      </footer>
    </div>
  )
}
