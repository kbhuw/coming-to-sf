import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  icons: { icon: '/coming-to-sf/icon.svg' },
  title: 'Coming to SF — What’s coming around you?',
  description: 'Explore upcoming San Francisco development, housing and transportation projects, colored by published completion estimates.',
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
        <a className="puffle-badge" href="https://puffle.ai" target="_blank" rel="noreferrer"><img src="/coming-to-sf/puffle-logo.svg" alt="" width="22" height="22"/>made with <strong>puffle.ai</strong></a>
      </body>
    </html>
  );
}
