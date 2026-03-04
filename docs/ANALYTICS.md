# Analytics (Advanced)

## GTM NoScript
`pages/_document.tsx` includes the noscript iframe fallback when `NEXT_PUBLIC_GTM_ID` is set.

## Google Consent Mode (v2)
Default consent is **denied** until user opts in.

Storage keys:
- `marketing_consent` = `granted | denied`

Consent update:
- `gtag('consent', 'default', ...)` runs on first load
- `gtag('consent', 'update', ...)` runs on toggle

## IAB TCF (Basic Integration)
If a CMP exposes `__tcfapi`, we read TCData and set consent based on purpose consents:
- Purpose 1 (storage)
- Purpose 4 (measurement)

You can replace this mapping based on your CMP requirements.

## Meta CAPI (Server Side)
Endpoint:
- `POST /api/capi`

Requires env:
- `META_PIXEL_ID`
- `META_CAPI_TOKEN`

The server hashes email/phone (SHA-256) before sending.

## Events
- `view_item`
- `add_to_cart`
- `begin_checkout`
- `purchase`

These fire to:
- GA4 (gtag)
- GTM (dataLayer)
- Facebook Pixel
- Meta CAPI (server)

## Notes
- Do not put CAPI tokens in client code.
- If you need full IAB TCF compliance, plug in a CMP and map all purposes.
