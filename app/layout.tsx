import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "generative-loaders/styles.css";
import "./globals.css";
import { AnalyticsBeacon } from "./components/analytics-beacon";

import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://generativeloaders.com"),
  alternates: { canonical: "/" },
  title: "Generative Loaders — text, inline, and image loaders for React",
  description: "Animated React loaders for text, inline, and image generation states.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], shortcut: "/favicon.svg" },
  openGraph: {
    title: "Generative Loaders",
    description: "Animated React loaders for text, inline, and image generation states.",
    images: [{ url: "/generative-loaders-og.png", width: 1536, height: 1024, alt: "Generative Loaders for React" }],
  },
  twitter: { card: "summary_large_image", title: "Generative Loaders", description: "Animated React loaders for text, inline, and image generation states.", images: ["/generative-loaders-og.png"] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <html lang="en" data-theme="dark" suppressHydrationWarning><head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()` }} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}><AnalyticsBeacon />{children}</body></html>;
}
