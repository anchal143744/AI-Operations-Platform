import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "AI Operations Platform — Controlled AI for Business Execution",
  description:
    "Turn B2B customer enquiries into structured, qualified, and followed-up opportunities through controlled AI workflows.",
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
