# Database Migrations

This project uses **Prisma** for migrations and seeding.

## Requirements
- PostgreSQL
- `DATABASE_URL` set in `.env.local`

Example:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/pen_landing
```

## Prisma config
We use `prisma/prisma.config.ts` for datasource + seed.

## One-time setup
```bash
npm install
npx prisma generate
```

## Run migrations
```bash
npm run db:migrate
```

## Seed demo data
```bash
npm run db:seed
```

## What gets created
- Admin user (from `AUTH_ADMIN_EMAIL`/`AUTH_ADMIN_PASSWORD`)
- Demo product + variants
- Templates
- Landing page seed

## Indexes
Indexes are defined in `prisma/schema.prisma` for:
- Orders status + createdAt
- Variants by product + SKU
- Order items by order + product
- Inventory holds by variant + expiry
- Audit log by createdAt

## Fresh install checklist
1. Set `.env.local` with `DATABASE_URL` and auth secrets.
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run dev`
