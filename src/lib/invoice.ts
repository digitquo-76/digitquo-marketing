import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMPANY_EMAIL, COMPANY_LOGO_PATH, COMPANY_NAME, COMPANY_PHONE } from './company';

export type InvoiceOrder = {
  id: string;
  product_name: string;
  seller: string;
  customer: string;
  customer_phone: string;
  customer_address: string;
  order_notes: string;
  selected_options?: unknown;
  selected_option_label?: string | null;
  selected_option_value?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  points: number;
  created_at: string;
};

type InvoiceDetails = {
  order: InvoiceOrder;
  brokerName: string;
  paymentId: string;
  razorpayOrderId: string;
};

type PdfFont = 'F1' | 'F2';
type PdfColor = [number, number, number];

const LOGO_CONTENT_ID = 'digitquo-logo';
const PURPLE: PdfColor = [0.286, 0.102, 0.42];
const DARK: PdfColor = [0.09, 0.075, 0.125];
const MUTED: PdfColor = [0.39, 0.36, 0.44];
const LIGHT: PdfColor = [0.969, 0.953, 0.98];
const BORDER: PdfColor = [0.898, 0.867, 0.925];
const WHITE: PdfColor = [1, 1, 1];
const GREEN: PdfColor = [0.075, 0.48, 0.27];

export { LOGO_CONTENT_ID };

export async function loadInvoiceLogo() {
  try {
    const path = join(process.cwd(), 'public', COMPANY_LOGO_PATH.replace(/^\/+/, ''));
    const logo = await readFile(path);
    if (logo.length < 4 || logo[0] !== 0xff || logo[1] !== 0xd8) return null;
    return logo;
  } catch (error) {
    console.error('DigitQuo invoice logo could not be loaded:', error);
    return null;
  }
}

