/**
 * Landing page — STATIC (no DeepSpace providers, prerendered at build).
 * The live app starts at /home.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

const features = [
  { emoji: '🧹', title: 'Chores that stay fair', body: 'Assign tasks with due dates. Daily and weekly chores come back by themselves each morning.' },
  { emoji: '💸', title: 'Split costs, no awkward math', body: 'Log who paid, split it equally, and see exactly who owes whom down to the cent.' },
  { emoji: '🟢', title: 'Live for everyone', body: 'Changes show up instantly on every phone in the house, and you can see who’s home online.' },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg text-primary-foreground">🏡</span>
            {APP_NAME}
          </span>
          <Link to="/home" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
            Open app
          </Link>
        </header>

        <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:pt-16">
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Web version of the KhonaiMo iOS app
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Your home, <span className="text-primary">shared fairly.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            {APP_NAME} (“our home” in Tajik) keeps roommates, couples and families in sync on chores and shared expenses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/home" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
              Start a household
            </Link>
            <Link to="/home" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary">
              I have an invite code
            </Link>
          </div>

          <ul className="mt-16 grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <span aria-hidden className="text-2xl">{f.emoji}</span>
                <h2 className="mt-3 font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </>
  )
}
