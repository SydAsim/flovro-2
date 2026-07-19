import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Flovro — AI Voice Agents & Business Automation",
    description:
      "Flovro builds AI voice agents, connected automations, and modern digital products that keep businesses responsive and moving.",
    openGraph: {
      title: "Flovro — Every conversation. Every workflow. In motion.",
      description:
        "AI voice agents, connected automations, and digital products for businesses that refuse to stand still.",
      type: "website",
      images: [{ url: socialImage, width: 1732, height: 909, alt: "Flovro signal core" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Flovro — Intelligent systems that move business forward",
      description:
        "AI voice agents, connected automations, and modern digital products.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
