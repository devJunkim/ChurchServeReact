import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { safeReturnTo } from './safeReturnTo'
import { useSession } from './sessionContext'
import './auth.css'
import { toAppProblem } from '../http/appProblem'
import { focusFirstInvalidControl } from '../../shared/accessibility/focusFirstInvalidControl'

type SignInErrors = {
  readonly email?: string
  readonly password?: string
}

export function SignInPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { state, signIn } = useSession()
  const returnTo = safeReturnTo(location.search)
  const [email, setEmail] = useState('coordinator@churchserve.local')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [errors, setErrors] = useState<SignInErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const nextErrors = validateSignIn(email, password)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      scheduleInvalidFocus(formRef.current)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      await signIn({ email, password })
      setPassword('')
      await navigate(returnTo, { replace: true })
    } catch (error) {
      const problem = toAppProblem(error)
      setErrorMessage(
        problem.kind === 'unauthenticated'
          ? 'The email or password was incorrect.'
          : problem.kind === 'forbidden'
            ? 'This account cannot sign in to ChurchServe.'
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

      <form
        ref={formRef}
        className="auth-form"
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit}
      >
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
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'email-error' : undefined}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((current) => ({ ...current, email: undefined }))
          }}
        />
        {errors.email && (
          <p id="email-error" className="auth-error">
            {errors.email}
          </p>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'password-error' : undefined}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: undefined }))
          }}
        />
        {errors.password && (
          <p id="password-error" className="auth-error">
            {errors.password}
          </p>
        )}

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

function validateSignIn(email: string, password: string): SignInErrors {
  const errors: { email?: string; password?: string } = {}
  const normalizedEmail = email.trim()

  if (
    normalizedEmail.length === 0 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    errors.email = 'Enter a valid email address.'
  }
  if (password.length === 0) {
    errors.password = 'Enter your password.'
  }

  return errors
}

function scheduleInvalidFocus(form: HTMLFormElement | null): void {
  form?.ownerDocument.defaultView?.setTimeout(() => {
    if (form.isConnected) {
      focusFirstInvalidControl(form)
    }
  })
}
