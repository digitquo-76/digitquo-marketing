import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ClaimRow = {
  id: string;
  broker: string;
  points: number;
  status: string;
  payout_account_name: string | null;
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_ifsc: string | null;
  payout_upi: string | null;
  created_at: string;
};

type AdminProfile = {
  email: string | null;
  display_name: string | null;
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

  const { claimId } = await request.json().catch(() => ({ claimId: '' }));
  if (!claimId || typeof claimId !== 'string') {
    return NextResponse.json({ error: 'Claim id is required.' }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });

  const { data: visibleClaim, error: visibleClaimError } = await userClient
    .from('claims')
    .select('id')
    .eq('id', claimId)
    .single();

  if (visibleClaimError || !visibleClaim) {
    return NextResponse.json({ error: 'Claim was not found for this broker.' }, { status: 404 });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: claim, error: claimError } = await serviceClient
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single<ClaimRow>();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Could not load claim details.' }, { status: 500 });
  }

  const { data: adminProfiles, error: adminError } = await serviceClient
    .from('profiles')
    .select('email, display_name')
    .eq('role', 'admin')
    .returns<AdminProfile[]>();

  if (adminError) {
    return NextResponse.json({ error: 'Could not load admin recipients.' }, { status: 500 });
  }

  const adminEmails = Array.from(new Set(
    (adminProfiles || [])
      .map((profile) => profile.email?.trim())
      .filter((email): email is string => Boolean(email))
  ));

  if (adminEmails.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No admin email was found.' }, { status: 200 });
  }

  if (!resendApiKey || !resendFromEmail) {
    return NextResponse.json({ sent: false, reason: 'Email provider is not configured.' }, { status: 200 });
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: adminEmails,
      subject: `Commission claim initiated: ${claim.broker} requested ${formatRupees(claim.points)}`,
      html: buildClaimEmailHtml(claim),
      text: buildClaimEmailText(claim)
    })
  });

  if (!emailResponse.ok) {
    const details = await emailResponse.text().catch(() => '');
    return NextResponse.json({ sent: false, reason: details || 'Email provider rejected the message.' }, { status: 200 });
  }

  return NextResponse.json({ sent: true, recipients: adminEmails.length });
}

function buildClaimEmailHtml(claim: ClaimRow) {
  const rows = buildClaimRows(claim);

  return `
    <div style="font-family:Arial,sans-serif;color:#171321;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">Commission claim initiated</h1>
      <p style="margin:0 0 18px">A broker has requested a manual commission payout. Review the claim and transfer details before marking it as paid.</p>
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

function buildClaimEmailText(claim: ClaimRow) {
  return [
    'A broker has initiated a commission payout claim.',
    '',
    ...buildClaimRows(claim).map(([label, value]) => `${label}: ${value}`)
  ].join('\n');
}

function buildClaimRows(claim: ClaimRow) {
  return [
    ['Claim ID', claim.id],
    ['Broker', claim.broker],
    ['Commission claimed', formatRupees(claim.points)],
    ['Status', claim.status],
    ['Account holder', claim.payout_account_name || 'Not added'],
    ['UPI ID', claim.payout_upi || 'Not added'],
    ['Bank name', claim.payout_bank_name || 'Not added'],
    ['Account number', claim.payout_account_number || 'Not added'],
    ['IFSC', claim.payout_ifsc || 'Not added'],
    ['Claimed on', formatDateTime(claim.created_at)]
  ];
}

function formatRupees(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
