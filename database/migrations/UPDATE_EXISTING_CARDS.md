# Updating Existing Cards for Special Foil Finishes

After implementing the special foil finish support, you have several options to update existing cards in your database.

## Quick Decision Guide

**Choose your approach based on your situation:**

- **Small database or specific sets?** → Use **Option 1** (Re-import)
- **Large database, want to update all at once?** → Use **Option 2** (Migration Script)
- **Want to see what would change first?** → Use **Option 2** with `--dry-run`
- **Need manual control?** → Use **Option 3** (SQL Migration)

---

## Option 1: Re-import Sets (Recommended for Small Databases)

### Pros:
- ✅ Safest approach - uses the same logic as new imports
- ✅ Updates all card data (images, text, etc.) in addition to finish
- ✅ Automatically handled by existing import code

### Cons:
- ⏱️ Takes time for large sets
- 🌐 Requires Scryfall API calls

### How to do it:

#### Via API (Recommended):
```bash
# Use your admin authentication
curl -X POST http://localhost:3000/api/admin/import \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"setCode": "FDN"}'
```

#### Via Script:
```bash
cd scripts/imports
node import_mtg_with_variations.js FDN
```

The import will:
1. Fetch fresh data from Scryfall
2. Match existing cards by SKU
3. Update finish to special foil types where applicable
4. Skip cards without prices (new behavior)

---

## Option 2: Run Migration Script (Recommended for Large Databases)

### Pros:
- ⚡ Fast - updates all cards at once
- 🔍 Has dry-run mode to preview changes
- 🎯 Focused only on finish updates
- 📊 Shows detailed statistics

### Cons:
- Only updates finish column (doesn't refresh other data)

### How to do it:

#### Step 1: Dry run (check what would change)
```bash
npx tsx scripts/migrations/update-special-foil-finishes.ts --dry-run
```

This will show:
- How many cards would be updated for each special foil type
- Sample cards that would be affected
- No changes will be made

#### Step 2: Run the migration
```bash
npx tsx scripts/migrations/update-special-foil-finishes.ts
```

This will:
- Wait 5 seconds (giving you time to cancel)
- Update all cards where finish='foil' and promo_type is a special foil
- Show final statistics

---

## Option 3: SQL Migration (Advanced Users)

### Pros:
- 🎛️ Full control over what gets updated
- 📝 Can customize for specific needs

### Cons:
- ⚠️ Requires database access
- 🚨 No safety checks

### How to do it:

#### Check what would be affected:
```sql
SELECT
    promo_type,
    COUNT(*) as count
FROM cards
WHERE finish = 'foil'
  AND promo_type IN (
    'surgefoil', 'galaxyfoil', 'fracturefoil', 'textured', 'neonink'
  )
GROUP BY promo_type;
```

#### Run the migration:
```bash
# Using psql
psql -U your_user -d your_database -f database/migrations/002_update_special_foil_finishes.sql

# Or using your database client
# Execute the SQL file: database/migrations/002_update_special_foil_finishes.sql
```

---

## Cleaning Up Cards Without Prices

If you want to remove cards that don't have pricing data:

### Check how many would be affected:
```sql
SELECT COUNT(*)
FROM cards c
LEFT JOIN card_pricing cp ON c.id = cp.card_id
WHERE cp.id IS NULL;
```

### See detailed breakdown:
```bash
# View the SQL file for queries
cat database/migrations/003_cleanup_cards_without_prices.sql
```

⚠️ **Warning:** Deleting cards will also delete related:
- Card inventory entries
- Cart items (if any)
- Other related data

**Recommendation:** Only delete cards without prices if you're sure they shouldn't exist. The new import logic will prevent creating new cards without prices.

---

## After Migration

### Verify the changes:

```sql
-- Check special foil distribution
SELECT
    finish,
    COUNT(*) as count
FROM cards
WHERE finish IN (
    'surgefoil', 'galaxyfoil', 'fracturefoil', 'singularityfoil',
    'chocobotrackfoil', 'cosmicfoil', 'halofoil', 'textured',
    'firstplacefoil', 'rainbowfoil', 'dragonscalefoil', 'raisedfoil',
    'neonink'
)
GROUP BY finish
ORDER BY count DESC;
```

### Test in the UI:

1. Browse cards with special foils (e.g., Foundations set)
2. Check that badges show the specific foil type (e.g., "Surgefoil" not "Foil")
3. Verify badge colors are correct (purple-pink for surgefoil, etc.)
4. Add a special foil card to cart and confirm it displays correctly

---

## Rollback (if needed)

If something goes wrong, you can rollback special foils to generic 'foil':

```sql
UPDATE cards
SET finish = 'foil'
WHERE finish IN (
    'surgefoil', 'galaxyfoil', 'fracturefoil', 'singularityfoil',
    'chocobotrackfoil', 'cosmicfoil', 'halofoil', 'textured',
    'firstplacefoil', 'rainbowfoil', 'dragonscalefoil', 'raisedfoil',
    'neonink'
);
```

## Questions?

- **Will this affect my existing inventory?** No, inventory is linked by card_id. The finish column update won't break any links.
- **What about prices?** Prices remain in the card_pricing table and will continue to work. Special foils use foil_price.
- **Can I run the migration multiple times?** Yes, it's idempotent (safe to run multiple times).
