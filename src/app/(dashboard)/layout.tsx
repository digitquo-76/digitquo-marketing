import '../../styles/app.css';
import '../../styles/dashboard.css';
import '../../styles/skeleton.css';
import { ProductNoticePopup } from '../../components/ui/ProductNoticePopup';

export const metadata = {
  title: 'DigitQuo Store - Dashboard',
  description: 'Manage your DigitQuo Store account.'
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-route="dashboard" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <ProductNoticePopup />
        {children}
      </body>
    </html>
  );
}
