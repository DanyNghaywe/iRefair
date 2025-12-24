import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { NavigationLoaderProvider } from "@/components/NavigationLoader";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    default: "iRefair | Request a job referral",
    template: "%s | iRefair",
  },
  description:
    "Submit your profile and request job referrals with the iRefair candidate experience. Connect with hiring teams in Canada.",
  keywords: ["job referral", "Canada jobs", "newcomers", "hiring", "career"],
  authors: [{ name: "iRefair" }],
  creator: "iRefair",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://irefair.com"),
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: "iRefair",
    title: "iRefair | Request a job referral",
    description: "A community-first referral initiative helping newcomers connect with hiring teams in Canada.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "iRefair - Request a job referral",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "iRefair | Request a job referral",
    description: "A community-first referral initiative helping newcomers connect with hiring teams in Canada.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <NavigationLoaderProvider>{children}</NavigationLoaderProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
