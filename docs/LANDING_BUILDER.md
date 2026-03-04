# Landing Builder (Sections)

## Section Schema
Each section is stored in `config.sections`:
```ts
{
  id: string;
  type: "hero" | "offer" | "countdown" | "gallery" | "features" | "reviews" | "faq" | "sticky_buy";
  enabled: boolean;
  order: number;
  settings?: Record<string, any>;
}
```

## Default Sections
`defaultSections` lives in `lib/siteConfig.ts` and is used as a fallback when sections are missing.

## Admin Controls
Admin can:
- Toggle enabled/disabled
- Reorder via Up/Down
- Edit settings for offer/countdown/FAQ/sticky

Settings examples:
- Offer: `{ text: "Limited batch..." }`
- Countdown: `{ endDate: "2026-12-31" }`
- FAQ: `{ items: [{ q, a }, ...] }`
- Sticky: `{ text: "Order now" }`

## Rendering Logic
`pages/index.tsx` renders sections dynamically:
- `normalizeSections()` ensures missing sections are injected.
- Only `enabled` sections are rendered.
- Sorting uses `order`.

## Auto-Populate Defaults
When templates are applied, sections are normalized to include defaults:
- `applyTemplate()` + `normalizeSections()` in admin.

## Fallbacks
If settings are missing, fallback values are used (promoText, built-in FAQ, etc.).

## Notes
- The video + order form are rendered outside the builder for now.
- If you want those as sections too, say the word.
