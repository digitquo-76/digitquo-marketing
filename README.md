# DigitQuo Store

DigitQuo Store is a Next.js marketplace app for sellers, brokers, and platform admins. It includes a public landing page, Supabase authentication, role-specific dashboards, product inventory, broker sales, and payout claims.

## Pages

- `/` - Public landing page with features, process, roles, testimonials, and call-to-action sections.
- `/seller` - Seller workspace for managing products, inventory, and sales activity.
- `/broker` - Broker workspace for browsing seller inventory, placing customer orders, and claiming rewards.
- `/admin` - Owner/admin workspace for monitoring marketplace activity, products, transactions, and payout claims.

## Project Structure

- `src/app/(marketing)` - Public marketing route and layout.
- `src/app/(auth)` - Login and registration routes.
- `src/app/(dashboard)` - Seller, broker, and admin dashboard routes.
- `src/components` - Shared UI, marketing sections, and dashboard screens.
- `src/lib/supabase.ts` - Supabase browser client.
- `src/lib/store.ts` - Client data store and Supabase read/write actions.
- `database.sql` - Supabase schema, constraints, indexes, and RLS policies.

## Run Locally

Install dependencies:

```powershell
npm.cmd install
```

Create an environment file:

```powershell
Copy-Item .env.example .env.local
```

Then fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Apply `database.sql` in the Supabase SQL editor before signing users up.
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` are used by the server routes that email sellers and broker invoices after paid orders.
`NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are used to create and verify Razorpay payments before broker orders are saved.

Start the Next.js development server:

```powershell
npm.cmd run dev -- --port 3002
```

Then visit:

```text
http://127.0.0.1:3002/
```

Build for production:

```powershell
npm.cmd run build
```

Start the production server after a build:

```powershell
npm.cmd run start -- --port 3002
```

## Notes

- Next.js generates the browser document; there is no handwritten `.html` source file.
- Dashboard data is stored in Supabase with Row Level Security enabled by `database.sql`.
- Admin routes include `noindex` response headers and client-side role redirects. Supabase RLS remains the source of truth for data access.
- Create the first admin profile manually in Supabase after registering the owner account, then keep public registration limited to seller and broker roles.
