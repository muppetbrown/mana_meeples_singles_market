# Fix: Add Missing Unique Constraint to card_inventory

## Problem

The inventory API is failing with the error:
```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
Code: 42P10
```

This happens because the API code uses `ON CONFLICT (card_id, quality, language)` but this unique constraint doesn't exist in the database.

## Solution

Run the SQL migration to add the missing unique constraint.

### Option 1: Using psql (Recommended)

```bash
# Connect to your database and run the SQL file
psql $DATABASE_URL -f scripts/migrations/add-inventory-unique-constraint.sql
```

Or if you have separate connection details:

```bash
psql -h localhost -U postgres -d mana_meeples -f scripts/migrations/add-inventory-unique-constraint.sql
```

### Option 2: Using a database GUI

Open the file `scripts/migrations/add-inventory-unique-constraint.sql` and execute it in your preferred database client (pgAdmin, DBeaver, etc.)

### Option 3: Quick Fix (Direct SQL)

If you just want to fix it quickly, run this single SQL statement:

```sql
ALTER TABLE card_inventory
ADD CONSTRAINT card_inventory_card_quality_language_key
UNIQUE (card_id, quality, language);
```

## Verification

After running the migration, verify it worked:

```sql
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conname = 'card_inventory_card_quality_language_key';
```

You should see one row returned with the constraint name.

## Testing

After adding the constraint, the "Add to Inventory" feature should work correctly. The API will now be able to:
- Create new inventory entries
- Update existing entries (upsert behavior)
- Prevent duplicate entries for the same card/quality/language combination

## Troubleshooting

If you get an error about duplicate entries:

1. Find the duplicates:
```sql
SELECT card_id, quality, language, COUNT(*) as count
FROM card_inventory
GROUP BY card_id, quality, language
HAVING COUNT(*) > 1;
```

2. Resolve duplicates by keeping the most recent entry and deleting others, or merge their quantities.

3. Then run the ALTER TABLE statement again.
