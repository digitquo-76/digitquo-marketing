import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProductRow = {
  id: string;
  name: string;
  mrp: number;
  stock: number;
};

type ProfileRow = {
  role: string;
  onboarding_complete: boolean | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const SHIPPING_CHARGE = 50;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });
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
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const quantity = Number(body?.quantity || 0);

  if (!productId || !Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Product and valid quantity are required.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Broker authorization is invalid.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', userData.user.id)
    .single<ProfileRow>();

  if (profileError || !profile || profile.role !== 'broker' || !profile.onboarding_complete) {
    return NextResponse.json({ error: 'Only onboarded brokers can create payment orders.' }, { status: 403 });
  }

  const { data: product, error: productError } = await userClient
    .from('products')
    .select('id, name, mrp, stock')
    .eq('id', productId)
    .single<ProductRow>();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
  }

  if (product.stock < quantity) {
    return NextResponse.json({ error: `Only ${product.stock} units are available.` }, { status: 400 });
  }

  const productTotal = Number(product.mrp) * quantity;
  const orderTotal = productTotal + SHIPPING_CHARGE;
  const amount = Math.round(orderTotal * 100);
  const receipt = `dq_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        product_id: product.id,
        product_name: product.name,
        quantity: String(quantity),
        product_total: String(productTotal),
        shipping_charge: String(SHIPPING_CHARGE),
        total: String(orderTotal)
      }
    })
  });

  const data = await razorpayResponse.json().catch(() => null);
  if (!razorpayResponse.ok) {
    return NextResponse.json({ error: data?.error?.description || 'Could not create Razorpay order.' }, { status: 502 });
  }

  return NextResponse.json({
    keyId: razorpayKeyId,
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
    productName: product.name,
    productTotal,
    shippingCharge: SHIPPING_CHARGE,
    total: orderTotal
  });
}
