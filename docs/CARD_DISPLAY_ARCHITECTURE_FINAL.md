# Card Display Architecture - FINAL SPECIFICATION

> **Version:** 2.0 (Final)  
> **Date:** 2025-10-29  
> **Status:** ✅ Complete Specification - Ready for Implementation

---

## 🎯 Core Principles

### Universal Truth
**Cards are ALWAYS grouped by `card_number` within a set.**

Every card display (admin or storefront, grid or list) follows this rule:
- One visual card per unique `card_number`
- Multiple variations of that card are accessible via dropdowns or badges
- Filters can reduce which variations appear, potentially hiding the card entirely

---

## 📊 Data Structure

### Database Schema (Cards Table)
Each row in `cards` table represents a **treatment/finish variation**:

```typescript
{
  id: number;              // Unique row ID
  card_number: string;     // e.g., "123"
  name: string;            // e.g., "Lightning Bolt"
  set_id: number;
  set_name: string;
  
  // Variation metadata (what makes this row unique)
  treatment: string;       // "STANDARD", "BORDERLESS", "EXTENDED_ART", etc.
  finish: string;          // "nonfoil", "foil", "etched"
  border_color?: string;   // "black", "white", "silver", "gold"
  frame_effect?: string;   // "legendary", "showcase", etc.
  promo_type?: string;     // "prerelease", "stamped", etc.
}
```

### Inventory Table (card_inventory)
Each row represents a **quality/language stock entry** for a card row:

```typescript
{
  id: number;              // Inventory ID
  card_id: number;         // FK to cards.id
  quality: string;         // "Near Mint", "Lightly Played", etc.
  language: string;        // "English", "Japanese", etc.
  stock_quantity: number;  // How many in stock
  price: number;           // Sale price
}
```

### Grouped Display Structure (BrowseBaseCard)
After grouping by `card_number`, we get:

```typescript
{
  // Base card info (from preferred variation)
  id: number;
  name: string;
  card_number: string;
  set_name: string;
  image_url: string;
  
  // Aggregated data
  total_stock: number;        // Sum across all variations
  variation_count: number;    // Count of treatment/finish combos
  
  // All treatment/finish variations for this card_number
  variations: BrowseVariation[]; // Array of treatment/finish combos
}

type BrowseVariation = {
  id: number;              // card row ID
  treatment: string;
  finish: string;
  border_color?: string;
  frame_effect?: string;
  promo_type?: string;
  in_stock: number;        // Aggregated across quality/language for this treatment/finish
  price?: number;          // Lowest price for this variation
}
```

### Full Inventory Data (for purchase/add actions)
When user selects a variation and quality/language:

```typescript
type CardVariation = {
  inventory_id: number;    // From card_inventory.id
  card_id: number;         // From cards.id
  quality: string;
  language: string;
  price: number;
  stock: number;
  variation_key: string;   // "Near Mint-Foil-English"
}
```

---

## 🎨 Display Modes

### GRID VIEW

#### Visual Layout
```
┌─────────────────────────────────────┐
│  Game | Set | Card Name             │  ← Header
│                                     │
│  [Card Image]                       │  ← Large image
│                                     │
│  ┌────────────────────────────────┐│
│  │ Variation: [Standard Foil  ▼] ││  ← Dropdown 1: Treatment/Finish
│  └────────────────────────────────┘│
│  ┌────────────────────────────────┐│
│  │ Quality:   [Near Mint      ▼] ││  ← Dropdown 2: Quality
│  └────────────────────────────────┘│
│  ┌────────────────────────────────┐│
│  │ Language:  [English        ▼] ││  ← Dropdown 3: Language
│  └────────────────────────────────┘│
│                                     │
│  Stock: 5 | $12.99                  │  ← Info for selected combo
│                                     │
│  [Add to Cart / Add to Inventory]   │  ← Action button
└─────────────────────────────────────┘
```

#### Grid View Rules

##### Dropdown 1: Treatment/Finish Variation
**Content:** Shows treatment + finish combinations
- Example options: "Standard Nonfoil", "Standard Foil", "Borderless Foil", "Extended Art Foil"
- **Storefront:** Only shows variations with `in_stock > 0` (aggregated across quality/language)
- **Admin (Inventory):** Only shows variations with `in_stock > 0`
- **Admin (All Cards):** Shows ALL variations regardless of stock

