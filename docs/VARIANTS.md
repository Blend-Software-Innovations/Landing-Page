# Materialized Variants

This system keeps **optionGroups/priceModifiers** for the landing UI, and adds a **materialized variants** list that is used for stock, SKU, weight, and images.

## Mapping Rules
1. Variants are generated from the cartesian product of `optionGroups`.
2. `variant.price = basePrice + priceModifiers[optionId][value]`.
3. `variant.sku` is generated from option values (can be edited).
4. If `variants` exist in config, they take precedence over auto‑generated variants.

## Generation
In Admin → **Materialized variants** → click **Generate variants**.

## Validation
- SKU required and unique
- stockQty >= 0
- weight >= 0 (optional)
- price >= 0

## Migration from existing data
- Existing `optionGroups` + `priceModifiers` stay untouched.
- Click **Generate variants** once to materialize.
- Then edit stock/SKU/weight/images in bulk.

## Notes
- Variant selection is matched by option values in the order form.
- If no variants are materialized, the system falls back to base price + modifiers.
