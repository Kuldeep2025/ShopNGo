import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/features/identity/AuthProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { SkipLink } from "@/components/a11y/SkipLink";
import { OnboardingHint } from "@/components/feedback/OnboardingHint";
import { FirebaseAnalytics } from "@/components/analytics/FirebaseAnalytics";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { AskShopNGo } from "@/components/ai/AskShopNGo";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShopNGo",
    template: "%s · ShopNGo",
  },
  description: "Discover. Understand. Compare. Buy. Track.",
  manifest: "/manifest.json",
  applicationName: "ShopNGo",
  appleWebApp: {
    capable: true,
    title: "ShopNGo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: { "mobile-web-app-capable": "yes" },
  openGraph: {
    title: "ShopNGo",
    description: "Discover. Understand. Compare. Buy. Track.",
    images: ["/og-image.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)] antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <SkipLink />
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <Footer />
            <OnboardingHint />
            <FirebaseAnalytics />
            <PwaProvider />
            <AskShopNGo />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}