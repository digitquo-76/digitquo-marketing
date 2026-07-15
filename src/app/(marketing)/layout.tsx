import '../../styles/app.css';
import { ProductNoticePopup } from '../../components/ui/ProductNoticePopup';

export const metadata = {
  title: 'DigitQuo Store - The Smarter Way to Market & Sell',
  description: 'DigitQuo Store connects sellers and brokers on one seamless platform. List products, find buyers, and grow your business effortlessly.'
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-route="landing" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ProductNoticePopup />
        {children}
      </body>
    </html>
  );
}