**Display Logic:**
```typescript
if (variations.length === 1) {
  // Show as static text/badge, no dropdown
  "Standard Foil"
} else if (variations.length > 1) {
  // Show as dropdown
  <select>
    <option>Standard Nonfoil</option>
    <option>Standard Foil</option>
    <option>Borderless Foil</option>
  </select>
}
```

##### Dropdown 2: Quality
**Content:** Shows quality grades for the selected variation
- Options: "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"
- **Storefront:** Only shows qualities with `stock_quantity > 0` for selected variation
- **Admin (Inventory):** Only shows qualities with `stock_quantity > 0`
- **Admin (All Cards):** Not shown (handled in "Add to Inventory" modal)

**Display Logic:**
```typescript
// Get inventory for selected variation (treatment/finish combo)
const inventoryForVariation = fetchInventory(selectedVariation.id);

const qualitiesInStock = inventoryForVariation.filter(inv => inv.stock_quantity > 0);

if (qualitiesInStock.length === 1) {
  // Show as static text
  "Near Mint"
} else if (qualitiesInStock.length > 1) {
  // Show as dropdown
  <select>
    <option>Near Mint (3 in stock)</option>
    <option>Lightly Played (1 in stock)</option>
  </select>
}
```

##### Dropdown 3: Language
**Content:** Shows languages for the selected variation + quality
- Options: "English", "Japanese", "Spanish", "French", etc.
- **Storefront:** Only shows languages with `stock_quantity > 0` for selected variation + quality
- **Admin (Inventory):** Only shows languages with `stock_quantity > 0`
- **Admin (All Cards):** Not shown (handled in "Add to Inventory" modal)

**Display Logic:**
```typescript
// Get inventory for selected variation + quality
const inventoryForQuality = inventoryForVariation.filter(
  inv => inv.quality === selectedQuality
);

const languagesInStock = inventoryForQuality.filter(inv => inv.stock_quantity > 0);

if (languagesInStock.length === 1) {
  // Show as static text
  "English"
} else if (languagesInStock.length > 1) {
  // Show as dropdown
  <select>
    <option>English (5 in stock)</option>
    <option>Japanese (2 in stock)</option>
  </select>
}
```

##### Stock and Price Display
Shows information for the **currently selected** variation + quality + language combination:
```typescript
const selectedInventory = getInventory(selectedVariation, selectedQuality, selectedLanguage);

// Display
Stock: {selectedInventory.stock_quantity}
Price: ${selectedInventory.price}
```

##### Action Button
- **Storefront:** "Add to Cart" - adds the selected inventory_id + quantity
- **Admin (Inventory):** "Add to Cart" (for testing purchases)
- **Admin (All Cards):** "Add to Inventory" - opens modal to create new inventory entry

---

### LIST VIEW

#### Visual Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Img] │ Game   │ Set       │ Card Name      │ #   │ Rarity │ Variations          │
├───────┼────────┼───────────┼────────────────┼─────┼────────┼─────────────────────┤
│ [📷] │ Magic  │ Dominaria │ Lightning Bolt │ 123 │ Common │ Standard Foil (5)   │
│       │        │           │                │     │        │ Borderless Foil (2) │
│       │        │           │                │     │        │ [Action Button]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### List View Rules

**Flat Structure - No Dropdowns**

List view shows a **table row per card_number** with:
1. Small thumbnail image
2. Game name
3. Set name
4. Card name
5. Card number
6. Rarity
7. **Variations column** - displays ALL treatment/finish variations as badges/text

##### Variations Column Content

**Storefront Mode:**
```
Standard Foil (5 in stock)
Borderless Foil (2 in stock)
[Add to Cart]
```
- Shows treatment + finish + stock count
- Only variations with stock > 0
- Click "Add to Cart" opens modal to select quality/language

**Admin (Inventory) Mode:**
```
Standard Foil (5 in stock)
Borderless Foil (2 in stock)
Extended Art Nonfoil (0 in stock)
[Manage]
```
- Shows treatment + finish + stock count
- Only variations with stock > 0
- "Manage" button opens inventory management

