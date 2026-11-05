import Link from "next/link";
import { Reveal } from "@/features/about/Reveal";
import { CountUp } from "@/features/about/CountUp";
import { FEATURES, FLOW, LAYERS, PROJECT_TAGLINE, PROJECT_TITLE, STATS, TEAM } from "@/features/about/team";

export const metadata = {
  title: "About ShopNGo",
  description:
    "ShopNGo was built by Kuldeep Behera, Pankaj Gupta and Jaskaran Singh during their minor project, an academic project developed during the final year.",
};

const heading = "font-display text-3xl font-bold text-teal-900 dark:text-teal-300 sm:text-4xl";

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative isolate bg-gradient-to-br from-teal-950 via-teal-800 to-zinc-900 px-6 py-24 text-center text-white sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 animate-pulse rounded-full bg-teal-400/25 blur-3xl motion-reduce:animate-none" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-24 h-96 w-96 animate-pulse rounded-full bg-emerald-300/15 blur-3xl motion-reduce:animate-none" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]" />
        <Reveal>
          <p className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-teal-100">
            Minor project · Final year · Academic project
          </p>
          <h1 className="font-display mt-6 text-5xl font-extrabold sm:text-7xl">{PROJECT_TITLE}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-xl text-teal-100 sm:text-2xl">{PROJECT_TAGLINE}</p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-teal-50/90">
            A complete online marketplace, built by three students: shoppers browse and buy, sellers list products,
            moderators keep it trustworthy and delivery partners bring every order home.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#team" className="inline-flex h-12 items-center rounded-lg bg-white px-6 text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-50">
              Meet the team
            </Link>
            <Link href="/search" className="inline-flex h-12 items-center rounded-lg border border-white/40 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              Start shopping
            </Link>
          </div>
        </Reveal>
      </section>

      <section aria-label="ShopNGo in numbers" className="relative z-10 mx-auto -mt-10 max-w-6xl px-6">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li key={s.label}>
              <Reveal delay={i * 100} className="h-full">
                <div className="h-full rounded-2xl border border-teal-900/10 bg-white p-5 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="font-display text-4xl font-extrabold text-teal-700 dark:text-teal-300">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{s.label}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16" aria-labelledby="built-by">
        <Reveal>
          <h2 id="built-by" className={heading}>
            Built by students, for shoppers
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-700 dark:text-zinc-300">
            ShopNGo was built by <strong>Kuldeep Behera</strong>, <strong>Pankaj Gupta</strong> and{" "}
            <strong>Jaskaran Singh</strong> during their <strong>minor project</strong>, an academic project
            developed during the <strong>final year</strong> of their studies.
          </p>
          <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
            Online shopping should be clear, honest and usable by everyone. ShopNGo brings the whole journey into one
            place: discover products, understand them with plain descriptions and comparisons, buy safely, and track the
            delivery until it arrives. It is also designed to work well with a screen reader.
          </p>
        </Reveal>
      </section>

      <section className="bg-gray-50 px-6 py-16 dark:bg-zinc-950" aria-labelledby="team">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 id="team" className={`${heading} text-center`}>
              The team and what each person contributed
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600 dark:text-zinc-400">
              Each member owned a separate part of the project, so every contribution below belongs to one person only.
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {TEAM.map((m, i) => (
              <li key={m.name}>
                <Reveal delay={i * 150} className="h-full">
                  <article className="flex h-full flex-col rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div
                      aria-hidden="true"
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-2xl font-bold text-white shadow-lg"
                    >
                      {m.name.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <h3 className="font-display mt-4 text-2xl font-bold text-gray-900 dark:text-zinc-100">{m.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-teal-700 dark:text-teal-400">{m.role}</p>
                    <p className="mt-3 text-sm italic text-gray-600 dark:text-zinc-400">{m.summary}</p>
                    <ul aria-label={`Areas owned by ${m.name}`} className="mt-4 flex flex-wrap gap-2">
                      {m.areas.map((a) => (
                        <li key={a} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                          {a}
                        </li>
                      ))}
                    </ul>
                    <h4 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-400">Contribution</h4>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                      {m.contributions.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="features">
        <Reveal>
          <h2 id="features" className={`${heading} text-center`}>
            What ShopNGo can do
          </h2>
        </Reveal>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={(i % 3) * 120} className="h-full">
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="font-display text-lg font-bold text-teal-900 dark:text-teal-300">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{f.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-gradient-to-b from-teal-50 to-white px-6 py-16 dark:from-zinc-950 dark:to-zinc-900" aria-labelledby="flow">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 id="flow" className={`${heading} text-center`}>
              How an order travels
            </h2>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FLOW.map((f, i) => (
              <li key={f.step}>
                <Reveal delay={i * 110} className="h-full">
                  <div className="h-full rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-teal-900/10 dark:bg-zinc-900 dark:ring-zinc-800">
                    <span aria-hidden="true" className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold text-gray-900 dark:text-zinc-100">{f.step}</h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">{f.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16" aria-labelledby="architecture">
        <Reveal>
          <h2 id="architecture" className={`${heading} text-center`}>
            How it is built
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600 dark:text-zinc-400">
            The pages talk to the backend, the backend talks to the database and the services, and every sign-in is
            checked on the server.
          </p>
        </Reveal>
        <ul className="mt-10 space-y-3">
          {LAYERS.map((l, i) => (
            <li key={l.name}>
              <Reveal delay={i * 70}>
                <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-teal-400 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:gap-6">
                  <h3 className="font-display w-36 shrink-0 text-lg font-bold text-teal-800 dark:text-teal-300">{l.name}</h3>
                  <p className="flex-1 text-sm text-gray-700 dark:text-zinc-300">{l.text}</p>
                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 sm:w-52 sm:text-right">{l.tech}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-teal-900 px-6 py-16 text-center text-white" aria-labelledby="cta">
        <Reveal>
          <h2 id="cta" className="font-display text-3xl font-bold sm:text-4xl">
            Try ShopNGo
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-teal-100">
            Browse the catalogue, ask the assistant a question, or apply to become a seller or a delivery partner.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search" className="inline-flex h-12 items-center rounded-lg bg-white px-6 text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:bg-teal-50">
              Start shopping
            </Link>
            <Link href="/seller/apply" className="inline-flex h-12 items-center rounded-lg border border-white/40 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              Become a seller
            </Link>
            <Link href="/delivery/apply" className="inline-flex h-12 items-center rounded-lg border border-white/40 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              Become a delivery partner
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
