import Link from "next/link";
import { CONTACT_EMAIL, LAST_UPDATED } from "./meta";
import { DEMO_NOTICE } from "./demoNotice";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  after?: string[];
}

const link = "font-medium text-teal-800 underline underline-offset-2 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300 dark:hover:text-teal-200";

export function LegalPage({
  title,
  intro,
  sections,
  other,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <h1 className="font-display text-3xl font-bold text-teal-900 dark:text-teal-300 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">
          Last updated: <time>{LAST_UPDATED}</time>
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-800 dark:text-zinc-200">{intro}</p>
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <strong>Please note:</strong> {DEMO_NOTICE.banner}
        </p>
      </header>

      <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-teal-900/10 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Contents</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-sm text-gray-800 dark:text-zinc-200">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={link}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} aria-labelledby={s.id} className="scroll-mt-24">
            <h2 id={s.id} className="font-display text-2xl font-bold text-teal-900 dark:text-teal-300">
              {i + 1}. {s.title}
            </h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-base leading-relaxed text-gray-800 dark:text-zinc-200">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-relaxed text-gray-800 dark:text-zinc-200">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            {s.after?.map((p) => (
              <p key={p} className="mt-3 text-base leading-relaxed text-gray-800 dark:text-zinc-200">{p}</p>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-700 dark:border-zinc-800 dark:text-zinc-300">
        <p>
          Questions? Write to <a className={link} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. You may also read our{" "}
          <Link className={link} href={other.href}>{other.label}</Link> or go back to the{" "}
          <Link className={link} href="/">home page</Link>.
        </p>
      </footer>
    </div>
  );
}
