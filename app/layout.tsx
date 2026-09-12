import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sports Digest | Personalized Weekly Sports Schedule',
  description:
    'Never miss a game. Get your personalized weekly kickoff schedule, broadcast networks, and matchups delivered straight to your inbox.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  const content = (
    <html lang='en' className='dark' suppressHydrationWarning>
      <body
        className='bg-[#090d16] text-gray-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-gray-950'
        suppressHydrationWarning
      >
        <Navbar isClerkConfigured={isClerkConfigured} />
        <main>{children}</main>
      </body>
    </html>
  );

  if (isClerkConfigured) {
    return (
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}

