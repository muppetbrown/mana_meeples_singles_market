# Fix: Add to Inventory Not Working

## Problem

When clicking "Add to Inventory", the modal closes but nothing is added to the database.

**Error in development:**
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
Code: 42P10
```

**Root Cause:** The API code expects a UNIQUE constraint on `(card_id, quality, language)` in the `card_inventory` table, but this constraint is missing from the database schema.

## Quick Fix

### Option 1: Run the SQL file (Recommended)

```bash
# If you have psql and DATABASE_URL set:
psql $DATABASE_URL -f FIX-INVENTORY.sql

# Or with individual connection parameters:
psql -h localhost -U your_username -d mana_meeples -f FIX-INVENTORY.sql
```

### Option 2: Copy and paste the SQL

1. Open your database client (pgAdmin, DBeaver, Render dashboard SQL console, etc.)
2. Run this SQL:

```sql
ALTER TABLE card_inventory
ADD CONSTRAINT card_inventory_card_quality_language_key
UNIQUE (card_id, quality, language);
```

### Option 3: Using Render Dashboard (if hosted on Render)

1. Go to your Render dashboard
2. Open your PostgreSQL database
3. Click on the "Query" or "SQL" tab
4. Paste and run the ALTER TABLE command above

## Verification

After running the SQL, verify it worked by running:

```sql
SELECT conname
FROM pg_constraint
WHERE conname = 'card_inventory_card_quality_language_key';
```

You should see one row returned.

## Testing

1. Restart your development server (if running)
2. Navigate to the admin panel
3. Click on a card and select "Add to Inventory"
4. Fill out the form and click "Add to Inventory"
5. The item should now be successfully added to the inventory

## Additional Fixes Included

I also fixed a bug in the bulk import endpoint (`/admin/inventory/bulk-import`) that had incorrect SQL syntax.

## If You Get Errors

### Error: "duplicate key value violates unique constraint"

This means you already have duplicate entries. Run this to find them:

```sql
SELECT card_id, quality, language, COUNT(*) as count
FROM card_inventory
GROUP BY card_id, quality, language
HAVING COUNT(*) > 1;
```

You'll need to clean up duplicates before adding the constraint.

### Error: "constraint already exists"

Great! The constraint is already there. The add to inventory feature should already be working.

## What Changed

### Files Modified:
1. `apps/api/src/routes/inventory.ts` - Fixed bulk import SQL syntax
2. `FIX-INVENTORY.sql` - Migration SQL to add the constraint
3. Migration scripts in `scripts/migrations/` - For future reference

### Database Schema Change:
- Added UNIQUE constraint: `card_inventory (card_id, quality, language)`

This ensures that each combination of card, quality, and language can only appear once in the inventory, which is the expected behavior.

## Need Help?

If you encounter any issues:
1. Check that the constraint was added (run the verification query above)
2. Look for duplicate entries (run the duplicate check query)
3. Restart your development server
4. Check the browser console and API logs for any new errors

The constraint must be added for the feature to work correctly, as the API relies on it for the UPSERT (INSERT ... ON CONFLICT) operation.
