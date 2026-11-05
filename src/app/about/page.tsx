import Link from "next/link";
import { Reveal } from "@/features/about/Reveal";
import { PROJECT_TAGLINE, PROJECT_TITLE, TEAM } from "@/features/about/team";

export const metadata = {
  title: "About ShopNGo",
  description:
    "ShopNGo was built by Kuldeep Behera, Pankaj Gupta and Jaskaran Singh as a minor project, an academic project developed during the final year.",
};

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative isolate bg-gradient-to-br from-teal-900 via-teal-800 to-zinc-900 px-6 py-20 text-center text-white sm:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-teal-400/20 blur-3xl motion-reduce:animate-none" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 animate-pulse rounded-full bg-emerald-300/10 blur-3xl motion-reduce:animate-none" />
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">About the project</p>
          <h1 className="font-display mt-4 text-4xl font-bold sm:text-6xl">{PROJECT_TITLE}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-teal-100">{PROJECT_TAGLINE}</p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14" aria-labelledby="built-by">
        <Reveal>
          <h2 id="built-by" className="font-display text-2xl font-bold text-teal-900 dark:text-teal-300">
            Built by students, for shoppers
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
            ShopNGo was built by <strong>Kuldeep Behera</strong>, <strong>Pankaj Gupta</strong> and{" "}
            <strong>Jaskaran Singh</strong> during their <strong>minor project</strong>, an academic project
            developed during the final year of their studies.
          </p>
          <p className="mt-3 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
            It is a marketplace where verified sellers list products, shoppers search and compare them, and orders
            can be tracked from checkout to delivery. It works on phones like an installed app, and it is designed
            to be usable with a screen reader.
          </p>
        </Reveal>
      </section>

      <section className="bg-gray-50 px-6 py-14 dark:bg-zinc-950" aria-labelledby="team">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 id="team" className="font-display text-center text-2xl font-bold text-teal-900 dark:text-teal-300">
              The team and what each person contributed
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {TEAM.map((m, i) => (
              <li key={m.name}>
                <Reveal delay={i * 150} className="h-full">
                  <article className="h-full rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-xl font-bold text-white"
                    >
                      {m.name.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <h3 className="font-display mt-4 text-xl font-bold text-gray-900 dark:text-zinc-100">{m.name}</h3>
                    <p className="text-sm font-medium text-teal-700 dark:text-teal-400">{m.role}</p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-zinc-300">
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

      <section className="px-6 py-14 text-center">
        <Reveal>
          <Link
            href="/search"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-6 text-sm font-medium text-white hover:bg-teal-600"
          >
            Start shopping
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
