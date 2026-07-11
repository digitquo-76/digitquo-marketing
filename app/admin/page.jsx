import App from '../../src/App.jsx';

export const metadata = {
  title: 'Owner Admin Panel - DigitQuo',
  description: 'Private DigitQuo marketplace administration workspace.',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPage() {
  return <App route="admin" />;
}
