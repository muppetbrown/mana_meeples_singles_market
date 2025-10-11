# Card Variations System Guide

## Overview

The Mana Meeples Singles Market supports a comprehensive card variations system that handles:

- **Multiple Card Games**: MTG, Pokémon, One Piece, and extensible to others
- **Variation Types**: Different printings, alternate arts, promo versions
- **Inventory Management**: Quality conditions, foil treatments, languages
- **Dynamic Pricing**: API-driven price updates with condition adjustments
- **Bulk Operations**: Efficient management of large inventories

## Database Structure

### Two-Level Variation System

#### Level 1: Card Variations (`card_variations` table)
Special printings and alternate versions of the same card:
- Regular printing
- Alternate art versions
- Borderless editions
- Promo versions
- Secret rare variants

#### Level 2: Inventory Variations (`card_inventory` table)
Different conditions and treatments of each card variation:
- **Quality**: Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged
- **Foil Type**: Regular, Foil
- **Language**: English, Japanese, Spanish, etc.

### Key Relationships

```
cards (base card data)
  ↓
card_variations (special printings)
  ↓
card_inventory (quality/foil/language combinations)
```

## API Endpoints

### Import and Bulk Operations

#### Import Card Data from JSON
```bash
POST /api/admin/import-card-data
```

**Request Body:**
```json
{
  "game_code": "onepiece",
  "set_data": {
    "name": "Romance Dawn",
    "code": "OP01",
    "release_date": "2022-07-22",
    "game_name": "One Piece"
  },
  "cards_data": [
    {
      "name": "Monkey.D.Luffy",
      "card_number": "001",
      "rarity": "Leader",
      "card_type": "Leader",
      "description": "Straw Hat Pirates Captain",
      "image_url": "https://example.com/luffy.jpg",
      "base_price": 15.99,
      "foil_price": 45.99,
      "variations": [
        {
          "name": "Regular",
          "code": null,
          "inventory": [
            {
              "quality": "Near Mint",
              "foil_type": "Regular",
              "language": "English",
              "stock_quantity": 5,
              "price": 15.99
            }
          ]
        }
      ]
    }
  ]
}
```

#### Bulk Create Variations
```bash
POST /api/admin/bulk-create-variations
```

**Request Body:**
```json
{
  "card_ids": [1, 2, 3],
  "variations": [
    {
      "name": "Alternate Art",
      "code": "AA",
      "image_url": "https://example.com/alt-art.jpg"
    }
  ],
  "create_inventory": true
}
```

#### Get Card Variations
```bash
GET /api/admin/variations/:card_id
```

**Response:**
```json
{
  "card": {
    "id": 1,
    "name": "Lightning Bolt",
    "game_name": "Magic: The Gathering",
    "set_name": "Core Set 2021"
  },
  "variations": [
    {
      "id": 1,
      "variation_name": "Regular",
      "inventory_count": 10,
      "total_stock": 25,
      "min_price": 1.50,
      "max_price": 5.00
    }
  ]
}
```

#### Delete Variation
```bash
DELETE /api/admin/variations/:variation_id
```

## Import Scripts

### Magic: The Gathering
```bash
node scripts/import-mtg-set.js BLB
```
- Uses Scryfall API
- Automatically creates price data
- Handles double-faced cards
- Respects rate limits

### Pokémon TCG
```bash
node scripts/import-pokemon-set.js sv3
```
- Uses PokémonTCG.io API
- Handles multiple price sources
- Supports all Pokémon card types
- Robust error handling

### One Piece TCG
```bash
node scripts/import-onepiece-set.js OP01
```
- Template for One Piece cards
- Extensible for actual data sources
- Handles One Piece-specific rarities
- Creates standard variations

## Data Format Examples

### MTG Card Variations
```json
{
  "name": "Lightning Bolt",
  "set": "M21",
  "variations": [
    {
      "name": "Regular",
      "code": null,
      "image_url": "https://scryfall.com/image.jpg"
    },
    {
      "name": "Borderless",
      "code": "BDL",
      "image_url": "https://scryfall.com/borderless.jpg"
    }
  ]
}
```

### Pokémon Card Variations
```json
{
  "name": "Charizard ex",
  "set": "sv3",
  "variations": [
    {
      "name": "Regular",
      "code": null
    },
    {
      "name": "Special Art Rare",
      "code": "SAR"
    },
    {
      "name": "Rainbow Rare",
      "code": "RR"
    }
  ]
}
```

### One Piece Card Variations
```json
{
  "name": "Monkey.D.Luffy",
  "set": "OP01",
  "variations": [
    {
      "name": "Regular",
      "code": null
    },
    {
      "name": "Alternative Art",
      "code": "AA"
    }
  ]
}
```

## Quality and Pricing System

