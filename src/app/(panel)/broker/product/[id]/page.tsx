import { BrokerPanelPage } from '../../../../../components/panel/BrokerPanelPage';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrokerPanelPage section="product" productId={id} />;
}
