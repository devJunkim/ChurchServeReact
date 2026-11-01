import { Link } from 'react-router'

export function UnavailablePage() {
  return (
    <section className="not-found-page" aria-labelledby="unavailable-heading">
      <p className="eyebrow">Unavailable</p>
      <h1 id="unavailable-heading">This feature is not available to your account.</h1>
      <p>Choose another destination or ask an administrator about your access.</p>
      <Link to="/">Return home</Link>
    </section>
  )
}
