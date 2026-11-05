"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/identity/AuthProvider";
import { useTheme } from "@/features/theme/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui";
import { RotatingLogo } from "@/features/brand/RotatingLogo";

const navLinks = [
  { href: "/search", label: "Search" },
  { href: "/categories", label: "Categories" },
  { href: "/for-you", label: "For you" },
  { href: "/cart", label: "Cart" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { appUser, firebaseUser, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const isSeller = appUser?.roles.includes("SELLER");
  const isDriver = appUser?.roles.includes("DELIVERY_PARTNER");
  const isModerator =
    appUser?.roles.includes("MODERATOR") || appUser?.roles.includes("ADMIN");

  const signedIn = Boolean(appUser || firebaseUser);
  const who = appUser?.displayName || appUser?.email || firebaseUser?.displayName || firebaseUser?.email || "there";
  const greeting = signedIn ? `Hi, ${who.split(" ")[0]}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-white/95 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <RotatingLogo />
          <span className="font-display text-lg font-bold tracking-tight text-teal-900 dark:text-teal-300 sm:text-xl">
            Shop<span className="text-teal-600 dark:text-teal-400">NGo</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {isSeller && (
            <Link
              href="/seller/listings"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              My store
            </Link>
          )}
          {isSeller && (
            <Link
              href="/seller/orders"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Store orders
            </Link>
          )}
          {signedIn && !isSeller && (
            <Link
              href="/seller/apply"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sell
            </Link>
          )}
          {signedIn && (
            <Link
              href={isDriver ? "/delivery" : "/delivery/apply"}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isDriver ? "Deliveries" : "Deliver"}
            </Link>
          )}
          {isModerator && (
            <Link
              href="/moderator/activity"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Control centre
            </Link>
          )}
          {isModerator && (
            <Link
              href="/moderator/applications"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Review sellers
            </Link>
          )}
          {isModerator && (
            <Link
              href="/moderator/listings"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Review listings
            </Link>
          )}
          {isModerator && (
            <Link
              href="/insights"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Insights
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-teal-50 hover:text-teal-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {loading ? (
            <span className="text-sm text-gray-400">…</span>
          ) : signedIn ? (
            <>
              <Link
                href="/account"
                className="max-w-[140px] truncate rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {greeting}
              </Link>
              <Link href="/orders">
                <Button variant="ghost" size="sm">
                  Orders
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/auth/sign-in">
              <Button
                size="md"
                className="min-w-[100px] bg-teal-600 px-5 text-base font-semibold shadow-md shadow-teal-700/20 hover:bg-teal-500"
              >
                Sign in
              </Button>
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          "border-t border-teal-100 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {signedIn &&
            [
              { href: "/orders", label: "My orders" },
              { href: "/account", label: "My account" },
              ...(isSeller
                ? [
                    { href: "/seller/listings", label: "My store" },
                    { href: "/seller/orders", label: "Store orders" },
                  ]
                : [{ href: "/seller/apply", label: "Sell on ShopNGo" }]),
              { href: isDriver ? "/delivery" : "/delivery/apply", label: isDriver ? "My deliveries" : "Become a delivery partner" },
              ...(isModerator
                ? [
                    { href: "/moderator/activity", label: "Control centre" },
                    { href: "/moderator/applications", label: "Review sellers" },
                    { href: "/moderator/listings", label: "Review listings" },
                    { href: "/insights", label: "Insights" },
                  ]
                : []),
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          <button
            type="button"
            className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => {
              toggle();
              setOpen(false);
            }}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="mt-2 border-t border-gray-100 pt-3 dark:border-zinc-800">
            {signedIn ? (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-teal-50 dark:text-zinc-300"
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/auth/sign-in"
                className="block rounded-xl bg-teal-600 px-4 py-3 text-center text-base font-semibold text-white shadow-md"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
