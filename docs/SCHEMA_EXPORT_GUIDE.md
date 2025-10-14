# Database Schema Export Guide

## Overview

This project includes an automated database schema documentation system that generates comprehensive documentation of your database structure, including:

- ✅ Complete table structures with columns, types, and defaults
- ✅ All constraints (primary keys, foreign keys, unique, check)
- ✅ Indexes and their definitions
- ✅ Sample data from each table (for reference)
- ✅ Row counts and statistics
- ✅ Views and materialized views
- ✅ Entity Relationship Diagram (Mermaid format)

## Quick Start

### Manual Export

Run the export script anytime you make database changes:

```bash
node scripts/export-database-schema.js
```

This generates two files:
- `docs/DATABASE_SCHEMA.md` - Human-readable documentation
- `docs/database-stats.json` - Machine-readable statistics

### View the Documentation

After running the script, check:
- `docs/DATABASE_SCHEMA.md` - Full schema documentation with examples
- GitHub will automatically render the Mermaid diagrams in the markdown

## Automated Workflow (Recommended)

### Option 1: GitHub Actions (Run on Database Changes)

Create `.github/workflows/update-schema-docs.yml`:

```yaml
name: Update Database Schema Documentation

on:
  # Trigger manually
  workflow_dispatch:
  
  # Or trigger when schema files change
  push:
    paths:
      - 'database/**'
      - 'scripts/import-*.js'
      - 'migrations/**'

jobs:
  update-schema:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Export database schema
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node scripts/export-database-schema.js
        
      - name: Commit and push changes
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add docs/DATABASE_SCHEMA.md docs/database-stats.json
          git diff --quiet && git diff --staged --quiet || git commit -m "docs: Update database schema documentation [skip ci]"
          git push
```

**Setup:**
1. Add your `DATABASE_URL` to GitHub Secrets
2. Commit the workflow file
3. Schema docs will auto-update on database changes

### Option 2: Pre-Commit Hook (Run Locally Before Commits)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check if database-related files changed
if git diff --cached --name-only | grep -qE "database/|migrations/"; then
  echo "🔍 Database files changed, updating schema documentation..."
  
  node scripts/export-database-schema.js
  
  if [ $? -eq 0 ]; then
    git add docs/DATABASE_SCHEMA.md docs/database-stats.json
    echo "✅ Schema documentation updated and staged"
  else
    echo "❌ Failed to update schema documentation"
    exit 1
  fi
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Option 3: npm Script (Manual but Easy)

Add to your `package.json`:

```json
{
  "scripts": {
    "schema:export": "node scripts/export-database-schema.js",
    "schema:export:prod": "NODE_ENV=production node scripts/export-database-schema.js"
  }
}
```

Then run:
```bash
npm run schema:export
```

## When to Update Schema Documentation

### ✅ Always Update After:
- Creating new tables
- Adding/removing columns
- Changing constraints or indexes
- Adding views or materialized views
- Major data imports that change structure
- Database migrations

### 💡 Best Practices:
1. **After migrations:** Run the export script after applying migrations
2. **Before pull requests:** Update docs before submitting PRs with database changes
3. **Weekly audits:** Schedule weekly exports to catch any drift
4. **Post-deployment:** Run after deploying schema changes to production

## What Gets Documented

### Table Information:
- Column names, types, and constraints
- Default values and nullability
- Primary keys, foreign keys, unique constraints
- Check constraints
- Row counts (current)

### Relationships:
- Foreign key relationships
- Visual ERD diagram in Mermaid format

### Performance:
- All indexes with their definitions
- Index types (btree, gin, gist, etc.)

### Sample Data:
- Up to 3 sample rows per table (sanitized)
- Useful for understanding data structure
- **Note:** Sensitive data should be sanitized before export

## Customization

### Exclude Sensitive Data

Modify `scripts/export-database-schema.js` to exclude sensitive tables:

```javascript
async getSampleData(tableName, limit = 3) {
  // Exclude sensitive tables
  const excludeTables = ['users', 'orders', 'payment_info'];
  
  if (excludeTables.includes(tableName)) {
    return [];
  }
  
  try {
    const result = await pool.query(`SELECT * FROM ${tableName} LIMIT ${limit}`);
    return result.rows;
  } catch (error) {
    return [];
  }
}
```

### Change Sample Size

Change the default limit:

```javascript
const samples = await this.getSampleData(tableName, 5); // Get 5 samples instead of 3
```

### Add Custom Sections

Add custom analysis to the `generate()` method:

```javascript
// Add after materialized views
this.header('Custom Analysis', 2);
this.log('Add your custom database insights here');
```

## Troubleshooting

### "Permission denied" errors
Make sure your database user has SELECT permissions on all tables:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO your_user;
```

### Empty sample data
- Check if tables have data
- Verify database connection
- Check for view/materialized view refresh needs

### Large output files
If schema is too large:
- Reduce sample data limit
- Exclude large tables from samples
- Generate separate docs per schema/module

### Connection timeout
For large databases:
- Increase connection timeout in `config/database.js`
- Process tables in batches
- Run during off-peak hours

## Example Output Structure

```
docs/
├── DATABASE_SCHEMA.md          # Main documentation
│   ├── Database Overview       # Summary statistics
│   ├── Tables                  # Detailed table docs
│   │   ├── games
│   │   ├── card_sets
│   │   ├── cards
│   │   └── ...
│   ├── Views                   # View definitions
│   ├── Materialized Views      # Mat view definitions
│   └── Relationships Diagram   # ERD
│
└── database-stats.json         # Machine-readable stats
    ├── table_count
    └── tables
        ├── games
        │   ├── columns
        │   ├── constraints
        │   ├── indexes
        │   └── rows
        └── ...
```

## Integration with Documentation

### Link in README.md:
```markdown
## Database Documentation

For complete database schema documentation, see [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).

Current database statistics: [database-stats.json](docs/database-stats.json)
```

### Use in API Documentation:
Reference table structures when documenting endpoints:
```markdown
### POST /api/cards

Creates a new card. See [cards table structure](docs/DATABASE_SCHEMA.md#cards) for field details.
```

## CI/CD Integration

### Add to deployment pipeline:

```yaml
- name: Update schema docs
  run: npm run schema:export
  
- name: Deploy to production
  run: npm run deploy
```

This ensures documentation is always current with deployed schema.

---

## Need Help?

- Check the script comments in `scripts/export-database-schema.js`
- Review sample output in `docs/DATABASE_SCHEMA.md`
- Open an issue if you encounter problems

**Keep your schema documentation up to date! Future you will thank present you.** 🚀
