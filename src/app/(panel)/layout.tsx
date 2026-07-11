import '../../styles/app.css';

export const metadata = {
  title: 'DigitQuo - Panel',
  description: 'Manage your DigitQuo account.'
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-route="panel" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