**Admin (All Cards Database) Mode:**
```
Standard Foil
Borderless Foil
Extended Art Nonfoil
Extended Art Foil
[Add to Inventory]
```
- Shows treatment + finish only (no stock count needed)
- Shows ALL variations regardless of stock
- "Add to Inventory" opens modal to select variation + quality + language

##### Quality and Language Badges
**Not shown in list view** - these are handled in modals/detail views when action buttons are clicked.

---

## 🎛️ Filter Behavior

### Filter Impact on Display

#### Treatment/Finish Filters Applied
**Example:** User filters to "Foil only"

**Before Filter:**
```
Lightning Bolt #123
  - Standard Nonfoil (10 in stock)
  - Standard Foil (5 in stock)
  - Borderless Foil (2 in stock)
```

**After Filter (Grid View):**
```
Lightning Bolt #123
  Variation: [Standard Foil ▼]  ← Dropdown still shown (2 options)
             [Borderless Foil]
  Quality: [Near Mint ▼]
  Language: [English]
  Stock: 5
```

**After Filter (List View):**
```
Lightning Bolt #123
  Standard Foil (5 in stock)
  Borderless Foil (2 in stock)
```

#### Only One Variation Matches Filter
**Example:** User filters to "Borderless + Foil"

**Result (Grid View):**
```
Lightning Bolt #123
  Variation: Borderless Foil      ← No dropdown, just text
  Quality: [Near Mint ▼]
  Language: [English]
  Stock: 2
```

**Result (List View):**
```
Lightning Bolt #123
  Borderless Foil (2 in stock)
```

#### No Variations Match Filter
**Card is completely hidden from display.**

---

## 🏗️ Component Architecture

### Shared Components (Used by Both Admin & Storefront)

```
/shared/
  /card/
    CardItem.tsx           ← Renders single card in GRID view
  /layout/
    CardGrid.tsx           ← Grid container with virtual scrolling
    CardList.tsx           ← List/table view
  /search/
    CardSearchBar.tsx      ← Game/Set/Search filters
    VariationFilter.tsx    ← Treatment/Finish/Border filters
```

### Page Containers

```
/features/
  /admin/
    /components/
      /Cards/
        CardsTab.tsx       ← Admin page container
        AddToInventoryModal.tsx
  /shop/
    ShopPage.tsx           ← Storefront page container
    AddToCartModal.tsx
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE CONTAINER                            │
│  (CardsTab.tsx or ShopPage.tsx)                             │
│                                                              │
│  1. Fetch cards from API                                    │
│  2. Apply mode filter (inventory vs all)                    │
│  3. Group by card_number using groupCardsForBrowse()        │
│  4. Pass to display components                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
              ┌────────────────┐
              │ View Mode?     │
              └────────┬───────┘
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
    ┌──────────┐            ┌─────────────┐
    │ Grid     │            │ List        │
    │ CardGrid │            │ CardList    │
    └────┬─────┘            └──────┬──────┘
         │                         │
         ↓                         ↓
    ┌──────────┐            ┌─────────────┐
    │ CardItem │            │ Row with    │
    │ w/3      │            │ badges      │
    │ dropdowns│            │             │
    └──────────┘            └─────────────┘
```

---

## 🔧 Implementation Details

### CardItem Component (Grid View)

