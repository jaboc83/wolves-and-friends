import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: 'device-width', initialScale: 1 };

export const metadata: Metadata = {
  title: "Wolves and Friends — Your Sports Hub",
  description: "The latest stories, scores and upcoming games for your teams, all in one place.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
