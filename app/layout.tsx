import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  title: "AI Energy Calculator",
  description:
    "Research-based calculations using FLOP analysis and geographic carbon intensity. Estimate energy, cost, and carbon emissions for LLM inference.",
  openGraph: {
    title: "AI Energy Calculator",
    description:
      "Research-based calculations using FLOP analysis and geographic carbon intensity. Estimate energy, cost, and carbon emissions for LLM inference.",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AI Energy Calculator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Energy Calculator",
    description:
      "Research-based calculations using FLOP analysis and geographic carbon intensity. Estimate energy, cost, and carbon emissions for LLM inference.",
    images: [`${siteUrl}/og-image.png`],
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Open Graph and Twitter meta tags for fallback in case Next.js doesn't inject them */}
        <meta property="og:title" content="AI Energy Calculator" />
        <meta
          property="og:description"
          content="Research-based calculations using FLOP analysis and geographic carbon intensity. Estimate energy, cost, and carbon emissions for LLM inference."
        />
        <meta property="og:image" content={`${siteUrl}/og-image.png`} />
        <meta property="og:url" content={siteUrl} />
        <meta name="twitter:title" content="AI Energy Calculator" />
        <meta
          name="twitter:description"
          content="Research-based calculations using FLOP analysis and geographic carbon intensity. Estimate energy, cost, and carbon emissions for LLM inference."
        />
        <meta name="twitter:image" content={`${siteUrl}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