export function buildBrokerInvoiceHtml(
  order: InvoiceOrder,
  brokerName: string,
  paymentId: string,
  razorpayOrderId: string,
  includeLogo = true
) {
  const totals = getInvoiceTotals(order);
  const choices = getSelectedOptions(order);
  const issuedOn = formatInvoiceDate(order.created_at);
  const choicesHtml = choices.length
    ? choices.map(({ label, value }) => `<div style="margin-top:4px;color:#665d70;font-size:13px"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join('')
    : '<div style="margin-top:4px;color:#8a8194;font-size:13px">No product choices</div>';

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      @media only screen and (max-width:600px) {
        .invoice-header { padding:22px 18px !important; }
        .invoice-padding { padding-left:18px !important; padding-right:18px !important; }
        .header-brand, .header-meta, .stack-cell { display:block !important; width:100% !important; box-sizing:border-box !important; }
        .header-meta { padding-top:18px !important; text-align:left !important; }
        .stack-gap { display:block !important; width:100% !important; height:10px !important; }
        .payment-summary { padding-top:20px !important; }
        .mobile-hide { display:none !important; }
        .mobile-only { display:block !important; }
        .item-table th, .item-table td { padding-left:8px !important; padding-right:8px !important; }
        .invoice-footer { padding-left:18px !important; padding-right:18px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f1f8;color:#171321;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;box-sizing:border-box;background:#f5f1f8;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e7deed;border-radius:16px;overflow:hidden">
            <tr>
              <td class="invoice-header" style="padding:28px 32px;background:#491a6b;color:#ffffff">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="header-brand" valign="middle">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          ${includeLogo ? `<td style="padding-right:14px"><img src="cid:${LOGO_CONTENT_ID}" alt="${COMPANY_NAME}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:12px;background:#ffffff;object-fit:contain"></td>` : ''}
                          <td valign="middle">
                            <div style="font-size:25px;line-height:1.1;font-weight:700">${COMPANY_NAME}</div>
                            <div style="margin-top:6px;font-size:13px;line-height:1.5;color:#eadff0">
                              <a href="tel:${COMPANY_PHONE}" style="color:#ffffff;text-decoration:none">${COMPANY_PHONE}</a><br>
                              <a href="mailto:${COMPANY_EMAIL}" style="color:#ffffff;text-decoration:none">${COMPANY_EMAIL}</a>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="header-meta" align="right" valign="middle">
                      <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#eadff0">Invoice</div>
                      <div style="margin-top:5px;font-size:16px;font-weight:700">${escapeHtml(order.id)}</div>
                      <div style="margin-top:9px"><span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#dff6e8;color:#176b3a;font-size:11px;font-weight:700;letter-spacing:.7px">PAID</span></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="invoice-padding" style="padding:28px 32px 8px">
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#504858">Hi ${escapeHtml(brokerName)}, your payment was successful. This invoice and the attached PDF confirm your DigitQuo order.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="stack-cell" width="48%" valign="top" style="padding:16px;background:#faf8fc;border:1px solid #e7deed;border-radius:10px">
                      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#7c598e;text-transform:uppercase">Bill to</div>
                      <div style="margin-top:8px;font-size:15px;font-weight:700">${escapeHtml(brokerName)}</div>
                      <div style="margin-top:4px;font-size:13px;color:#665d70">Broker account</div>
                    </td>
                    <td class="stack-gap" width="4%"></td>
                    <td class="stack-cell" width="48%" valign="top" style="padding:16px;background:#faf8fc;border:1px solid #e7deed;border-radius:10px">
                      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#7c598e;text-transform:uppercase">Deliver to</div>
                      <div style="margin-top:8px;font-size:15px;font-weight:700">${escapeHtml(order.customer)}</div>
                      <div style="margin-top:4px;font-size:13px;line-height:1.5;color:#665d70">${escapeHtml(order.customer_phone)}<br>${escapeHtml(order.customer_address)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="invoice-padding" style="padding:20px 32px 0">
                <table class="item-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e7deed;table-layout:auto">
                  <thead>
                    <tr style="background:#f4eef7;color:#4b2b5a">
                      <th align="left" style="padding:12px;font-size:11px;letter-spacing:.7px;text-transform:uppercase">Item</th>
                      <th align="center" style="padding:12px;font-size:11px;letter-spacing:.7px;text-transform:uppercase">Qty</th>
                      <th class="mobile-hide" align="right" style="padding:12px;font-size:11px;letter-spacing:.7px;text-transform:uppercase">Unit price</th>
                      <th align="right" style="padding:12px;font-size:11px;letter-spacing:.7px;text-transform:uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td valign="top" style="padding:15px 12px;border-top:1px solid #e7deed">
                        <div style="font-size:14px;font-weight:700;color:#171321">${escapeHtml(order.product_name)}</div>
                        <div style="margin-top:4px;font-size:13px;color:#665d70">Seller: ${escapeHtml(order.seller)}</div>
                        ${choicesHtml}
                        <div class="mobile-only" style="display:none;margin-top:4px;color:#665d70;font-size:13px"><strong>Unit price:</strong> ${formatRupees(order.unit_price)}</div>
                      </td>
                      <td align="center" valign="top" style="padding:15px 12px;border-top:1px solid #e7deed;font-size:14px">${order.quantity}</td>
                      <td class="mobile-hide" align="right" valign="top" style="padding:15px 12px;border-top:1px solid #e7deed;font-size:14px;white-space:nowrap">${formatRupees(order.unit_price)}</td>
                      <td align="right" valign="top" style="padding:15px 12px;border-top:1px solid #e7deed;font-size:14px;font-weight:700;white-space:nowrap">${formatRupees(totals.productTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td class="invoice-padding" style="padding:18px 32px 0">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="stack-cell" width="52%" valign="top" style="padding-right:22px">
                      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#7c598e;text-transform:uppercase">Payment details</div>
                      <div style="margin-top:9px;font-size:12px;line-height:1.65;color:#665d70;word-break:break-all">
                        <strong>Method:</strong> Razorpay<br>
                        <strong>Payment ID:</strong> ${escapeHtml(paymentId)}<br>
                        <strong>Razorpay order:</strong> ${escapeHtml(razorpayOrderId)}<br>
                        <strong>Issued:</strong> ${escapeHtml(issuedOn)}
                      </div>
                    </td>
                    <td class="stack-cell payment-summary" width="48%" valign="top">
                      ${buildEmailTotalRow('Subtotal', formatRupees(totals.productTotal))}
                      ${buildEmailTotalRow('Shipping', formatRupees(totals.shippingCharge))}
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:7px;border-top:2px solid #491a6b">
                        <tr>
                          <td style="padding:11px 0 0;font-size:15px;font-weight:700">Amount paid</td>
                          <td align="right" style="padding:11px 0 0;font-size:18px;font-weight:700;color:#491a6b">${formatRupees(order.total)}</td>
                        </tr>
                      </table>
                      <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#eef8f2;color:#176b3a;font-size:13px"><strong>Commission earned:</strong> ${formatRupees(order.points)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${order.order_notes ? `<tr><td class="invoice-padding" style="padding:20px 32px 0"><div style="padding:13px 15px;background:#faf8fc;border-left:3px solid #8a55a1;font-size:13px;line-height:1.5;color:#665d70"><strong style="color:#34273b">Order notes:</strong> ${escapeHtml(order.order_notes)}</div></td></tr>` : ''}
            <tr>
              <td class="invoice-footer" align="center" style="padding:26px 32px 30px">
                <div style="border-top:1px solid #e7deed;padding-top:18px;font-size:12px;line-height:1.6;color:#7d7487">
                  Thank you for using ${COMPANY_NAME}. Keep this invoice for your records.<br>
                  ${COMPANY_NAME} &nbsp;|&nbsp; <a href="tel:${COMPANY_PHONE}" style="color:#491a6b;text-decoration:none">${COMPANY_PHONE}</a> &nbsp;|&nbsp; <a href="mailto:${COMPANY_EMAIL}" style="color:#491a6b;text-decoration:none">${COMPANY_EMAIL}</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildBrokerInvoiceText(order: InvoiceOrder, brokerName: string, paymentId: string, razorpayOrderId: string) {
  const totals = getInvoiceTotals(order);
  const choices = getSelectedOptions(order);
  return [
    COMPANY_NAME.toUpperCase(),
    `Phone: ${COMPANY_PHONE}`,
    `Email: ${COMPANY_EMAIL}`,
    '',
    'PAYMENT INVOICE',
    `Invoice number: ${order.id}`,
    `Issued: ${formatInvoiceDate(order.created_at)}`,
    'Payment status: PAID',
    '',
    'BILL TO',
    brokerName,
    'Broker account',
    '',
    'DELIVER TO',
    order.customer,
    order.customer_phone,
    order.customer_address,
    '',
    'ITEM',
    `Product: ${order.product_name}`,
    `Seller: ${order.seller}`,
    ...choices.map(({ label, value }) => `${label}: ${value}`),
    `Quantity: ${order.quantity}`,
    `Unit price: ${formatRupees(order.unit_price)}`,
    `Subtotal: ${formatRupees(totals.productTotal)}`,
    `Shipping: ${formatRupees(totals.shippingCharge)}`,
    `Amount paid: ${formatRupees(order.total)}`,
    `Commission earned: ${formatRupees(order.points)}`,
    '',
    'PAYMENT DETAILS',
    'Method: Razorpay',
    `Payment ID: ${paymentId}`,
    `Razorpay order ID: ${razorpayOrderId}`,
    ...(order.order_notes ? ['', `Order notes: ${order.order_notes}`] : []),
    '',
    `Thank you for using ${COMPANY_NAME}. Keep this invoice for your records.`,
    `${COMPANY_NAME} | ${COMPANY_PHONE} | ${COMPANY_EMAIL}`
  ].join('\n');
}

export async function buildBrokerInvoicePdf(
  order: InvoiceOrder,
  brokerName: string,
  paymentId: string,
  razorpayOrderId: string,
  suppliedLogo?: Buffer | null
) {
  const logo = suppliedLogo === undefined ? await loadInvoiceLogo() : suppliedLogo;
  const pages = buildPdfPages({ order, brokerName, paymentId, razorpayOrderId }, Boolean(logo));
  return createPdf(pages, logo);
}

function buildPdfPages(details: InvoiceDetails, hasLogo: boolean) {
  const { order, brokerName, paymentId, razorpayOrderId } = details;
  const operations: string[] = [];
  const totals = getInvoiceTotals(order);
  const choices = getSelectedOptions(order);
  const text = (x: number, y: number, size: number, value: string, font: PdfFont = 'F1', color: PdfColor = DARK) => {
    operations.push(`${pdfColor(color)} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
  };
  const rightText = (right: number, y: number, size: number, value: string, font: PdfFont = 'F1', color: PdfColor = DARK) => {
    text(Math.max(40, right - estimatePdfTextWidth(value, size, font)), y, size, value, font, color);
  };
  const fillRect = (x: number, y: number, width: number, height: number, color: PdfColor) => {
    operations.push(`${pdfColor(color)} rg ${x} ${y} ${width} ${height} re f`);
  };
  const strokeRect = (x: number, y: number, width: number, height: number, color: PdfColor) => {
    operations.push(`${pdfColor(color)} RG 0.7 w ${x} ${y} ${width} ${height} re S`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: PdfColor, width = 0.7) => {
    operations.push(`${pdfColor(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  fillRect(0, 730, 595, 112, PURPLE);
  if (hasLogo) operations.push('q 64 0 0 64 40 752 cm /Logo Do Q');
  const companyX = hasLogo ? 119 : 42;
  text(companyX, 794, 24, COMPANY_NAME, 'F2', WHITE);
  text(companyX, 775, 9, COMPANY_PHONE, 'F1', WHITE);
  text(companyX, 760, 9, COMPANY_EMAIL, 'F1', WHITE);
  rightText(553, 798, 11, 'PAYMENT INVOICE', 'F2', WHITE);
  rightText(553, 779, 9, order.id, 'F1', WHITE);
  fillRect(497, 749, 56, 18, [0.86, 0.965, 0.9]);
  rightText(543, 754, 9, 'PAID', 'F2', GREEN);

  sectionCard(operations, 40, 638, 248, 70, 'BILL TO', [brokerName, 'Broker account']);
  const fullAddressLines = wrapPdfText(order.customer_address, 38);
  const addressLines = fullAddressLines.slice(0, 2);
  sectionCard(operations, 307, 638, 248, 70, 'DELIVER TO', [order.customer, order.customer_phone, ...addressLines]);

  fillRect(40, 598, 515, 25, LIGHT);
  strokeRect(40, 526, 515, 97, BORDER);
  text(51, 606, 9, 'ITEM', 'F2', PURPLE);
  text(365, 606, 9, 'QTY', 'F2', PURPLE);
  rightText(470, 606, 9, 'UNIT PRICE', 'F2', PURPLE);
  rightText(544, 606, 9, 'AMOUNT', 'F2', PURPLE);

  const fullDescriptionLines = [order.product_name, `Seller: ${order.seller}`, ...choices.map(({ label, value }) => `${label}: ${value}`)]
    .flatMap((value) => wrapPdfText(value, 43));
  const descriptionLines = fullDescriptionLines.length > 5
    ? [...fullDescriptionLines.slice(0, 4), 'See following page for complete item details.']
    : fullDescriptionLines;
  descriptionLines.forEach((value, index) => text(51, 580 - (index * 12), index === 0 ? 10 : 8.5, value, index === 0 ? 'F2' : 'F1', index === 0 ? DARK : MUTED));
  text(371, 579, 10, String(order.quantity));
  rightText(470, 579, 10, formatPdfMoney(order.unit_price));
  rightText(544, 579, 10, formatPdfMoney(totals.productTotal), 'F2');

  text(40, 497, 9, 'PAYMENT DETAILS', 'F2', PURPLE);
  text(40, 478, 8.5, 'Method: Razorpay', 'F1', MUTED);
  text(40, 463, 8.5, `Issued: ${formatInvoiceDate(order.created_at)}`, 'F1', MUTED);
  wrapPdfText(`Payment ID: ${paymentId}`, 53).slice(0, 2).forEach((value, index) => text(40, 448 - (index * 13), 8.5, value, 'F1', MUTED));
  wrapPdfText(`Razorpay order: ${razorpayOrderId}`, 53).slice(0, 2).forEach((value, index) => text(40, 416 - (index * 13), 8.5, value, 'F1', MUTED));

  const totalsX = 341;
  text(totalsX, 491, 9, 'Subtotal', 'F1', MUTED);
  rightText(555, 491, 9, formatPdfMoney(totals.productTotal), 'F1', DARK);
  text(totalsX, 470, 9, 'Shipping', 'F1', MUTED);
  rightText(555, 470, 9, formatPdfMoney(totals.shippingCharge), 'F1', DARK);
  line(totalsX, 458, 555, 458, PURPLE, 1.4);
  text(totalsX, 437, 11, 'AMOUNT PAID', 'F2', DARK);
  rightText(555, 435, 14, formatPdfMoney(order.total), 'F2', PURPLE);
  fillRect(totalsX, 397, 214, 25, [0.94, 0.978, 0.953]);
  text(totalsX + 10, 405, 9, 'Commission earned', 'F2', GREEN);
  rightText(545, 405, 9, formatPdfMoney(order.points), 'F2', GREEN);

  let notesBottom = 315;
  const fullNoteLines = order.order_notes ? wrapPdfText(order.order_notes, 93) : [];
  if (fullNoteLines.length) {
    const notes = fullNoteLines.slice(0, 3);
    const height = 25 + (notes.length * 12);
    fillRect(40, 365 - height, 515, height, LIGHT);
    text(51, 352, 9, 'ORDER NOTES', 'F2', PURPLE);
    notes.forEach((value, index) => text(51, 336 - (index * 12), 8.5, value, 'F1', MUTED));
    notesBottom = 350 - height;
  }

  text(40, Math.min(notesBottom, 315), 9, `Thank you for using ${COMPANY_NAME}. Keep this invoice for your records.`, 'F1', MUTED);
  line(40, 58, 555, 58, BORDER);
  text(40, 38, 8.5, COMPANY_NAME, 'F2', PURPLE);
  rightText(555, 38, 8.5, `${COMPANY_PHONE}  |  ${COMPANY_EMAIL}`, 'F1', MUTED);
  const pages = [`${operations.join('\n')}\n`];
  const needsContinuation = fullDescriptionLines.length > 5
    || fullAddressLines.length > 2
    || fullNoteLines.length > 3
    || wrapPdfText(brokerName, 39).length > 1
    || wrapPdfText(order.customer, 39).length > 1
    || wrapPdfText(`Payment ID: ${paymentId}`, 53).length > 2
    || wrapPdfText(`Razorpay order: ${razorpayOrderId}`, 53).length > 2;

  if (needsContinuation) pages.push(...buildPdfDetailPages(details, hasLogo));
  return pages;
}

function buildPdfDetailPages({ order, brokerName, paymentId, razorpayOrderId }: InvoiceDetails, hasLogo: boolean) {
  type DetailEntry = [label: string, value: string];
  const pages: string[] = [];
  let operations: string[] = [];
  let y = 0;
  let currentSection = '';

  const drawText = (x: number, baseline: number, size: number, value: string, font: PdfFont = 'F1', color: PdfColor = DARK) => {
    operations.push(`${pdfColor(color)} rg BT /${font} ${size} Tf ${x} ${baseline} Td (${escapePdfText(value)}) Tj ET`);
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: PdfColor, width = 0.7) => {
    operations.push(`${pdfColor(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const startPage = () => {
    operations = [`${pdfColor(PURPLE)} rg 0 760 595 82 re f`];
    if (hasLogo) operations.push('q 48 0 0 48 40 777 cm /Logo Do Q');
    const companyX = hasLogo ? 101 : 40;
    drawText(companyX, 807, 19, COMPANY_NAME, 'F2', WHITE);
    drawText(companyX, 789, 8.5, `${COMPANY_PHONE}  |  ${COMPANY_EMAIL}`, 'F1', WHITE);
    drawText(410, 807, 11, 'ORDER DETAILS', 'F2', WHITE);
    drawText(Math.max(310, 553 - estimatePdfTextWidth(order.id, 8.5, 'F1')), 789, 8.5, order.id, 'F1', WHITE);
    y = 730;
  };
  const finishPage = () => {
    drawLine(40, 58, 555, 58, BORDER);
    drawText(40, 38, 8.5, COMPANY_NAME, 'F2', PURPLE);
    drawText(355, 38, 8.5, `${COMPANY_PHONE}  |  ${COMPANY_EMAIL}`, 'F1', MUTED);
    pages.push(`${operations.join('\n')}\n`);
  };
  const continuePage = () => {
    finishPage();
    startPage();
    if (currentSection) {
      drawText(40, y, 9, `${currentSection} (CONTINUED)`, 'F2', PURPLE);
      y -= 20;
    }
  };
  const ensureSpace = (height: number) => {
    if (y - height < 78) continuePage();
  };
  const addSection = (title: string, entries: DetailEntry[]) => {
    currentSection = '';
    ensureSpace(34);
    currentSection = title;
    drawText(40, y, 9, title, 'F2', PURPLE);
    y -= 19;
    entries.forEach(([label, value]) => {
      const lines = wrapPdfText(`${label}: ${value || 'Not added'}`, 92);
      lines.forEach((line, index) => {
        ensureSpace(13);
        drawText(index === 0 ? 51 : 63, y, 9, line, index === 0 ? 'F2' : 'F1', index === 0 ? DARK : MUTED);
        y -= 13;
      });
      y -= 2;
    });
    y -= 9;
    currentSection = '';
  };

  startPage();
  addSection('INVOICE', [
    ['Invoice number', order.id],
    ['Status', 'Paid'],
    ['Issued', formatInvoiceDate(order.created_at)],
    ['Broker', brokerName]
  ]);
  addSection('ITEM AND PRODUCT CHOICES', [
    ['Product', order.product_name],
    ['Seller', order.seller],
    ['Quantity', String(order.quantity)],
    ...getSelectedOptions(order).map(({ label, value }) => [label, value] as DetailEntry),
    ['Unit price', formatPdfMoney(order.unit_price)],
    ['Subtotal', formatPdfMoney(getInvoiceTotals(order).productTotal)],
    ['Shipping', formatPdfMoney(getInvoiceTotals(order).shippingCharge)],
    ['Amount paid', formatPdfMoney(order.total)],
    ['Commission earned', formatPdfMoney(order.points)]
  ]);
  addSection('DELIVERY', [
    ['Customer', order.customer],
    ['Phone', order.customer_phone],
    ['Address', order.customer_address]
  ]);
  addSection('PAYMENT', [
    ['Method', 'Razorpay'],
    ['Payment ID', paymentId],
    ['Razorpay order ID', razorpayOrderId]
  ]);
  if (order.order_notes) addSection('ORDER NOTES', [['Notes', order.order_notes]]);
  finishPage();
  return pages;
}

function sectionCard(operations: string[], x: number, y: number, width: number, height: number, title: string, values: string[]) {
  operations.push(`${pdfColor(LIGHT)} rg ${x} ${y} ${width} ${height} re f`);
  operations.push(`${pdfColor(BORDER)} RG 0.7 w ${x} ${y} ${width} ${height} re S`);
  operations.push(`${pdfColor(PURPLE)} rg BT /F2 8.5 Tf ${x + 11} ${y + height - 17} Td (${escapePdfText(title)}) Tj ET`);
  const lines = values.flatMap((value, index) => wrapPdfText(value, 39).slice(0, index === values.length - 1 ? 2 : 1)).slice(0, 4);
  lines.forEach((value, index) => {
    const font = index === 0 ? 'F2' : 'F1';
    const size = index === 0 ? 10 : 8.5;
    const color = index === 0 ? DARK : MUTED;
    operations.push(`${pdfColor(color)} rg BT /${font} ${size} Tf ${x + 11} ${y + height - 35 - (index * 11)} Td (${escapePdfText(value)}) Tj ET`);
  });
}

function createPdf(contents: string[], logo: Buffer | null) {
  const logoObjectNumber = logo ? 5 : null;
  const firstPageObjectNumber = logo ? 6 : 5;
  const pageObjectNumbers = contents.map((_, index) => firstPageObjectNumber + (index * 2));
  const resources = `/Font << /F1 3 0 R /F2 4 0 R >>${logoObjectNumber ? ` /XObject << /Logo ${logoObjectNumber} 0 R >>` : ''}`;
  const objects: Buffer[] = [
    ascii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    ascii(`2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${contents.length} >>\nendobj\n`),
    ascii('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'),
    ascii('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n')
  ];

  if (logo) {
    objects.push(Buffer.concat([
      ascii(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width 1024 /Height 1024 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Interpolate true /Length ${logo.length} >>\nstream\n`),
      logo,
      ascii('\nendstream\nendobj\n')
    ]));
  }

  contents.forEach((content, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = pageObjectNumber + 1;
    const contentBuffer = Buffer.from(content, 'ascii');
    objects.push(ascii(`${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << ${resources} >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`));
    objects.push(Buffer.concat([
      ascii(`${contentObjectNumber} 0 obj\n<< /Length ${contentBuffer.length} >>\nstream\n`),
      contentBuffer,
      ascii('endstream\nendobj\n')
    ]));
  });

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const offsets: number[] = [];
  let cursor = header.length;
  objects.forEach((object) => {
    offsets.push(cursor);
    cursor += object.length;
  });

  const xrefOffset = cursor;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  ].join('');

  return Buffer.concat([header, ...objects, ascii(xref)]);
}

function getInvoiceTotals(order: InvoiceOrder) {
  const productTotal = Number(order.unit_price || 0) * Number(order.quantity || 0);
  return {
    productTotal,
    shippingCharge: Math.max(0, Number(order.total || 0) - productTotal)
  };
}

function getSelectedOptions(order: InvoiceOrder) {
  const parsed = parseSelectedOptions(order.selected_options);
  if (parsed.length) return parsed;
  const label = String(order.selected_option_label || '').trim();
  const value = String(order.selected_option_value || '').trim();
  return label && value ? [{ label, value }] : [];
}

function parseSelectedOptions(value: unknown): Array<{ label: string; value: string }> {
  if (typeof value === 'string') {
    try {
      return parseSelectedOptions(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const candidate = item as { label?: unknown; value?: unknown } | null;
      return {
        label: String(candidate?.label || '').trim(),
        value: String(candidate?.value || '').trim()
      };
    })
    .filter((item) => item.label && item.value);
}

function buildEmailTotalRow(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:5px 0;font-size:13px;color:#665d70">${escapeHtml(label)}</td><td align="right" style="padding:5px 0;font-size:13px">${escapeHtml(value)}</td></tr></table>`;
}

function formatRupees(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatPdfMoney(value: number) {
  return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
}

function formatInvoiceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function wrapPdfText(value: string, maxLength: number) {
  const words = toPdfSafeText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const chunks = words.flatMap((word) => {
    if (word.length <= maxLength) return [word];
    const result: string[] = [];
    for (let index = 0; index < word.length; index += maxLength) result.push(word.slice(index, index + maxLength));
    return result;
  });
  const lines: string[] = [];
  let current = '';
  chunks.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
}

function estimatePdfTextWidth(value: string, size: number, font: PdfFont) {
  return toPdfSafeText(value).length * size * (font === 'F2' ? 0.56 : 0.5);
}

function escapePdfText(value: string) {
  return toPdfSafeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toPdfSafeText(value: string) {
  return String(value || '').replace(/[^\x20-\x7E]/g, '').trim();
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pdfColor(color: PdfColor) {
  return color.map((value) => Number(value.toFixed(3))).join(' ');
}

function ascii(value: string) {
  return Buffer.from(value, 'ascii');
}
