/**
 * Landing page: STATIC (no DeepSpace providers, prerendered at build).
 * The hero shows the product itself: a faithful, static copy of a household
 * board in an app frame. The live app starts at /home.
 */

import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Seo } from '../components/Seo'
import { AtlasBand, Wordmark } from '../components/Brand'
import { seo } from '../seo'

const demoPeople = {
  D: { name: 'Dilnoza', color: '#0e6b70' },
  R: { name: 'Rustam', color: '#c4343f' },
  M: { name: 'Madina', color: '#2c8f63' },
} as const

const demoChores: { title: string; who: keyof typeof demoPeople; when: string; done?: boolean; late?: boolean }[] = [
  { title: 'Take out the trash', who: 'R', when: 'Today, repeats daily' },
  { title: 'Water the plants', who: 'M', when: 'Yesterday', late: true },
  { title: 'Vacuum the living room', who: 'D', when: 'Saturday, repeats weekly' },
  { title: 'Buy dish soap', who: 'D', when: 'Done by Dilnoza', done: true },
]

function Dot({ who, size = 28 }: { who: keyof typeof demoPeople; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: demoPeople[who].color }}
    >
      {who}
    </span>
  )
}

/** A static copy of the household screen, same layout and wording as the real one. */
function BoardPreview() {
  return (
    <figure
      aria-label="Preview of a KhonaiMo household board"
      className="km-enter-late overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_30px_60px_-30px_rgba(22,32,42,0.35)]"
    >
      <AtlasBand className="h-3" />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-2xl">🏡</span>
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold">Maple Street flat</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex -space-x-1.5"><Dot who="D" size={20} /><Dot who="R" size={20} /></span>
              Dilnoza and Rustam are here now
            </p>
          </div>
        </div>

        <ul className="mt-5 divide-y divide-border rounded-2xl border border-border">
          {demoChores.map((c) => (
            <li key={c.title} className="flex items-center gap-3 px-3.5 py-3">
              <span
                aria-hidden
                className={
                  c.done
                    ? 'grid h-6 w-6 place-items-center rounded-full bg-[#f1b030] text-[#16202a]'
                    : 'h-6 w-6 rounded-full border-2 border-input'
                }
              >
                {c.done && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={c.done ? 'block truncate text-muted-foreground line-through' : 'block truncate font-medium'}>{c.title}</span>
                <span className={c.late ? 'block text-xs font-semibold text-[#c4343f]' : 'block text-xs text-muted-foreground'}>
                  {c.late ? `Overdue since ${c.when.toLowerCase()}` : c.when}
                </span>
              </span>
              <Dot who={c.who} />
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#e7f3ec] px-4 py-3">
          <span className="text-sm">Rustam owes you</span>
          <span className="tabular font-display text-lg font-extrabold text-[#1f6e4b]">$7.15</span>
        </div>
      </div>
    </figure>
  )
}

const points = [
  {
    title: 'Chores with a name on them',
    body: 'Every task has an owner and a due date. Daily and weekly ones come back on their own each morning.',
  },
  {
    title: 'Costs split to the cent',
    body: 'Log who paid and who shared it. KhonaiMo keeps a running tab and tells you the fewest payments to settle up.',
  },
  {
    title: 'The same list on every phone',
    body: 'Tick something off and your housemates see it a second later, along with who is home in the app right now.',
  },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <Link to="/home" className="km-press inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold hover:bg-secondary">
            Open the app
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-5">
          <section className="grid items-center gap-12 pb-16 pt-8 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
            <div className="km-enter">
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl">
                Chores and shared costs for everyone under one roof.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                KhonaiMo, Tajik for “our home”, is a shared list for roommates, couples and families:
                who does what, who paid for what, and who owes whom.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/home" className="km-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-semibold text-primary-foreground hover:bg-primary/90">
                  Start a household
                </Link>
                <Link to="/home" className="km-press inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-7 font-semibold hover:bg-secondary">
                  Join with an invite code
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">The web companion to the KhonaiMo iPhone app.</p>
            </div>
            <BoardPreview />
          </section>

          <section aria-labelledby="how" className="border-t border-border py-14 sm:py-20">
            <h2 id="how" className="font-display text-3xl font-extrabold sm:text-4xl">What it keeps track of</h2>
            <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
              {points.map((p) => (
                <li key={p.title} className="border-l-4 border-[#f1b030] pl-4">
                  <h3 className="font-display text-xl font-extrabold">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-border px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>KhonaiMo Web, built on DeepSpace.</span>
          <Link to="/home" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link>
        </footer>
      </div>
    </>
  )
}
