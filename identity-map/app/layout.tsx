import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Identity Map',
  description: 'Workshop tool for exploring identity similarities',
};

/**
 * The root layout for all pages. It sets the html language and wraps
 * the application in a minimal body element. See Next.js App Router
 * documentation for details.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}