```typescript
interface CardItemProps {
  card: BrowseBaseCard;           // Grouped card with variations array
  mode: 'storefront' | 'inventory' | 'all';
  onAction: (params: ActionParams) => void;
}

const CardItem = ({ card, mode, onAction }: CardItemProps) => {
  // State for dropdowns
  const [selectedVariation, setSelectedVariation] = useState<BrowseVariation>();
  const [selectedQuality, setSelectedQuality] = useState<string>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>();
  
  // Filter variations based on mode
  const availableVariations = useMemo(() => {
    if (mode === 'all') {
      return card.variations; // Show all
    }
    // inventory/storefront: only variations with stock
    return card.variations.filter(v => v.in_stock > 0);
  }, [card.variations, mode]);
  
  // Fetch inventory for selected variation
  const inventory = useFetchInventory(selectedVariation?.id);
  
  // Filter inventory by stock (except in 'all' mode)
  const availableQualities = useMemo(() => {
    if (mode === 'all') return []; // Handled in modal
    return inventory.filter(inv => inv.stock_quantity > 0);
  }, [inventory, mode]);
  
  // Render logic
  return (
    <div className="card">
      <img src={card.image_url} />
      
      {/* Dropdown 1: Variation */}
      {availableVariations.length === 1 ? (
        <div className="variation-badge">
          {formatVariation(availableVariations[0])}
        </div>
      ) : availableVariations.length > 1 ? (
        <select 
          value={selectedVariation?.id}
          onChange={(e) => setSelectedVariation(
            availableVariations.find(v => v.id === Number(e.target.value))
          )}
        >
          {availableVariations.map(v => (
            <option key={v.id} value={v.id}>
              {formatVariation(v)}
            </option>
          ))}
        </select>
      ) : null}
      
      {/* Dropdown 2: Quality (only if not 'all' mode) */}
      {mode !== 'all' && availableQualities.length === 1 ? (
        <div>{availableQualities[0].quality}</div>
      ) : mode !== 'all' && availableQualities.length > 1 ? (
        <select
          value={selectedQuality}
          onChange={(e) => setSelectedQuality(e.target.value)}
        >
          {availableQualities.map(inv => (
            <option key={inv.id} value={inv.quality}>
              {inv.quality} ({inv.stock_quantity} in stock)
            </option>
          ))}
        </select>
      ) : null}
      
      {/* Dropdown 3: Language (only if not 'all' mode) */}
      {mode !== 'all' && /* similar logic for language */}
      
      {/* Action button */}
      <button onClick={() => onAction({
        variation: selectedVariation,
        quality: selectedQuality,
        language: selectedLanguage
      })}>
        {mode === 'all' ? 'Add to Inventory' : 
         mode === 'inventory' ? 'Manage' : 
         'Add to Cart'}
      </button>
    </div>
  );
};
```

### CardList Component (List View)

```typescript
interface CardListProps {
  cards: BrowseBaseCard[];
  mode: 'storefront' | 'inventory' | 'all';
  onAction: (card: BrowseBaseCard, variation?: BrowseVariation) => void;
}

const CardList = ({ cards, mode, onAction }: CardListProps) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>Game</th>
          <th>Set</th>
          <th>Name</th>
          <th>#</th>
          <th>Rarity</th>
          <th>Variations</th>
        </tr>
      </thead>
      <tbody>
        {cards.map(card => {
          // Filter variations based on mode
          const variations = mode === 'all' 
            ? card.variations
            : card.variations.filter(v => v.in_stock > 0);
          
          return (
            <tr key={card.id}>
              <td><img src={card.image_url} className="w-12 h-12" /></td>
              <td>{card.game_name}</td>
              <td>{card.set_name}</td>
              <td>{card.name}</td>
              <td>{card.card_number}</td>
              <td>{card.rarity}</td>
              <td>
                {/* Variation badges */}
                {variations.map(v => (
                  <div key={v.id} className="variation-badge">
                    {formatVariation(v)}
                    {mode !== 'all' && ` (${v.in_stock} in stock)`}
                  </div>
                ))}
                
                {/* Action button */}
                <button onClick={() => onAction(card)}>
                  {mode === 'all' ? 'Add to Inventory' : 
                   mode === 'inventory' ? 'Manage' : 
                   'Add to Cart'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
```

---

## 🎬 Action Flows

### Storefront: Add to Cart (Grid View)

1. User sees card with 3 dropdowns
2. User selects variation: "Standard Foil"
3. Dropdown 2 populates with qualities in stock: "Near Mint (5)", "Lightly Played (2)"
4. User selects "Near Mint"
5. Dropdown 3 populates with languages: "English (5)"
6. User clicks "Add to Cart"
7. System adds to cart:
   ```typescript
   {
     inventory_id: 123,
     card_id: 456,
     variation_key: "Near Mint-Foil-English",
     quantity: 1,
     price: 12.99
   }
   ```

### Storefront: Add to Cart (List View)

1. User sees card with variation badges: "Standard Foil (5)", "Borderless Foil (2)"
2. User clicks "Add to Cart"
3. Modal opens showing:
   - All variations as options
   - Quality dropdown (once variation selected)
   - Language dropdown (once quality selected)
