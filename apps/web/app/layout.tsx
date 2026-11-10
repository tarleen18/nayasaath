import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'NayaSaath | A new beginning', description: 'A thoughtful, privacy-first matrimonial platform for meaningful new beginnings.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en-IN"><body>{children}</body></html>; }
