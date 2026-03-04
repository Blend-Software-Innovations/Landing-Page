# Orders: Status Workflow + Invoice/Packing Slip

## Statuses
Order statuses follow this workflow:

- `PENDING` ? `CONFIRMED` ? `PACKED` ? `SHIPPED` ? `DELIVERED`
- `PENDING` ? `CANCELED`
- `CONFIRMED` ? `CANCELED`
- `PACKED` ? `CANCELED`
- `SHIPPED` ? `RETURNED`
- `DELIVERED` ? `RETURNED`

Transitions are enforced in `lib/orders.ts`.

## Status Timestamps
When status changes, a timestamp is recorded:
- `confirmedAt`
- `packedAt`
- `shippedAt`
- `deliveredAt`
- `canceledAt`
- `returnedAt`

## Admin Actions + Audit Trail
Status changes from the admin UI call:
- `POST /api/admin/order-status`

Each status change writes an audit entry (`AuditLog`) with:
- `action: "order.status"`
- `data: { from, to }`
- `actor`, `role` (if available)

Order creation also writes `order.created` audit entries.

## Invoice + Packing Slip
Printable HTML pages:
- Packing slip: `pages/admin/packing/[id].tsx`
- Invoice: `pages/admin/invoice/[id].tsx`

These pages are available from the Admin Orders list.

## Notification Hooks (Placeholder)
`lib/notifications.ts` contains placeholder hooks:
- `notifyNewOrder(order)`
- `notifyOrderStatusChange(order, previousStatus, nextStatus)`

Integrate Twilio/email/WhatsApp here.

## DB Migration
New columns added:
- `Order.confirmedAt` / `packedAt` / `shippedAt` / `deliveredAt` / `canceledAt` / `returnedAt`

Migration: `prisma/migrations/0004_order_status_timestamps/migration.sql`
