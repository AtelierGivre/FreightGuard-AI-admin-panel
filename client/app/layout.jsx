import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'FreightGuard AI — Demurrage Audit & Recovery',
  description:
    'Audit container demurrage and detention invoices, flag overcharges, and recover what you are owed.',
};

export const viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