4. User makes selections
5. User confirms in modal
6. System adds to cart

### Admin (All Cards): Add to Inventory (Grid View)

1. User sees card with 1 dropdown: "Variation: Standard Foil"
2. No quality/language dropdowns (those are in the modal)
3. User clicks "Add to Inventory"
4. Modal opens (AddToInventoryModal) showing:
   - Card variation details (read-only: "Standard Foil")
   - Quality dropdown
   - Language dropdown
   - Price input
   - Stock quantity input
5. User fills in details
6. System creates inventory record:
   ```typescript
   INSERT INTO card_inventory (
     card_id,        -- ID of the "Standard Foil" card row
     quality,        -- "Near Mint"
     language,       -- "English"
     price,          -- 12.99
     stock_quantity  -- 10
   )
   ```

### Admin (All Cards): Add to Inventory (List View)

1. User sees card with variation badges: "Standard Foil", "Borderless Foil"
2. User clicks "Add to Inventory"
3. Modal opens showing:
   - Variation dropdown (all variations)
   - Quality dropdown
   - Language dropdown
   - Price input
   - Stock quantity input
4. User selects variation + fills details
5. System creates inventory record

---

## 🗂️ File Structure (Final)

```
/apps/web/src/
  /shared/
    /card/
      CardItem.tsx              ← GRID view card (3 dropdowns)
      CardSkeleton.tsx
      index.ts
    /layout/
      CardGrid.tsx              ← Grid container (calls CardItem)
      CardList.tsx              ← LIST view (table with badges)
      index.ts
    /search/
      CardSearchBar.tsx         ← Game/Set/Search filters (shared)
      VariationFilter.tsx       ← Treatment/Finish filters (shared)
      index.ts
    /ui/
      VariationBadge.tsx        ← Badge for displaying variations
      
  /features/
    /admin/
      /components/
        /Cards/
          CardsTab.tsx          ← Admin container (uses CardGrid/CardList)
          AddToInventoryModal.tsx
      /utils/
        cardAdapters.ts         ← Type conversion utilities
        
    /shop/
      ShopPage.tsx              ← Storefront container (uses CardGrid/CardList)
      AddToCartModal.tsx
      
  /lib/
    /utils/
      groupCards.ts             ← groupCardsForBrowse() utility
```

---

## 🚫 What to Delete

### ❌ AdminCardGrid.tsx
**File:** `/features/admin/components/Cards/AdminCardGrid.tsx`

**Reason:** 100% redundant - `CardGrid.tsx` already handles both admin and storefront modes via props.

**Migration:**
```typescript
// OLD (CardsTab.tsx)
import AdminCardGrid from './AdminCardGrid';
<AdminCardGrid cards={cards} mode="all" />

// NEW (CardsTab.tsx)
import { CardGrid } from '@/shared/layout';
<CardGrid cards={cards} mode="all" onAddToInventory={handleAdd} />
```

---

## ✅ Testing Checklist

### Grid View Tests

**Storefront Mode:**
- [ ] Card with 1 variation: Flat display (no dropdown)
- [ ] Card with multiple variations: Dropdown 1 shown
- [ ] Selecting variation populates quality dropdown
- [ ] Selecting quality populates language dropdown
- [ ] Stock count updates per selection
- [ ] Price updates per selection
- [ ] Add to Cart adds correct inventory_id

**Admin (Inventory) Mode:**
- [ ] Only cards with stock > 0 shown
- [ ] Only variations with stock > 0 in dropdown
- [ ] Same dropdown behavior as storefront
- [ ] Action button says "Manage"

**Admin (All Cards) Mode:**
- [ ] ALL cards shown (even stock = 0)
- [ ] ALL variations shown in dropdown 1
- [ ] NO quality/language dropdowns
- [ ] Action button says "Add to Inventory"
- [ ] Clicking button opens modal with all fields

### List View Tests

**Storefront Mode:**
- [ ] All cards grouped by card_number
- [ ] Variation badges show treatment + finish + stock
- [ ] Only variations with stock > 0 shown
- [ ] Clicking action opens modal with dropdowns

