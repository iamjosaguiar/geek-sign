import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Geek Sign - Free E-Signatures | DocuSign Alternative",
    template: "%s | Geek Sign",
  },
  description:
    "Geek Sign is the easiest way to send and sign documents online—completely free. Send unlimited documents for e-signature, track status in real time, and streamline your workflow.",
  keywords: [
    "e-signature",
    "electronic signature",
    "document signing",
    "free esign",
    "docusign alternative",
    "pdf signing",
  ],
  authors: [{ name: "House of Geeks" }],
  creator: "House of Geeks",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Geek Sign - Free E-Signatures | DocuSign Alternative",
    description:
      "Geek Sign is the easiest way to send and sign documents online—completely free. Send unlimited documents for e-signature, track status in real time.",
    siteName: "Geek Sign",
  },
  twitter: {
    card: "summary_large_image",
    title: "Geek Sign - Free E-Signatures | DocuSign Alternative",
    description:
      "Geek Sign is the easiest way to send and sign documents online—completely free.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
