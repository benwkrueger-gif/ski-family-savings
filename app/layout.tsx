import type { Metadata } from "next";
import { Barlow, Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const title =
  "Free Ski Family Savings Scan | Find Out How Much Your Family Could Save";
const description =
  "Tell me a little about your family and how you ski. I'll start digging and tell you if I find meaningful savings, and roughly how much. For free.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title: "How much could your family save on skiing this winter?",
    description:
      "Get a free personalized Ski Family Savings Scan and find out how much potential savings may be available to your family.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "How much could your family save on skiing this winter?",
    description:
      "Get a free personalized Ski Family Savings Scan and find out how much potential savings may be available to your family.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-text">
        {children}
      </body>
    </html>
  );
}
