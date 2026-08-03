# Security model

This documents the invariants that the checkout and admin surfaces rely on. Breaking one of
these is a production incident, not a style regression — read this before changing pricing,
uploads, rate limiting, or the admin permission table.

## 1. Money is never client-controlled

Every order-creating endpoint (`/api/checkout`, `/api/cod`, `/api/payment-link`,
`/api/payment-proof`) receives a cart from the browser, but treats `unitPrice`, `total`,
`giftWrapFee`, `shippingFee`, and `discount` in that payload as **display values only**.

Prices are recomputed server-side in `lib/pricing.ts`:

- `priceItems()` resolves each line's price from the DB `Variant.price`, then the config
  variant list, then `basePrice + option modifiers`. It never reads a client price.
- `computeOrderAmounts()` derives shipping, gift wrap, discount and the grand total from
  config, mirroring the storefront math so the quoted total matches the charged total.
- Quantity is clamped to 1–100 per line and 50 lines per order.

The Stripe session, the persisted `Order.total`, and the minimum-order check all use the
server-computed numbers. A payload claiming `unitPrice: 1` changes nothing.

**Invariant:** if you add a new order path, it must call `priceItems` + `computeOrderAmounts`.
Never pass a client-supplied amount to Stripe or to `createOrder`.

## 2. Manual payments are never auto-verified

`/api/payment-proof` accepts a bank/bKash/Nagad transfer screenshot. The submitted
`paidAmount` is a number the customer types — it proves nothing. Submissions are therefore
always created as `manualStatus: "PENDING"` / `paymentStatus: "PARTIAL"` and wait for a human
in `/api/admin/manual-payment-review`. The only automatic transition is **rejection** of a
duplicate transaction ID.

**Invariant:** never mark an order `PAID` from data the buyer supplied about their own payment.

## 3. Rate limiting uses a trusted client IP

`X-Forwarded-For` is appended to by every proxy, so its **first** entry is whatever the client
sent. `getClientIp()` in `lib/rateLimit.ts` prefers Cloudflare's `cf-connecting-ip` (stripped
and re-set at the edge) and otherwise counts `TRUSTED_PROXY_HOPS` entries from the **right**.

Set `TRUSTED_PROXY_HOPS` to the number of proxies actually in front of the app (App Platform
behind Cloudflare = 2). Too high leaks to a spoofable value; too low rate-limits a proxy IP.

Identity-based limits back up the IP limits, because IPs rotate and phone numbers do not:

- order creation: 5 per phone per hour
- OTP: 5/min and 20/hour per IP, plus a global `OTP_DAILY_MAX` budget (SMS costs money)
- order tracking: 10 attempts per order ID per hour

## 4. Uploads are sniffed, not trusted

A declared `Content-Type` is attacker-controlled, and an SVG served from our own origin is
stored XSS (the CSP allows `script-src 'self'`). `sniffImageType()` in `lib/uploads.ts` reads
the magic bytes and accepts only JPEG, PNG and WebP. The stored filename's extension is forced
to match the sniffed type; the original filename is discarded.

**Invariant:** never branch on `file.mimetype` or a user-supplied extension.

## 5. Inventory holds are signed

Hold IDs travel through the Stripe success/cancel redirect URLs, so they leak via `Referer`
and browser history. `/api/inventory/commit` and `/api/inventory/release` therefore require
`rsig`, an HMAC over the sorted ID list issued at checkout (`lib/reservationSig.ts`). Without
it, anyone holding an ID could release another customer's stock.

## 6. Admin authorization

- `owner` is a strict superset of `admin`; `admin` is a superset of `staff`. Keep it that way —
  the table was previously inverted, letting an `admin` manage users while the `owner` could not.
- Role changes reject self-edits and refuse to demote the last remaining `OWNER`, and every
  change writes an `AuditLog` row.
- All state-changing admin routes require the CSRF header in addition to the JWT cookie.
- A password reset revokes every refresh token for that user, in the same transaction.
- Presenting an already-revoked refresh token invalidates the whole token family (reuse
  detection), rather than failing just that one request.

## 7. CORS default-denies

`lib/cors.ts` emits `Access-Control-Allow-Origin` **only** for origins explicitly listed in
`AUTH_ALLOWLIST_ORIGINS`. An empty allowlist means no CORS headers at all — previously it
reflected any origin with `Allow-Credentials: true`, which let any site call the authenticated
API with the visitor's cookies.

## 8. Exports are formula-safe

`orders-csv` prefixes any field starting with `=`, `+`, `-`, `@`, tab or CR with a quote.
Customer names and addresses arrive from an unauthenticated endpoint, so without this an
attacker could plant a formula that executes when an operator opens the export in Excel.

## Known residual risks

- **CSP still allows `script-src 'unsafe-inline'`** for Next.js and GTM inline scripts. Moving
  to a nonce via middleware is the proper fix and is not yet done.
- **Rate limiting falls back to in-memory** when `REDIS_URL` is unset. That is correct at
  `instance_count: 1` but becomes per-instance (and therefore N× more permissive) the moment
  the app scales out. Set `REDIS_URL` before increasing instance count.
- **Migrations run inside `npm start`.** Safe at a single instance; move to a `PRE_DEPLOY` job
  before scaling to 2+, or instances will race each other applying schema changes.
