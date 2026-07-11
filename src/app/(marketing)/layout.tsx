import '../../styles/app.css';

export const metadata = {
  title: 'DigitQuo - The Smarter Way to Market & Sell',
  description: 'DigitQuo connects sellers and brokers on one seamless platform. List products, find buyers, and grow your business effortlessly.'
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-route="landing" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
