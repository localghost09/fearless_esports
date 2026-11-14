import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/sora";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SiteFooter, SiteHeader } from "@/components/shell/site-chrome";
import { BottomNav } from "@/components/shell/bottom-nav";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: "FEARLESS ESPORTS — Daily BGMI scrims. Real slots. Real payouts.",
    template: "%s · FEARLESS ESPORTS",
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "BGMI scrims",
    "BGMI tournaments India",
    "daily scrims",
    "esports slots",
    "BGMI points table",
    "custom room",
    "scrims today",
  ],
  authors: [{ name: BRAND.name }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: BRAND.name,
    title: "FEARLESS ESPORTS — Daily BGMI scrims",
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "FEARLESS ESPORTS — Daily BGMI scrims",
    description: BRAND.description,
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-dvh bg-ink font-sans text-mist antialiased">
        <AppProvider>
          <ToastProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <BottomNav />
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
