# Connect the existing sandbox to GitHub

Keep the existing Netlify site **statuesque-gnome-ee68e9** so its public review URL stays unchanged. Connecting Git requires the Netlify account owner's authorization; repository code cannot grant it.

In that site's Netlify settings, find **Build & deploy → Continuous deployment → Repository**, then choose **Link repository** (labels may vary). Choose GitHub, authorize access to the selected repository, and select **robgci/order-forms**. Do not create a second site or connect Shipment Desk.

Use these settings, also defined in `netlify.toml`:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Base directory | empty / repository root |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | leave unset |

No API key or email-related environment variables are needed for this review site. Do not copy Resend secrets into this static deployment. The build generates one self-contained `dist/index.html` with preview-only submission; Netlify headers also block outbound connections and form posts. Only `dist` is public, not the source tree or customer email mapping. Contact names, locations, product descriptions and prices are visible publicly. Search indexing is discouraged, but this is not access control.

After connecting, trigger the initial deploy. Check the Deploys page for a successful build and test the existing public URL in a signed-out/private browser. Check all three contact locations, whole-case rounding, total pallets and the preview-only Submit message. A deploy log alone does not prove the public page was updated.

Future updates: edit the source files, run `npm test` and `npm run build`, then commit and push approved changes to `main`. Netlify automatically builds and updates the same site. Local edits do not update the website until committed and pushed. Do not rely on the generated `review/` copy for publishing; Netlify regenerates the page from `public/` on every build.

This is not the email backend deployment. The Node server can send test emails, but Netlify Drop/static hosting does not run `server.js`. Enabling live submissions later requires implementing/deploying a secure server-side handler and explicitly revisiting this sandbox's network-blocking policy. Customer emails remain disabled.
