# Deploy the working test-order form to the existing Netlify site

Use the existing Netlify project **statuesque-gnome-ee68e9** so the public URL stays unchanged. Leave Shipment Desk alone. This is a backend deployment, not a Netlify Drop/static-file upload.

## Connect GitHub

In the existing site's settings, find **Build & deploy → Continuous deployment → Repository** and choose **Link repository** (labels may vary). Choose GitHub, authorize access and select **robgci/order-forms**. The Netlify account owner must authorize this connection; the code cannot grant account access.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Base directory | empty / repository root |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |

These settings are defined in `netlify.toml`. The build outputs only the form to `dist`; private contact emails and backend code are bundled separately into the server function. The browser calls same-origin `/api/orders`, which routes to the Netlify function. The server validates products, contact/location, quantities, whole-case rounding and prices, then renders the HTML order confirmation and calls Resend.

## Configure Netlify's runtime settings

In this Netlify project's environment-variable settings, securely add:

- `RESEND_API_KEY`: paste the Resend key as a secret, available to Functions at runtime. Never put the value in Git, frontend code, chat, build arguments or a downloadable ZIP.
- `ORDER_FROM_EMAIL`: `onboarding@resend.dev` during initial testing.
- `TEST_ORDER_EMAIL`: `rhorowitz@georgecourey.com`.

Saving these settings in Codex does not configure Netlify. Redeploy the function after changing its runtime variables. No additional secret is needed from customers.

## Testing restrictions

The Netlify function hard-codes `To` to **rhorowitz@georgecourey.com**, includes no Cc/Bcc and ignores recipient fields supplied by the browser. If TEST_ORDER_EMAIL is set to any other address, sending is blocked. Customer/salesperson emails remain disabled. A sender, key or provider failure is displayed as an error; the form never claims the order was sent without provider acceptance.

The function uses a per-instance request limit and duplicate cache, and forwards a stable idempotency key to Resend to protect retries across instances for the provider's 24-hour window. Limits/cache are not durable or global; there is no persistent order or delivery-status database yet. Production customer launch needs durable records, delivery monitoring and stronger site-wide abuse controls. A successful function response means provider acceptance, not confirmed inbox delivery.

## Verify the deployment

After the deploy reports Published, check Netlify's Functions list for **orders**. Open the existing public URL in a private browser. The page must no longer say Preview only. Test all three contact locations, six-digit quantities, full-case rounding, total pallets and a real Submit. Verify the formatted test confirmation arrives only in Robert's inbox. Verify a second click does not create a duplicate email. Customer delivery must not be enabled during these checks.

Future approved changes committed and pushed to `main` trigger automatic updates to the same site after the repository is connected. Local edits do not change the public website by themselves.

## Downloadable review file

`npm run build:review` builds the standalone preview-only file. It never sends email. This is useful for offline review, but uploading it with Netlify Drop does not deploy the email function. `npm run build` builds the working test-submission frontend for a deployment that includes the function.