**Admin (Inventory) Mode:**
- [ ] Only cards with stock shown
- [ ] Only variations with stock shown
- [ ] Stock counts displayed

**Admin (All Cards) Mode:**
- [ ] ALL cards shown
- [ ] ALL variations shown as badges
- [ ] NO stock counts displayed
- [ ] Action button opens modal

### Filter Tests
- [ ] Treatment filter reduces variations shown
- [ ] Finish filter reduces variations shown
- [ ] Combined filters work correctly
- [ ] Card with only 1 matching variation: no dropdown
- [ ] Card with 0 matching variations: hidden entirely
- [ ] Admin (All Cards): filters still show all variations

---

## 📐 Component Props Reference

### CardGrid
```typescript
interface CardGridProps {
  cards: BrowseBaseCard[];
  mode: 'storefront' | 'inventory' | 'all';
  viewMode: 'grid' | 'list';
  
  // Mode-specific handlers
  onAddToCart?: (params: {
    card: BrowseBaseCard;
    inventoryId: number;
    quantity: number;
  }) => void;
  
  onAddToInventory?: (card: BrowseBaseCard) => void;
  onManage?: (card: BrowseBaseCard) => void;
  
  // UI props
  isLoading?: boolean;
  enableVirtualScroll?: boolean;
  currency?: Currency;
}
```

### CardItem (Grid)
```typescript
interface CardItemProps {
  card: BrowseBaseCard;
  mode: 'storefront' | 'inventory' | 'all';
  currency?: Currency;
  onAction: (params: ActionParams) => void;
}

type ActionParams = {
  card: BrowseBaseCard;
  variationId: number;
  inventoryId?: number;  // Only if quality/language selected
  quality?: string;
  language?: string;
};
```

### CardList (List)
```typescript
interface CardListProps {
  cards: BrowseBaseCard[];
  mode: 'storefront' | 'inventory' | 'all';
  currency?: Currency;
  onAction: (card: BrowseBaseCard, variation?: BrowseVariation) => void;
}
```

---

## 🎓 Key Concepts Summary

### 1. Grouping
- **Always** group by `card_number` within a set
- Use `groupCardsForBrowse()` utility function
- Results in `BrowseBaseCard` with `variations` array

### 2. Variations vs Inventory
- **Variations** = Treatment/Finish combos (from `cards` table rows)
- **Inventory** = Quality/Language stock entries (from `card_inventory` table)
- Dropdown 1 shows Variations
- Dropdowns 2-3 show Inventory options for selected Variation

### 3. Mode Behavior
- **Storefront:** Only show items with stock > 0
- **Admin (Inventory):** Only show items with stock > 0
- **Admin (All Cards):** Show everything, no stock filtering

### 4. View Modes
- **Grid:** Large cards, 3 dropdowns, action button
- **List:** Table rows, variation badges, action button

### 5. Dropdown Display Logic
```typescript
if (options.length === 0) {
  return null; // Hide
} else if (options.length === 1) {
  return <div>{options[0]}</div>; // Flat display
} else {
  return <select>{options.map(...)}</select>; // Dropdown
}
```

---

## 🚀 Implementation Priority

1. **Phase 1:** Delete `AdminCardGrid.tsx`
2. **Phase 2:** Update `CardItem.tsx` to implement 3-dropdown system for grid view
3. **Phase 3:** Update `CardList.tsx` to implement badge system for list view
4. **Phase 4:** Update `CardsTab.tsx` to use shared `CardGrid`
5. **Phase 5:** Update `ShopPage.tsx` to use shared components consistently
6. **Phase 6:** Test all mode + view combinations
7. **Phase 7:** Update modals (AddToCart, AddToInventory) to handle selection state

---

## 📞 Questions Resolved

✅ **#1:** Three dropdowns required: Variation (Treatment+Finish), Quality, Language  
✅ **#2:** Stock displayed per selected variation  
✅ **#3:** Admin vs Storefront differ only in action button label  
✅ **#4:** Filters that leave only 1 option show flat (no dropdown)  
✅ **#5:** List view shows badges, Grid view shows dropdowns  

---

**END OF SPECIFICATION**

This document is now the single source of truth for card display implementation.
