import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#183b2b",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.juicewala.shop"),
  title: {
    default: "JuiceWala | 100% Raw Packed Juices (juicewala.shop)",
    template: "%s | JuiceWala",
  },
  description:
    "Order 100% pure, raw, and fresh juices online from JuiceWala (juicewala / juice wala / जूसवाला). Made from fresh fruits and vegetables with no added water, sugar, or preservatives. Fast doorstep delivery in Bhiwani.",
  keywords: [
    "juicewala",
    "juice wala",
    "JuiceWala",
    "Juice Wala",
    "juicewala.shop",
    "juicewala shop",
    "juice wala shop",
    "juicewala online",
    "juice wala online",
    "juicewala bhiwani",
    "juice wala bhiwani",
    "juice-wala",
    "जूसवाला",
    "जूस वाला",
    "fresh juice",
    "raw cold-pressed juice",
    "pure juice delivery",
    "fresh fruit juice",
    "Bhiwani juice delivery",
    "pure juice",
    "raw packed juice",
  ],
  authors: [{ name: "JuiceWala" }],
  creator: "JuiceWala",
  publisher: "JuiceWala",
  alternates: {
    canonical: "https://www.juicewala.shop",
  },
  openGraph: {
    title: "JuiceWala (juicewala) | 100% Raw Packed Juices",
    description:
      "Order 100% pure, raw, and fresh juices online from JuiceWala (juicewala / juice wala / जूसवाला). Zero added water, sugar, or preservatives. Fast delivery in Bhiwani.",
    url: "https://www.juicewala.shop",
    siteName: "JuiceWala (juicewala)",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "JuiceWala (juicewala) Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JuiceWala (juicewala) | 100% Raw Packed Juices",
    description:
      "Order 100% pure, raw, and fresh juices online from JuiceWala (juicewala / juice wala / जूसवाला). Fast doorstep delivery in Bhiwani.",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "JuiceWala",
  legalName: "JuiceWala",
  alternateName: [
    "juicewala",
    "Juice Wala",
    "juice wala",
    "juicewala.shop",
    "juice-wala",
    "जूसवाला",
    "जूस वाला",
  ],
  url: "https://www.juicewala.shop",
  logo: "https://www.juicewala.shop/icon-512.png",
  image: "https://www.juicewala.shop/icon-512.png",
  description:
    "Order 100% pure, raw, and fresh juices online from JuiceWala (juicewala / juice wala / जूसवाला). Made from fresh fruits and vegetables with no added water, sugar, or preservatives.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bhiwani",
    addressRegion: "Haryana",
    postalCode: "127021",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-9896962782",
    contactType: "customer service",
    areaServed: "IN",
  },
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "JuiceWala",
  alternateName: [
    "juicewala",
    "Juice Wala",
    "juice wala",
    "juicewala.shop",
    "juice-wala",
    "जूसवाला",
    "जूस वाला",
  ],
  url: "https://www.juicewala.shop",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.juicewala.shop/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  "@id": "https://www.juicewala.shop/#store",
  name: "JuiceWala",
  alternateName: [
    "juicewala",
    "Juice Wala",
    "juice wala",
    "juicewala.shop",
    "juice-wala",
    "जूसवाला",
    "जूस वाला",
  ],
  url: "https://www.juicewala.shop",
  telephone: "+91-9896962782",
  priceRange: "₹20 - ₹150",
  servesCuisine: "Fresh Juices, Fruit Shakes, Raw Cold-Pressed Juices",
  image: "https://www.juicewala.shop/icon-512.png",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bhiwani",
    addressRegion: "Haryana",
    postalCode: "127021",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
