import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type SaleRow = {
  id: string;
  product_id: string;
  product_name: string;
  seller: string;
  customer: string;
  customer_phone: string;
  customer_address: string;
  order_notes: string;
  selected_option_label: string;
  selected_option_value: string;
  quantity: number;
  unit_price: number;
  total: number;
  points: number;
  broker: string;
  created_at: string;
};

type SellerProfile = {
  email: string;
  display_name: string | null;
  business_name: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || '';

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json({ sent: false, reason: 'Supabase server credentials are not configured.' }, { status: 200 });
  }

  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing broker authorization.' }, { status: 401 });
  }

  const { orderId } = await request.json().catch(() => ({ orderId: '' }));
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'Order id is required.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });

  const { data: visibleOrder, error: visibleOrderError } = await userClient
    .from('sales')
    .select('id')
    .eq('id', orderId)
    .single();

  if (visibleOrderError || !visibleOrder) {
    return NextResponse.json({ error: 'Order was not found for this broker.' }, { status: 404 });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: order, error: orderError } = await serviceClient
    .from('sales')
    .select('*')
    .eq('id', orderId)
    .single<SaleRow>();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Could not load order details.' }, { status: 500 });
  }

  const seller = await findSellerProfile(serviceClient, order.seller);
  if (!seller?.email) {
    return NextResponse.json({ sent: false, reason: 'Seller email was not found.' }, { status: 200 });
  }

  if (!resendApiKey || !resendFromEmail) {
    return NextResponse.json({ sent: false, reason: 'Email provider is not configured.' }, { status: 200 });
  }

  const sellerName = seller.business_name || seller.display_name || order.seller;
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: seller.email,
      subject: `New DigitQuo Store order: ${order.product_name}`,
      html: buildOrderEmailHtml(order, sellerName),
      text: buildOrderEmailText(order, sellerName)
    })
  });

  if (!emailResponse.ok) {
    const details = await emailResponse.text().catch(() => '');
    return NextResponse.json({ sent: false, reason: details || 'Email provider rejected the message.' }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}

async function findSellerProfile(serviceClient: SupabaseClient, sellerName: string) {
  const fields = ['business_name', 'display_name', 'email'] as const;

  for (const field of fields) {
    const { data } = await serviceClient
      .from('profiles')
      .select('email, display_name, business_name')
      .eq('role', 'seller')
      .eq(field, sellerName)
      .limit(1)
      .maybeSingle<SellerProfile>();

    if (data) return data;
  }

  return null;
}

function buildOrderEmailHtml(order: SaleRow, sellerName: string) {
  const rows = [
    ['Product', order.product_name],
    ['Quantity', String(order.quantity)],
    ...(order.selected_option_value ? [[order.selected_option_label || 'Option', order.selected_option_value]] : []),
    ['Broker', order.broker],
    ['Customer', order.customer],
    ['Customer phone', order.customer_phone],
    ['Delivery address', order.customer_address],
    ['Order notes', order.order_notes || 'None'],
    ['Total', formatRupees(order.total)]
  ];

  return `
    <div style="font-family:Arial,sans-serif;color:#171321;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">New order placed</h1>
      <p style="margin:0 0 18px">Hi ${escapeHtml(sellerName)}, a broker placed an order for one of your products.</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:620px">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="border:1px solid #e8e1f1;padding:10px;font-weight:700;width:170px">${escapeHtml(label)}</td>
            <td style="border:1px solid #e8e1f1;padding:10px">${escapeHtml(value)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function buildOrderEmailText(order: SaleRow, sellerName: string) {
  return [
    `Hi ${sellerName},`,
    '',
    'A broker placed a new DigitQuo Store order.',
    '',
    `Product: ${order.product_name}`,
    `Quantity: ${order.quantity}`,
    ...(order.selected_option_value ? [`${order.selected_option_label || 'Option'}: ${order.selected_option_value}`] : []),
    `Broker: ${order.broker}`,
    `Customer: ${order.customer}`,
    `Customer phone: ${order.customer_phone}`,
    `Delivery address: ${order.customer_address}`,
    `Order notes: ${order.order_notes || 'None'}`,
    `Total: ${formatRupees(order.total)}`
  ].join('\n');
}

function formatRupees(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
