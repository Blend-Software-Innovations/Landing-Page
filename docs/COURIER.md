# Courier CSV Export + Tracking

## CSV Export
Endpoint:
- `GET /api/admin/orders-csv`

Optional query params:
- `status=PENDING|CONFIRMED|PACKED|SHIPPED|DELIVERED|CANCELED|RETURNED`

CSV columns:
- `OrderId`
- `Name`
- `Phone`
- `Address`
- `City`
- `Area`
- `CODAmount`
- `Notes` (blank placeholder)
- `Items`
- `Status`
- `TrackingCode`

Items format:
- `productId(variantId) xQty` separated by `;`.

## Tracking Code
Admin UI supports updating tracking code:
- Endpoint: `POST /api/admin/order-tracking`
- Body: `{ orderId, trackingCode, shippingPartner? }`

Tracked fields:
- `Order.trackingCode`
- `Order.shippingPartner` (optional)

Updates are audited with `action: "order.tracking"`.

## Customer Tracking Page
Page:
- `/track`

Form requires:
- `orderId`
- `phone`

API:
- `POST /api/track`

Returns:
- status
- trackingCode
- shippingPartner
- createdAt
- items

## Notes
- If you want courier-specific columns (Pathao/Steadfast), add a mapping layer in `/api/admin/orders-csv`.
- Add WhatsApp/SMS tracking notifications inside `lib/notifications.ts`.
