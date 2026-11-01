import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'

export function AppErrorPage() {
  const error = useRouteError()
  const summary = isRouteErrorResponse(error)
    ? `Route response ${error.status}`
    : error instanceof Error
      ? error.name
      : 'Unknown error'
  useEffect(() => {
    console.error('Unexpected application error.', summary)
  }, [summary])

  return (
    <main id="main-content" className="session-panel" tabIndex={-1}>
      <h1>ChurchServe could not open this page</h1>
      <p>Reload the page. If the problem continues, contact support.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reload ChurchServe
      </button>
    </main>
  )
}
