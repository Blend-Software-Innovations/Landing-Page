# Inventory Holds & Oversell Prevention

## Overview
- Inventory is **reserved** at checkout.
- Reservation (hold) has a TTL (default 15 minutes).
- Oversell prevention uses **atomic decrement** on the variant stock.

## Flow
1. Checkout request sends `variantId` and `quantity`.
2. API calls `reserveInventory(variantId, qty)`.
3. If stock is sufficient, it decrements `Variant.stockQty` and creates an `InventoryHold` with `expiresAt`.
4. If payment succeeds, `commitInventory(reservationId)` deletes the hold (no stock return).
5. If checkout is canceled or expires, `releaseInventory(reservationId)` adds stock back and deletes the hold.

## Concurrency Safety
- Uses DB transaction + atomic `updateMany` with `stockQty >= qty`.
- Two simultaneous checkouts for last item: only one succeeds.

## Endpoints
- `POST /api/checkout` (Stripe) → creates hold
- `POST /api/cod` (COD) → creates hold
- `POST /api/payment-proof` → creates hold
- `POST /api/inventory/commit` → finalize on success
- `POST /api/inventory/release` → release on cancel

## TTL Cleanup
`reserveInventory` runs `releaseExpiredHolds()` before reserving.
You can also run a scheduled job to call it periodically.

## Tests
`tests/inventory.test.ts` simulates two concurrent reservations for last stock.
Requires `DATABASE_URL`.