### Quality Conditions
| Quality | Discount | Description |
|---------|----------|-------------|
| Near Mint | 0% | Perfect or near-perfect condition |
| Lightly Played | 15% | Slight wear, still tournament legal |
| Moderately Played | 30% | Moderate wear, sleeve playable |
| Heavily Played | 45% | Heavy wear, casual play only |
| Damaged | 65% | Significant damage |

### Foil Price Multipliers
- **MTG**: 2.5x base price
- **Pokémon**: 1.5x base price
- **One Piece**: 3.0x base price

### Language Support
- English (default)
- Japanese
- Spanish
- French
- German
- Portuguese
- Italian

## Admin Interface Integration

### Frontend Components
The system integrates with existing admin components:

- **CardGrid**: Displays variations in dropdown
- **InventoryManager**: Bulk edit quantities and prices
- **PriceUpdater**: Sync with external APIs
- **VariationCreator**: Create new variations

### Inventory Management
```javascript
// Example: Update inventory for a specific variation
PUT /api/admin/inventory/:id
{
  "stock_quantity": 10,
  "price": 25.99,
  "quality": "Near Mint",
  "foil_type": "Foil",
  "language": "English"
}
```

## Price Sync APIs

### MTG (Scryfall)
```bash
POST /api/admin/refresh-prices
{
  "game_id": 1,
  "set_ids": [1, 2, 3]
}
```

### Pokémon (PokémonTCG.io)
- Market prices from TCGPlayer
- CardMarket pricing (European)
- Multiple condition pricing

### One Piece (Manual/Future API)
- Currently manual pricing
- Extensible for future APIs
- Community price tracking

## Best Practices

### 1. Import Workflow
1. **Import Base Cards**: Use game-specific import scripts
2. **Create Variations**: Add alternate arts, promos using bulk API
3. **Update Inventory**: Set stock quantities for available cards
4. **Price Sync**: Run regular price updates
5. **Quality Check**: Review variations and pricing

### 2. Variation Naming
- **Consistent Names**: "Alternate Art", "Borderless", "Promo"
- **Clear Codes**: "AA", "BDL", "PROMO"
- **Game-Specific**: Follow official terminology

### 3. Inventory Management
- **Start with Zero Stock**: Import creates 0-quantity entries
- **Update Selectively**: Only add stock for cards you have
- **Regular Audits**: Check stock vs. physical inventory
- **Price Monitoring**: Watch for API price changes

### 4. Performance
- **Bulk Operations**: Use bulk APIs for large changes
- **Database Indexes**: Existing indexes optimize queries
- **Caching**: API results are cached appropriately
- **Pagination**: Large result sets are paginated

## Troubleshooting

### Common Issues

#### Import Failures
- **Rate Limits**: Scripts respect API rate limits
- **Invalid Set Codes**: Verify codes with official sources
- **Network Issues**: Scripts include retry logic

#### Variation Conflicts
- **Duplicate Names**: Use unique variation names per card
- **Missing Images**: Fallback to base card image
- **Price Mismatches**: Check price source priority

#### Database Constraints
- **Unique Violations**: Handled gracefully in bulk operations
- **Foreign Key Errors**: Validate card IDs before operations
- **Stock Validation**: Cannot delete variations with stock

### Monitoring
- **Error Logs**: Check server logs for import issues
- **Price Alerts**: Monitor significant price changes
- **Stock Warnings**: Low stock threshold notifications
- **API Health**: External API status monitoring

## Future Enhancements

### Planned Features
1. **Automated Price Sync**: Scheduled updates
2. **Price History**: Track price changes over time
3. **Condition Photos**: Visual condition documentation
4. **Bulk Stock Updates**: CSV import/export
5. **Advanced Filtering**: Multi-dimensional search

### API Extensions
1. **More Games**: Yu-Gi-Oh!, Dragon Ball Super, etc.
2. **Condition Detection**: AI-powered condition assessment
3. **Market Analytics**: Price trends and predictions
4. **Integration APIs**: Connect with other platforms

---

## Quick Start

1. **Import a set**:
   ```bash
   node scripts/import-mtg-set.js BLB
   ```

2. **Create variations**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/bulk-create-variations \
     -H "Content-Type: application/json" \
     -d '{
       "card_ids": [1, 2, 3],
       "variations": [{"name": "Foil Extended Art", "code": "FEA"}]
     }'
   ```

3. **Update inventory**:
   ```bash
   curl -X PUT http://localhost:5000/api/admin/inventory/1 \
     -H "Content-Type: application/json" \
     -d '{"stock_quantity": 5, "price": 24.99}'
   ```

4. **Sync prices**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/refresh-prices \
     -H "Content-Type: application/json" \
     -d '{"game_id": 1}'
   ```

This system provides the foundation for comprehensive card variation management across multiple TCGs with room for future expansion and customization.