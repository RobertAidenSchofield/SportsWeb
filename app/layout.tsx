import type { Metadata, Viewport } from 'next';
import { Navbar } from '@/components/Navbar';
import { PwaRegister } from '@/components/PwaRegister';
import { InstallPwaPrompt } from '@/components/InstallPwaPrompt';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Sports Digest | Personalized Weekly Sports Schedule',
  description:
    'Never miss a game. Get your personalized weekly kickoff schedule, broadcast networks, and matchups delivered straight to your inbox.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sports Digest',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark' suppressHydrationWarning>
      <body
        className='bg-[#090d16] text-gray-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-gray-950 overflow-x-hidden'
        suppressHydrationWarning
      >
        <PwaRegister />
        <Navbar />
        <main className='pb-12'>{children}</main>
        <InstallPwaPrompt />
      </body>
    </html>
  );
}
