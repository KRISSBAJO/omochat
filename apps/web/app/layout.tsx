import type { Metadata } from "next";
import { Manrope, Merienda } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omochat",
  description: "Realtime chat for people and teams."
};

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Merienda({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display"
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
