import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
