import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOG OMS - Meeting Management',
  description: 'AI-powered meeting orchestration with Google Meet and Gemini',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
