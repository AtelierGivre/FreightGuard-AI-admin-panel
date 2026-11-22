import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'FreightGuard AI — Demurrage Audit & Recovery',
  description: 'Audit container demurrage and detention invoices, recover wrongful charges.',
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
