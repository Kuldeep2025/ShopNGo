import Link from "next/link";
import { FooterAuthLink } from "@/components/layout/FooterAuthLink";
import { CopyrightYear } from "@/components/layout/CopyrightYear";
import { AnalyticsPreferencesButton } from "@/components/analytics/FirebaseAnalytics";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-teal-900/10 bg-gradient-to-b from-gray-50 to-gray-100/80 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt="ShopNGo logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl shadow-md"
              />
              <span className="font-display text-lg font-bold text-teal-900 dark:text-teal-300">
                Shop<span className="text-teal-600">NGo</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
              Discover. Understand. Compare. Buy. Track.
            </p>
            {/* Trust badges */}
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Trust signals">
              {["Verified sellers", "Secure checkout", "Order tracking"].map(
                (label) => (
                  <li
                    key={label}
                    className="rounded-full border border-teal-200 bg-teal-50/80 px-2.5 py-1 text-[11px] font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300"
                  >
                    {label}
                  </li>
                )
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800/80 dark:text-teal-500/90">
              Shop
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-gray-600 dark:text-zinc-400">
              <li>
                <Link href="/search" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800/80 dark:text-teal-500/90">
              Account
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-gray-600 dark:text-zinc-400">
              <li>
                <FooterAuthLink />
              </li>
              <li>
                <Link href="/account" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Orders
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800/80 dark:text-teal-500/90">
              Sell
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-gray-600 dark:text-zinc-400">
              <li>
                <Link href="/seller/apply" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Become a seller
                </Link>
              </li>
              <li>
                <Link href="/seller/listings" className="hover:text-teal-700 dark:hover:text-teal-400">
                  Manage listings
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200/90 pt-6 text-center text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-500">
          <p>
            <Link href="/about" className="underline hover:text-teal-700 dark:hover:text-teal-400">About us</Link>
            {" · "}
            <Link href="/privacy" className="underline hover:text-teal-700 dark:hover:text-teal-400">Privacy Policy</Link>
            {" · "}
            <Link href="/terms" className="underline hover:text-teal-700 dark:hover:text-teal-400">Terms and Conditions</Link>
          </p>
          <p className="mt-2">
            © <CopyrightYear initialYear={new Date().getFullYear()} /> ShopNGo. Built by Kuldeep Behera, Pankaj Gupta and
            Jaskaran Singh. Academic minor project, final year.
          </p>
          <div className="mt-1">
            <AnalyticsPreferencesButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
