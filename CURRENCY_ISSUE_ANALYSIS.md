# Currency Issue Analysis - Critical Finding

## 🚨 The Problem

**All prices in the database are stored in USD, not NZD.**

## Evidence

### 1. Price Source APIs Return USD

From `apps/api/src/services/cardImport.ts:44-48`:
```typescript
prices?: {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
};
```

### 2. Database Schema Documentation

From `database/DATABASE_SCHEMA.md`:

**card_pricing table** stores prices with `price_source: "scryfall"`:
```json
{
  "base_price": "19.97",
  "foil_price": "0.00",
  "price_source": "scryfall"
}
```

**card_inventory table** examples show USD pricing:
```json
{
  "price": "3.51",
  "price_source": "scryfall"
}
{
  "price": "0.76",
  "price_source": "scryfall"
}
```

These price ranges ($0.37-$3.51) are typical for USD, not NZD. If these were NZD, they'd be about 1.6x higher.

### 3. Price Import Service

From `apps/api/src/routes/pricing.ts:24`:
```typescript
price_source: z.string().default('scryfall')
```

## Current System Behavior

### What's Happening Now:
1. **Import**: Scryfall/TCGPlayer prices are imported in **USD**
2. **Storage**: Prices stored in database as **USD** (no conversion)
3. **Display**: Frontend treats stored prices as **NZD base currency**
4. **Conversion**: When user selects USD, it converts "NZD" → USD (but they're already USD!)

### Example of the Issue:
- Card costs $5.00 USD on Scryfall
- Stored in database: `5.00`
- Displayed in shop (NZD): **NZ$5.00** ⚠️ (should be ~NZ$8.20)
- User switches to USD: **$3.05** ⚠️ (5.00 × 0.61 = wrong!)
- Actual USD price: **$5.00** ✓

## Impact

### Storefront
❌ **Prices are artificially low (about 39% too low when displayed as NZD)**
- Example: A $10 USD card shows as NZ$10 instead of NZ$16.40

### Admin Dashboard
❌ **Currency conversion doubles the error**
- When viewing in USD, prices are converted again (e.g., $10 becomes $6.10)

## Solutions

### Option 1: Convert All Prices to NZD at Import (Recommended)

**Approach**: Convert USD prices to NZD when importing from APIs.

**Changes Required**:
1. Update `apps/api/src/routes/pricing.ts` to convert USD → NZD
2. Store all prices in NZD as true base currency
3. Keep current frontend conversion logic

**Pros**:
- NZD truly becomes the base currency (matches business location)
- Frontend currency conversion works correctly
- Simpler to understand: "NZD is the base, everything else converts from it"

**Cons**:
- Need to update existing database prices (one-time migration)
- Prices become slightly out of sync with USD sources (but refreshed regularly)

### Option 2: Treat USD as Base Currency

**Approach**: Change system to treat USD as the base currency.

**Changes Required**:
1. Update `CURRENCY_CONFIG.DEFAULT_CURRENCY` to `'USD'`
2. Update `CURRENCY_CONFIG.SUPPORTED_CURRENCIES` to have USD as rate 1.0
3. Update currency service to fetch rates with USD as base
4. Update all references to NZD being the "base"

**Pros**:
- Prices stay in sync with source APIs (no conversion on import)
- No database migration needed
- Matches where the price data comes from

**Cons**:
- NZD is no longer the "default" despite being the business location
- May be confusing for NZ-based business operations

### Option 3: Add Currency Column to Database

**Approach**: Store the currency code with each price.

**Changes Required**:
1. Add `price_currency` column to `card_pricing` and `card_inventory`
2. Update import to store `'USD'` as the currency
3. Update all price display logic to convert from stored currency

**Pros**:
- Most accurate and flexible
- Can support prices from multiple sources in different currencies
- Future-proof

**Cons**:
- Most complex to implement
- Requires database schema changes
- More computation at runtime

## Recommended Action

**I recommend Option 1: Convert to NZD at import time.**

### Why?
1. Your business is based in New Zealand
2. NZD being the "base currency" makes sense operationally
3. The current frontend is already built around NZD as base
4. Clean separation: Import handles conversion, frontend handles display

### Implementation Steps:
1. Create database migration to convert existing USD prices to NZD
2. Update pricing import service to convert USD → NZD using exchange rates
3. Test with a few cards to verify prices match expectations
4. Document that all database prices are in NZD

## Immediate Workaround

If you need a quick fix without changing imports:

1. Change `CURRENCY_CONFIG.DEFAULT_CURRENCY` from `'NZD'` to `'USD'`
2. Swap the exchange rates (USD = 1.0, NZD = 1.64)
3. Update UI labels to show USD as the primary currency

This would make the current prices display correctly, but NZD wouldn't be the "base" anymore.

## Questions to Consider

1. **What currency do you want customers to see by default?**
   - If NZD → Use Option 1 (convert at import)
   - If USD → Use Option 2 (keep as-is, change base currency)

2. **Do you want prices to stay in sync with US market prices?**
   - If yes → Option 2 might be better
   - If no → Option 1 is cleaner

3. **How often do you want to update exchange rates for NZD pricing?**
   - Daily? Weekly? Should match your refresh frequency

## Testing Recommendations

To verify which currency your prices are in:

1. Pick a well-known card (e.g., "Black Lotus")
2. Check its USD price on Scryfall
3. Check its price in your database
4. If they match → prices are USD
5. If database price is ~1.6x higher → prices are NZD
