import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "AI Operations Platform — Controlled AI for Business Execution",
  description:
    "Turn B2B customer enquiries into structured, qualified, and followed-up opportunities through controlled AI workflows.",
  applicationName: "AI Operations Platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="has-smooth-scroll" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
