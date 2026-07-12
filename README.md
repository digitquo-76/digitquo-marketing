# DigitQuo Marketing

DigitQuo Marketing is a React/Next.js marketing website for a marketplace that connects sellers and brokers. It includes a polished public landing page plus demo dashboard pages for sellers, brokers, and platform admins.

## Pages

- `/` - Public landing page with features, process, roles, testimonials, and call-to-action sections.
- `/seller` - Seller workspace for managing products, inventory, and sales activity.
- `/broker` - Broker workspace for browsing seller inventory and recording customer sales.
- `/admin` - Owner/admin workspace for monitoring marketplace activity, products, and transactions.

## Project Structure

- `app/layout.jsx` - Framework-generated document layout and global metadata.
- `app/page.jsx` - Public landing route.
- `app/seller/page.jsx`, `app/broker/page.jsx`, `app/admin/page.jsx` - Dashboard routes.
- `src/App.jsx` - Shared React UI, dashboards, demo data, and local state.
- `src/styles/app.css` - Global stylesheet entry for the full app.
- `src/styles/landing.css` - Landing page styles imported by `app.css`.
- `src/styles/panel.css` - Dashboard/panel styles imported by `app.css`.

## Run Locally

Install dependencies:

```powershell
npm.cmd install
```

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
- Demo dashboard data is stored in the browser with `localStorage`.
- The admin page is marked `noindex` and should be protected with server-side authentication before any real production use.
