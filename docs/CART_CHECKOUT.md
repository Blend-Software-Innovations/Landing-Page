# Cart + Checkout (Universal)

## Overview
This project now supports a **multi-item cart** with variant selection, quantity control, and a universal checkout flow (Stripe, COD, manual payment). The legacy **single-product checkout** still works as a shortcut when the cart is empty.

## Cart Behavior (Frontend)
- Cart stored in **localStorage** (`pen_cart_v1`).
- Cart also written to a **cookie** (`pen_cart`) at checkout for backend visibility.
- If cart is empty, checkout uses the current selection (single-product shortcut).

### Discount Rule (Basic)
- **5% discount** if either:
  - subtotal = 10,000 BDT, or
  - total item quantity = 3

### Shipping
- Uses `insideDhaka` / `outsideDhaka` from config.
- **Free shipping** if total quantity = `freeDeliveryThresholdQty`.

## Backend Flow
### Stripe (`/api/checkout`)
- Accepts `items[]` from client.
- Reserves inventory **per variant**.
- Builds Stripe line items for each cart item + gift wrap + shipping.
- Stores `reservationIds` + `cart` JSON in Stripe metadata.

### COD (`/api/cod`)
- Accepts `items[]` and reserves inventory per variant.
- Creates order with items and `reservationIds`.

### Manual Payment (`/api/payment-proof`)
- Same as COD, plus proof upload.

## Inventory Holds
- Each cart item with a `variantId` gets its own reservation.
- Reservation IDs are stored in the order (`reservationIds`) and used on status transitions.

## Order Creation
`createOrder()` accepts:
- `items[]` for multi-item order creation.
- `reservationIds[]` for multi-hold tracking.

## Files Touched
- `pages/index.tsx`
- `pages/api/checkout.ts`
- `pages/api/cod.ts`
- `pages/api/payment-proof.ts`
- `pages/api/webhook.ts`
- `lib/orders.ts`

## Notes
- Stripe metadata size is limited; keep cart item metadata minimal.
- If you want **server-validated pricing**, move pricing rules into the backend and compute totals there.
