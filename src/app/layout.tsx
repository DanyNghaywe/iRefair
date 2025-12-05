import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { NavigationLoaderProvider } from "@/components/NavigationLoader";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "irefair | Request a job referral",
  description:
    "Submit your profile and request job referrals with the irefair candidate experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <NavigationLoaderProvider>{children}</NavigationLoaderProvider>
      </body>
    </html>
  );
}
