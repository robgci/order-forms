# Customer order forms

A small, login-free customer order form. The initial Handcraft Linen Service catalog and contact details were transcribed from the supplied George Courey Handcraft workbook. Each customer should have a separate deployment and customer data file. No third-party JavaScript or runtime packages are required.

## Run

Requires Node.js 22 or later.

```sh
npm test
npm start
```

The form is served on port 3000 at `/handcraft` (also `/`). Customers enter a PO number, requested delivery date and whole-case quantities. Gowns use 60 pieces/case and 16 cases/pallet; blankets 30 pieces/case and 16 cases/pallet; drawsheets 36 pieces/case and 30 cases/pallet; washcloths 75 dozen/case (900 pieces) and 8 cases/pallet. Positive quantities automatically round up to the next full case for every product. The browser shows the rounded quantity when the customer leaves the field, displays the adjustment beneath it, and calculates prices from the full-case quantity. The server applies the same rounding. Zero remains zero. Partial pallets are allowed. Case and pallet equivalents update beneath each quantity and are included in order emails. Customer name is prefilled; The contact dropdown automatically fills the ship-to: Saul Aguilera → Richmond VA Bulk; Ringo Tetteh Quaye → Martinsburg WV Bulk; Clinton Wright → High Point NC Bulk. Contact emails are stored only in server-side customer data. The server resolves the selected contact and rejects mismatched locations; confirmations use that contact. Test email delivery remains restricted to TEST_ORDER_EMAIL. Unit `dz` means quantity in dozens. Prices are transcribed as dollars; confirm currency and current prices before sharing the form.

## Email setup and publication

Set `RESEND_API_KEY`, `ORDER_FROM_EMAIL`, and `TEST_ORDER_EMAIL` securely in the host environment. The sender must be verified with Resend. For local use, create an ignored `.env` file from `.env.example` and run `node --env-file=.env server.js`. No credentials or login are required from customers.

This version is test-only. Orders are validated on the server, then sent through Resend ONLY to `TEST_ORDER_EMAIL` with a `[TEST]` subject. The customer and rep addresses in the workbook are retained as reference data and are never used as recipients. An unset test recipient blocks sending entirely. The browser cannot override recipients, product prices or ship-to locations. Missing configuration and provider errors are shown as failures; orders are not silently stored for later delivery. A successful response means the email service accepted the request, not that inbox delivery is guaranteed. Monitor delivery/bounces in the provider.

Deploy this folder to a Node-capable hosting service with HTTPS, set the three email variables, and use the host's public URL. No public deployment has been created. Confirm the test recipient before sending. Confirm shipping destination, prices and currency before launch. Customer emails remain disabled in this version; enabling production delivery requires a separate change. Automated tests use a fake sender.

The server applies a per-IP request limit and same-origin checks. Since customer links are public, anyone with the link can submit; use hosting-level rate limits or bot protection before broad distribution. Duplicate requests are cached in one server process, with an additional 24-hour idempotency key sent to Resend. There is no database or order history. Multi-instance deployments and durable order processing require shared storage. Do not expose additional customer deployments under this same data file.

## Validation

`npm test` covers server-side validation, page/catalog requests, server-controlled recipients and totals, duplicate submission, unavailable email configuration and provider failure/retry. No live emails are sent by tests.

## Visual review

`review/Handcraft-Order-Form-Review.html` is a standalone review copy with embedded CSS and JavaScript. Download and open it in a browser to review the layout without a web server. Submitting this local review file displays a preview notice and sends no email. `review/Handcraft-Desktop.png` and `review/Handcraft-Mobile.png` are actual Chromium renders of that file. The production server still serves `public/index.html` with its separate static assets. Run `node scripts/build-review.js` to regenerate the review copy after changing those assets; regenerate screenshots with a browser.

## Order confirmation email

`order-email.js` renders the confirmation with email-compatible tables and inline styles matching the entry form, including ordered products, SKUs, selling units, case/pallet counts, combined totals and delivery details. Every message contains HTML and a plain-text fallback. Dynamic values are HTML-escaped. Customer delivery remains disabled; the current backend uses only TEST_ORDER_EMAIL. `review/Handcraft-Email-Preview.html` is a visual sample. Email-client appearance may vary; check the delivered sample in Outlook before launch.

## Reusable customer setup workbook

Fill in `templates/Customer-Order-Form-Template.xlsx` and upload it to request a new customer form. `templates/Handcraft-Setup-Example.xlsx` contains the current contacts and products as an example. The Contacts sheet links each contact/location to a salesperson. The Products sheet records item number, description, selling unit, unit price, pieces per case, and cases per pallet; derived columns calculate pieces per pallet and selling units per case/pallet. Run `python scripts/build-customer-template.py` to recreate both workbooks. This is an intake format; uploading a workbook does not automatically deploy a site.

## Sandbox publication status

This repository is still a Node server with a standalone visual review file. It has not been published as an OpenAI Site. Sites publishing tools are not available in this workspace. Publishing this development environment is different from publishing a customer-facing website. A separate Sites project must adapt the request handler to its Workers runtime and securely bind the email secret before public submission works. Keep all live To recipients restricted to rhorowitz@georgecourey.com during testing, with no Cc/Bcc. The downloadable review is explicitly preview-only and sends no email.

## Netlify test-submission backend

See NETLIFY.md for the current deployment path. `npm run build` now builds the test-submission frontend and `netlify/functions/orders.mjs` handles /api/orders. It is strictly locked to rhorowitz@georgecourey.com with no Cc/Bcc. Netlify requires its own secure RESEND_API_KEY runtime setting. Netlify Drop alone still publishes only a preview and cannot enable this function. The application must be deployed with its Git-connected build or a supported functions deployment. The server validation is shared in order.js. `npm run build:review` retains the no-email offline review. Earlier notes about a static-only Netlify configuration are superseded by NETLIFY.md.
