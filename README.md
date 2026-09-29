# Root & Ritual

A responsive juice storefront built with Next.js. Customers in Bhiwani can order Green Juice (Rs 60) or Sweet Lime Juice (Rs 100) per medium glass, submit delivery details, and pay through a UPI app or QR code. Delivery is Rs 40 per order. New orders are stored in Supabase with payment status `pending`.

## Local setup

1. Install Node.js 20.9 or later.
2. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. If the table already exists, run the script again to apply the required `service_role` grants.
3. Set `UPI_ID`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in `.env.local` or your host's environment settings. Keep the secret key server-only. Legacy projects may use `SUPABASE_SERVICE_ROLE_KEY` instead.
4. For order email alerts, set `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL` (the store's Gmail inbox), and `RESEND_FROM_EMAIL` in `.env.local`. Keep the API key server-only. Verify the sender domain/address in Resend before sending to the store inbox.
5. Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Hosting

Deploy this Next.js app to Vercel or another Node.js host. Add the UPI, Supabase, and Resend values as server environment variables in the hosting dashboard, apply the schema, and redeploy. The production build command is `npm run build`; the start command is `npm run start`.

The order API validates customer details, looks up prices on the server, adds a flat Rs 40 delivery charge, saves the order, and creates a UPI payment URI. Orders can be placed at any time; **delivery can be attempted from 6 AM to 8 AM**. Service is currently limited to Bhiwani; more areas are coming soon.

Checkout requires `UPI_ID`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`). If any are missing, it will explain which setup is needed and will not accept an order that could be lost or paid to an unknown recipient. The order email is sent only after the order is saved; if Resend settings are missing or the email is rejected, checkout continues and shows a notification warning. The email says the order was received with payment pending; UPI payment is not automatically verified.

## UPI payment limitation

The QR code and `upi://pay` link are payment requests only. This app does not receive a bank/gateway callback, verify a UPI transfer, or automatically change an order from `pending` to `paid`. The store must reconcile the payment in its merchant account before treating the order as paid. For automatic verification, add a payment provider such as Razorpay with a server-side webhook before launch.

## Product photos

The current product pictures are remote Unsplash images used as visual placeholders. Replace them with the store's own juice photography before launch; the image URLs are listed in `app/storefront.tsx`.
