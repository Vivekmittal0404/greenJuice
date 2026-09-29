# Project guidance

- Use the Next.js App Router and TypeScript conventions already in this project.
- Keep all order price calculation and Supabase writes in server code; never expose the Supabase secret/service-role key to the browser.
- Do not treat UPI link creation as proof of payment. New orders remain `pending` until manually reconciled.
- Preserve the prominent delivery notice: orders are accepted any time, delivery attempts are between 6 AM and 8 AM.
- Run `npm run lint` and `npm run build` after app changes.
