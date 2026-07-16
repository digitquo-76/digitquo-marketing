import '../../styles/dashboard.css';
import '../../styles/skeleton.css';

export const metadata = {
  title: 'DigitQuo Store - Dashboard',
  description: 'Manage your DigitQuo Store account.'
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="dashboard-route">{children}</div>;
}
