import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IT OLD Content Factory',
  description: 'Auto-generate and publish developer content to TikTok / Facebook / Threads'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
