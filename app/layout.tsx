import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Root & Ritual | 100% Raw Cold-Pressed Juices Delivered Everywhere",
  description:
    "Direct-to-doorstep raw cold-pressed juices, immunity boosters, and detox cleanses. Zero added sugar, zero water, 100% pure living produce delivered nationwide in temperature-controlled cold packs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
