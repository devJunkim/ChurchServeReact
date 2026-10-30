import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="not-found-page">
      <p className="eyebrow">Page not found</p>
      <h1>This ChurchServe page does not exist.</h1>
      <p>Return to the application shell and choose an available destination.</p>
      <Link to="/">Return home</Link>
    </section>
  )
}
