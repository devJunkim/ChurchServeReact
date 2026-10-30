import type { PropsWithChildren } from 'react'

interface PlaceholderPageProps extends PropsWithChildren {
  eyebrow: string
  title: string
}

export function PlaceholderPage({
  children,
  eyebrow,
  title,
}: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  )
}
