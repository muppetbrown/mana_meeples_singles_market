# Quick Start Guide: Card Variations

This guide will get you up and running with the card variations system in 5 minutes.

## Prerequisites
- Running instance of Mana Meeples Singles Market
- Admin access to the system
- Basic understanding of REST APIs

## Step 1: Import a Test Set

### Option A: Use Existing Import Scripts

Import some MTG cards:
```bash
node scripts/import-mtg-set.js BLB
```

Import some Pokémon cards:
```bash
node scripts/import-pokemon-set.js sv3
```

Import One Piece cards (with sample data):
```bash
node scripts/import-onepiece-set.js OP01
```

### Option B: Import from JSON File

Use the provided sample files:

```bash
curl -X POST http://localhost:5000/api/admin/import-card-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d @docs/samples/mtg_card_variations_sample.json
```

## Step 2: View Your Cards

Check what was imported:
```bash
curl -X GET "http://localhost:5000/api/cards?game=mtg&limit=5" \
  -H "Accept: application/json"
```

## Step 3: Create Variations

### Bulk Create Variations for Multiple Cards

```bash
curl -X POST http://localhost:5000/api/admin/bulk-create-variations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "card_ids": [1, 2, 3],
    "variations": [
      {
        "name": "Extended Art",
        "code": "EA"
      },
      {
        "name": "Showcase",
        "code": "SHOW"
      }
    ],
    "create_inventory": true
  }'
```

### Create Single Variation

```bash
curl -X POST http://localhost:5000/api/admin/variations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "card_id": 1,
    "variation_name": "Promo",
    "variation_code": "PROMO",
    "image_url": "https://example.com/promo.jpg"
  }'
```

## Step 4: Update Inventory

Set stock quantities for variations you have:

```bash
curl -X PUT http://localhost:5000/api/admin/inventory/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "stock_quantity": 5,
    "price": 24.99
  }'
```

## Step 5: View Results

### See All Variations for a Card
```bash
curl -X GET "http://localhost:5000/api/admin/variations/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Search Cards with Variations
```bash
curl -X GET "http://localhost:5000/api/cards?search=lightning&game=mtg" \
  -H "Accept: application/json"
```

## Common Workflows

### 1. Adding a New Game
```bash
# Import cards for a new game
curl -X POST http://localhost:5000/api/admin/import-card-data \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "yugioh",
    "set_data": {
      "name": "Legend of Blue Eyes White Dragon",
      "code": "LOB",
      "release_date": "2002-03-08"
    },
    "cards_data": [...]
  }'
```

### 2. Bulk Price Updates
```bash
# Refresh MTG prices from Scryfall
curl -X POST http://localhost:5000/api/admin/refresh-prices \
  -H "Content-Type: application/json" \
  -d '{"game_id": 1}'
```

### 3. Creating Foil Variants
```bash
# Create foil versions of existing cards
curl -X POST http://localhost:5000/api/admin/bulk-create-foils \
  -H "Content-Type: application/json" \
  -d '{
    "card_ids": [1, 2, 3],
    "foil_type": "Foil",
    "price_multiplier": 2.5
  }'
```

## Data Format Quick Reference

### Basic Card Data Structure
```json
{
  "name": "Card Name",
  "card_number": "001",
  "rarity": "Rare",
  "card_type": "Creature",
  "description": "Card text",
  "image_url": "https://example.com/image.jpg",
  "base_price": 5.99,
  "foil_price": 14.99,
  "variations": [
    {
      "name": "Regular",
      "code": null,
      "inventory": [
        {
          "quality": "Near Mint",
          "foil_type": "Regular",
          "language": "English",
          "stock_quantity": 10,
          "price": 5.99
        }
      ]
    }
  ]
}
```

### Quality Levels
- `Near Mint` - Perfect condition (0% discount)
- `Lightly Played` - Minor wear (15% discount)
- `Moderately Played` - Moderate wear (30% discount)
- `Heavily Played` - Heavy wear (45% discount)
- `Damaged` - Significant damage (65% discount)

### Foil Types
- `Regular` - Normal card finish
- `Foil` - Foil/holographic treatment

### Languages
- `English` (default)
- `Japanese`
- `Spanish`
- `French`
- `German`
- And others as needed

## Testing Your Setup

Run this simple test to verify everything is working:

```bash
#!/bin/bash
echo "Testing card variations system..."

# 1. Import sample data
echo "1. Importing sample cards..."
curl -s -X POST http://localhost:5000/api/admin/import-card-data \
  -H "Content-Type: application/json" \
  -d @docs/samples/mtg_card_variations_sample.json

# 2. Create variations
echo "2. Creating variations..."
curl -s -X POST http://localhost:5000/api/admin/bulk-create-variations \
  -H "Content-Type: application/json" \
  -d '{
    "card_ids": [1],
    "variations": [{"name": "Test Variant", "code": "TEST"}],
    "create_inventory": true
  }'

# 3. Check results
echo "3. Checking results..."
curl -s -X GET "http://localhost:5000/api/admin/variations/1"

echo "Test complete!"
```

## Next Steps

1. **Read the full guide**: See `docs/CARD_VARIATIONS_GUIDE.md` for detailed documentation
2. **Customize import scripts**: Modify scripts for your specific data sources
3. **Set up automated pricing**: Configure regular price sync jobs
4. **Extend to new games**: Add support for additional TCGs
5. **Admin interface**: Use the web interface for easier management

## Troubleshooting

### Common Issues

**"Card not found" errors**
- Make sure card IDs exist in database
- Check that imports completed successfully

**"Variation already exists" errors**
- Use unique variation names per card
- Check existing variations with GET `/api/admin/variations/:card_id`

**Price sync failures**
- Verify API keys are configured
- Check external API rate limits
- Review error logs for specific issues

**Database constraint errors**
- Ensure unique combinations of card_id/variation_id/quality/foil_type/language
- Check foreign key relationships

### Getting Help

- Check server logs: `tail -f logs/app.log`
- Review database constraints in `database/schema.sql`
- Test individual API endpoints with curl
- Use the admin interface for visual debugging

---

**You're ready to go!** 🚀

Start with importing some cards using the provided scripts or sample JSON files, then experiment with creating variations and managing inventory.