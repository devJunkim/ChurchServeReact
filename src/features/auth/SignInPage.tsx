import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { SessionHttpError } from './httpSessionClient'
import { safeReturnTo } from './safeReturnTo'
import { useSession } from './sessionContext'
import './auth.css'

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, signIn } = useSession()
  const returnTo = safeReturnTo(location.search)
  const [email, setEmail] = useState('coordinator@churchserve.local')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      await signIn({ email, password })
      setPassword('')
      await navigate(returnTo, { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof SessionHttpError && error.status === 401
          ? 'The email or password was incorrect.'
          : 'Sign-in is unavailable. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state.status === 'authenticated') {
    return (
      <section className="auth-page" aria-labelledby="sign-in-heading">
        <p className="eyebrow">Account</p>
        <h1 id="sign-in-heading">You are already signed in</h1>
        <p className="auth-introduction">
          Continue as {state.user.displayName}.
        </p>
        <Link className="primary-action auth-link" to={returnTo}>
          Continue
        </Link>
      </section>
    )
  }

  return (
    <section className="auth-page" aria-labelledby="sign-in-heading">
      <p className="eyebrow">Account</p>
      <h1 id="sign-in-heading">Sign in to coordinate ChurchServe</h1>
      <p className="auth-introduction">
        Use the local tutorial account. The API establishes the real session;
        React keeps only the returned profile.
      </p>

      <form className="auth-form" aria-busy={isSubmitting} onSubmit={handleSubmit}>
        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <aside className="local-account-note">
        <strong>Local tutorial account</strong>
        <span>coordinator@churchserve.local</span>
        <span>Use the password stored with .NET user-secrets.</span>
      </aside>
    </section>
  )
}
