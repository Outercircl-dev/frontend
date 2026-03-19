import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { Toaster } from "@/components/ui/sonner";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://outercircl.com'),
  applicationName: 'OuterCircl',
  title: {
    default: 'OuterCircl',
    template: '%s | OuterCircl',
  },
  description:
    'OuterCircl helps you discover and join trusted local activities, events, and communities.',
  keywords: [
    'OuterCircl',
    'local activities',
    'community events',
    'meetups',
    'social discovery',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'OuterCircl',
    description:
      'Discover and join trusted local activities, from fitness groups to family meetups.',
    siteName: 'OuterCircl',
    images: [
      {
        url: '/landing/connect-friends.svg',
        width: 1200,
        height: 760,
        alt: 'OuterCircl activity friends',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OuterCircl',
    description:
      'Discover and join trusted local activities, from fitness groups to family meetups.',
    images: ['/landing/connect-friends.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/next.svg',
    shortcut: '/next.svg',
    apple: '/next.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <NotificationsDrawer />
        <Toaster />
      </body>
    </html>
  );
}
