import '../../styles/app.css';
import '../../styles/landing.css';
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
      </head>
      <body>
        <ProductNoticePopup />
        {children}
      </body>
    </html>
  );
}
