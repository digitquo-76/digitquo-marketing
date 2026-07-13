import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
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
  quantity: number;
  unit_price: number;
  total: number;
  points: number;
  broker: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

type ProfileRow = {
  email: string;
  display_name: string | null;
  business_name: string | null;
  role?: string;
  onboarding_complete?: boolean | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || '';

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 500 });
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({ error: 'Razorpay credentials are not configured.' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing broker authorization.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payment = body?.payment || {};
  const order = body?.order || {};
  const razorpayOrderId = cleanString(payment.razorpay_order_id);
  const razorpayPaymentId = cleanString(payment.razorpay_payment_id);
  const razorpaySignature = cleanString(payment.razorpay_signature);

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: 'Complete Razorpay payment details are required.' }, { status: 400 });
  }

  if (!isValidRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
  }

  const quantity = Number(order.quantity || 0);
  const productId = cleanString(order.productId);
  const customer = cleanString(order.customer);
  const customerPhone = cleanString(order.customerPhone);
  const customerAddress = cleanString(order.customerAddress);
  const orderNotes = cleanString(order.orderNotes);

  if (!productId || !Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Product and valid quantity are required.' }, { status: 400 });
  }

  if (!customer || !customerPhone || !customerAddress) {
    return NextResponse.json({ error: 'Customer name, phone, and address are required.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Broker authorization is invalid.' }, { status: 401 });
  }

  const { data: brokerProfile, error: brokerProfileError } = await userClient
    .from('profiles')
    .select('email, display_name, business_name, role, onboarding_complete')
    .eq('id', userData.user.id)
    .single<ProfileRow>();

  if (brokerProfileError || !brokerProfile || brokerProfile.role !== 'broker' || !brokerProfile.onboarding_complete) {
    return NextResponse.json({ error: 'Only onboarded brokers can complete paid orders.' }, { status: 403 });
  }

  const brokerName = cleanString(brokerProfile.display_name || brokerProfile.email);
  if (!brokerName) {
    return NextResponse.json({ error: 'Broker profile is missing a display name or email.' }, { status: 400 });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: existingSale } = await serviceClient
    .from('sales')
    .select('*')
    .eq('razorpay_payment_id', razorpayPaymentId)
    .limit(1)
    .maybeSingle<SaleRow>();

  if (existingSale) {
    if (existingSale.broker !== brokerName) {
      return NextResponse.json({ error: 'This payment has already been used for another broker order.' }, { status: 409 });
    }

    return NextResponse.json({ sale: existingSale });
  }

  const razorpayOrder = await fetchRazorpayResource(`orders/${razorpayOrderId}`);
  const razorpayPayment = await fetchRazorpayResource(`payments/${razorpayPaymentId}`);

  if (!razorpayOrder || !razorpayPayment) {
    return NextResponse.json({ error: 'Could not confirm payment with Razorpay.' }, { status: 502 });
  }

  if (
    razorpayPayment.order_id !== razorpayOrderId ||
    !['captured', 'authorized'].includes(String(razorpayPayment.status || '')) ||
    Number(razorpayPayment.amount || 0) !== Number(razorpayOrder.amount || 0)
  ) {
    return NextResponse.json({ error: 'Razorpay payment details do not match this order.' }, { status: 400 });
  }

  if (cleanString(razorpayOrder.notes?.product_id) !== productId || Number(razorpayOrder.notes?.quantity || 0) !== quantity) {
    return NextResponse.json({ error: 'Payment does not match the selected product and quantity.' }, { status: 400 });
  }

  const { data: product, error: productError } = await userClient
    .from('products')
    .select('price, stock')
    .eq('id', productId)
    .single<{ price: number; stock: number }>();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
  }

  const expectedAmount = Math.round(Number(product.price) * quantity * 100);
  if (Number(razorpayOrder.amount || 0) !== expectedAmount) {
    return NextResponse.json({ error: 'Payment amount does not match the current order total.' }, { status: 400 });
  }

  const newOrderId = `ord_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const { data: sale, error: saleError } = await serviceClient.rpc('place_paid_order', {
    p_order_id: newOrderId,
    p_product_id: productId,
    p_customer: customer,
    p_customer_phone: customerPhone,
    p_customer_address: customerAddress,
    p_order_notes: orderNotes,
    p_quantity: quantity,
    p_broker: brokerName,
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId
  }).single<SaleRow>();

  if (saleError || !sale) {
    return NextResponse.json({ error: saleError?.message || 'Payment succeeded, but the order could not be saved.' }, { status: 500 });
  }

  if (sale.id === newOrderId) {
    await Promise.all([
      sendSellerOrderEmail(serviceClient, sale),
      sendBrokerInvoiceEmail(serviceClient, sale, razorpayPaymentId, razorpayOrderId)
    ]);
  }

  return NextResponse.json({ sale });
}

async function fetchRazorpayResource(path: string) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`
    }
  });

  if (!response.ok) return null;
  return response.json().catch(() => null);
}

function isValidRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function sendSellerOrderEmail(serviceClient: SupabaseClient, order: SaleRow) {
  const seller = await findProfileByName(serviceClient, 'seller', order.seller);
  if (!seller?.email || !isEmailConfigured()) return;

  const sellerName = seller.business_name || seller.display_name || order.seller;
  await sendEmail({
    to: seller.email,
    subject: `New DigitQuo Store order: ${order.product_name}`,
    html: buildOrderEmailHtml(order, sellerName),
    text: buildOrderEmailText(order, sellerName)
  });
}

async function sendBrokerInvoiceEmail(serviceClient: SupabaseClient, order: SaleRow, paymentId: string, razorpayOrderId: string) {
  const broker = await findProfileByName(serviceClient, 'broker', order.broker);
  if (!broker?.email || !isEmailConfigured()) return;

  const brokerName = broker.display_name || order.broker;
  await sendEmail({
    to: broker.email,
    subject: `Payment invoice for ${order.product_name}`,
    html: buildBrokerInvoiceHtml(order, brokerName, paymentId, razorpayOrderId),
    text: buildBrokerInvoiceText(order, brokerName, paymentId, razorpayOrderId)
  });
}

async function findProfileByName(serviceClient: SupabaseClient, role: 'seller' | 'broker', name: string) {
  const fields = role === 'seller' ? ['business_name', 'display_name', 'email'] as const : ['display_name', 'email'] as const;

  for (const field of fields) {
    const { data } = await serviceClient
      .from('profiles')
      .select('email, display_name, business_name')
      .eq('role', role)
      .eq(field, name)
      .limit(1)
      .maybeSingle<ProfileRow>();

    if (data) return data;
  }

  return null;
}

function isEmailConfigured() {
  return Boolean(resendApiKey && resendFromEmail);
}

async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      ...message
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Resend email failed:', details || response.statusText);
  }
}

function buildOrderEmailHtml(order: SaleRow, sellerName: string) {
  const rows = [
    ['Product', order.product_name],
    ['Quantity', String(order.quantity)],
    ['Broker', order.broker],
    ['Customer', order.customer],
    ['Customer phone', order.customer_phone],
    ['Delivery address', order.customer_address],
    ['Order notes', order.order_notes || 'None'],
    ['Total', formatRupees(order.total)]
  ];

  return `
    <div style="font-family:Arial,sans-serif;color:#171321;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">New paid order placed</h1>
      <p style="margin:0 0 18px">Hi ${escapeHtml(sellerName)}, a broker completed payment and placed an order for one of your products.</p>
      ${buildRows(rows)}
    </div>
  `;
}

function buildOrderEmailText(order: SaleRow, sellerName: string) {
  return [
    `Hi ${sellerName},`,
    '',
    'A broker completed payment and placed a new DigitQuo Store order.',
    '',
    `Product: ${order.product_name}`,
    `Quantity: ${order.quantity}`,
    `Broker: ${order.broker}`,
    `Customer: ${order.customer}`,
    `Customer phone: ${order.customer_phone}`,
    `Delivery address: ${order.customer_address}`,
    `Order notes: ${order.order_notes || 'None'}`,
    `Total: ${formatRupees(order.total)}`
  ].join('\n');
}

function buildBrokerInvoiceHtml(order: SaleRow, brokerName: string, paymentId: string, razorpayOrderId: string) {
  const rows = [
    ['Invoice/order ID', order.id],
    ['Razorpay payment ID', paymentId],
    ['Razorpay order ID', razorpayOrderId],
    ['Product', order.product_name],
    ['Seller', order.seller],
    ['Customer', order.customer],
    ['Quantity', String(order.quantity)],
    ['Unit price', formatRupees(order.unit_price)],
    ['Amount paid', formatRupees(order.total)],
    ['Reward points earned', String(order.points)]
  ];

  return `
    <div style="font-family:Arial,sans-serif;color:#171321;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">Payment invoice</h1>
      <p style="margin:0 0 18px">Hi ${escapeHtml(brokerName)}, your DigitQuo Store payment was successful.</p>
      ${buildRows(rows)}
    </div>
  `;
}

function buildBrokerInvoiceText(order: SaleRow, brokerName: string, paymentId: string, razorpayOrderId: string) {
  return [
    `Hi ${brokerName},`,
    '',
    'Your DigitQuo Store payment was successful.',
    '',
    `Invoice/order ID: ${order.id}`,
    `Razorpay payment ID: ${paymentId}`,
    `Razorpay order ID: ${razorpayOrderId}`,
    `Product: ${order.product_name}`,
    `Seller: ${order.seller}`,
    `Customer: ${order.customer}`,
    `Quantity: ${order.quantity}`,
    `Unit price: ${formatRupees(order.unit_price)}`,
    `Amount paid: ${formatRupees(order.total)}`,
    `Reward points earned: ${order.points}`
  ].join('\n');
}

function buildRows(rows: string[][]) {
  return `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:620px">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="border:1px solid #e8e1f1;padding:10px;font-weight:700;width:180px">${escapeHtml(label)}</td>
          <td style="border:1px solid #e8e1f1;padding:10px">${escapeHtml(value)}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function formatRupees(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function cleanString(value: unknown) {
  return String(value || '').trim();
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
