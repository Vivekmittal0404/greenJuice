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
  metadataBase: new URL("https://www.juicewala.shop"),
  title: "JuiceWala | 100% Raw Packed Juices",
  description:
    "Order 100% pure, raw, and fresh juices online from JuiceWala. Made from fresh fruits and vegetables with no added water, sugar, or preservatives. Fast delivery to your doorstep.",
  keywords: [
    "JuiceWala",
    "fresh juice",
    "raw cold-pressed juice",
    "pure juice delivery",
    "fresh fruit juice",
    "Bhiwani juice delivery",
  ],
  authors: [{ name: "JuiceWala" }],
  creator: "JuiceWala",
  publisher: "JuiceWala",
  openGraph: {
    title: "JuiceWala | 100% Raw Packed Juices",
    description:
      "Order 100% pure, raw, and fresh juices online from JuiceWala. Made from fresh fruits and vegetables with no added water, sugar, or preservatives. Fast delivery to your doorstep.",
    url: "https://www.juicewala.shop",
    siteName: "JuiceWala",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "JuiceWala Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JuiceWala | 100% Raw Packed Juices",
    description:
      "Order 100% pure, raw, and fresh juices online from JuiceWala. Made from fresh fruits and vegetables with no added water, sugar, or preservatives.",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
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
