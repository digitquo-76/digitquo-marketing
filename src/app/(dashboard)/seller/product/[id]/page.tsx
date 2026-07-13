import { SellerDashboardPage } from '../../../../../components/dashboard/SellerDashboardPage';

export default async function SellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerDashboardPage section="product" productId={id} />;
}
