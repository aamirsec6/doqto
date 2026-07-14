import type { Metadata } from "next";
import { DM_Sans, Instrument_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DOQTO. Every minute, accounted for.",
  description:
    "Real-time intelligence that helps hospitals save the time they lose every day, starting with the minutes that decide whether a patient lives.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: "/icon.png",
  },
  openGraph: {
    title: "DOQTO. Every minute, accounted for.",
    description:
      "Real-time hospital intelligence. Built by doctors. Based in India.",
    images: ["/og-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSans.variable} scroll-smooth`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
