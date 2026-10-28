# Root & Ritual

A responsive juice storefront built with Next.js. Customers in Bhiwani can order Green Juice (Rs 60) or Sweet Lime Juice (Rs 100) per medium glass, submit delivery details, and pay securely with Razorpay or choose cash on delivery. Delivery is Rs 40 per order. New orders are stored in Supabase with payment status `pending`.

The shopping bag and a local order history persist in the current browser. The “My orders” list is device-local (not synced across browsers or devices), and clearing browser storage removes it; order records remain in Supabase for the store.

## Local setup

1. Install Node.js 20.9 or later.
2. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. If the table already exists, run the script again to apply the required `service_role` grants.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in `.env.local` or your host's environment settings. Keep the Razorpay secret and Supabase key server-only. Use Razorpay test credentials during development. Legacy projects may use `SUPABASE_SERVICE_ROLE_KEY` instead.
4. For order email alerts, set `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL` (the store's Gmail inbox), and `RESEND_FROM_EMAIL` in `.env.local`. Keep the API key server-only. Verify the sender domain/address in Resend before sending to the store inbox.
5. Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Hosting

Deploy this Next.js app to Vercel or another Node.js host. Add the Razorpay, Supabase, and Resend values as server environment variables in the hosting dashboard, apply the schema, and redeploy. The production build command is `npm run build`; the start command is `npm run start`.

The order API validates customer details, looks up prices on the server, adds a flat Rs 40 delivery charge, and saves the order and payment method. Razorpay orders are created server-side; payment signatures are verified and the payment must be captured before the order is marked paid. COD orders are due in cash on delivery. Orders can be placed at any time; **delivery can be attempted from 6 AM to 8 AM**. Service is currently limited to Bhiwani; more areas are coming soon.

Razorpay checkout requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`). If any are missing, checkout explains the required setup and will not accept an order that cannot be recorded or paid to the configured merchant. The order email is sent only after the order is saved; if Resend settings are missing or the email is rejected, checkout continues and shows a notification warning.

The checkout hides Razorpay's deprecated UPI Collect flow so mobile web uses UPI Intent where supported and desktop can use the available QR flow. Test API keys only simulate payments; replace both Razorpay keys with matching live credentials for real payments, and ensure UPI is enabled for the merchant account in the Razorpay Dashboard. Hosted Razorpay Checkout supplies the merchant payment details, so a custom `UPI_ID` environment variable is not used by this integration.

## Payment confirmation

The Razorpay checkout response is verified on the server using the payment signature and Razorpay's payment API. An order is marked `paid` only after Razorpay reports the matching payment as captured. If a payment is interrupted or not captured, the order stays `pending` and can be paid again from the order confirmation. COD orders remain due in cash on delivery. Configure Razorpay webhooks separately if you need payment updates when customers close the checkout before returning to the site.

If `public.orders` already exists, rerun [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor before deploying. It adds Razorpay references, updates the payment method constraint, and grants the server permission to update payment status. If checkout reports a missing column or `PGRST204`, the database migration has not been applied or its API schema cache has not refreshed.

## Product photos

The current product pictures are remote Unsplash images used as visual placeholders. Replace them with the store's own juice photography before launch; the image URLs are listed in `app/storefront.tsx`.
