# TCG Single Card Shop Interface

## Project Overview

A best-of-breed single storefront for trading card game (TCG) singles, supporting multiple card games with real-time inventory and comprehensive card variation management. The interface prioritizes simplicity, elegance, and exceptional user experience while maintaining professional polish and accessibility standards.

### Supported Games (Priority Order)
1. Magic: The Gathering (MTG)
2. Pokémon TCG
3. One Piece Card Game

## Core Philosophy

### Design Principles
- **Simplicity First**: Every feature should feel intuitive and effortless
- **Elegant Interactions**: Smooth transitions, thoughtful micro-interactions, premium feel
- **Accessibility-First**: WCAG AAA compliance is non-negotiable, not an afterthought
- **Mobile-Responsive**: Excellent experience across all devices with proper touch targets
- **Performance Matters**: Fast load times, optimized searches, smooth scrolling

### Quality Standards
- A++ visual design quality - this should feel premium
- Real-world usability over technical showcases
- Complete implementations, not partial fixes
- Production-ready code with proper error handling
- Comprehensive documentation that stays synchronized with code

## User Experience Requirements

### Primary User Flow
```
Browse/Search → Filter/Refine → View Card Details → Add to Cart → Checkout
```

### Core Features
- **Advanced Filtering**: Best-in-class filtering system with faceted search including dynamic variation filters
- **Real-time Inventory**: Live stock quantities and availability per card variation
- **Multi-game Support**: Seamless switching between card games
- **Card Variations**: Support for foils, special treatments, alternate arts, and promotional versions
- **Card Details**: Comprehensive information with high-quality imagery
- **Simple Cart**: Straightforward add-to-cart and checkout process

### Future Considerations (Not Current Scope)
- Collection management
- Wishlist/saved searches
- Price tracking and alerts

## Technical Architecture

### Stack
- **Frontend**: React with modern hooks patterns
- **Backend**: Node.js/Express with RESTful API
- **Database**: PostgreSQL for relational data integrity with advanced variation tracking
- **Search**: PostgreSQL full-text search with pg_trgm for fuzzy matching
- **State Management**: React hooks with context for global state

### External Integrations
- **Scryfall API**: MTG card data, imagery, and variation metadata
- **PokémonTCG.io API**: Pokémon card data and imagery
- **Future**: Collectr API for price data
- Integration architecture supports adding new card games easily

### Data Structure

#### Card Entity (Enhanced with Variations)
```typescript
{
  // Identity
  id: integer (primary key)
  game_id: integer (foreign key to games)
  set_id: integer (foreign key to card_sets)
  name: string
  card_number: string
  
  // Physical attributes
  rarity: string
  card_type: string
  description: text
  image_url: string
  
  // Variation Metadata (NEW)
  treatment: string          // e.g., 'STANDARD', 'BORDERLESS', 'EXTENDED'
  finish: string            // 'foil' or 'nonfoil'
  border_color: string      // 'black', 'borderless', 'white', 'yellow'
  frame_effect: string      // 'extendedart', 'showcase', 'inverted'
  promo_type: string        // Special foil types like 'surgefoil', 'neonink'
  sku: string (unique)      // e.g., 'FIN-212-STANDARD-NONFOIL'
  
  // API References
  scryfall_id: string
  tcgplayer_id: integer
  pokemontcg_id: string
  
  // Full-text search
  search_tsv: tsvector
  
  // Metadata
  created_at: timestamp
  updated_at: timestamp
}
```

#### Inventory Entity
```typescript
{
  id: integer (primary key)
  card_id: integer (foreign key)
  variation_id: integer (nullable, for manual variations)
  
  // Condition & Language
  quality: string           // 'Near Mint', 'Lightly Played', etc.
  foil_type: string        // 'Regular', 'Foil'
  language: string         // 'English', 'Japanese', etc.
  
  // Stock & Pricing
  stock_quantity: integer
  price: decimal
  cost: decimal (optional)
  price_source: string     // 'api_scryfall', 'manual', etc.
  
  // Management
  sku: string (unique)
  low_stock_threshold: integer
  auto_price_enabled: boolean
  
  // Metadata
  created_at: timestamp
  updated_at: timestamp
  last_price_update: timestamp
}
```

#### Variation Metadata Tables (NEW)
```typescript
// Set-level variation tracking
set_variations_metadata {
  id: integer
  set_id: integer
  game_id: integer
  visual_treatments: jsonb     // Array of treatments in this set
  special_foils: jsonb        // Array of special foil types
  border_colors: jsonb        // Array of border colors
  frame_effects: jsonb        // Array of frame effects
  treatment_codes: jsonb      // Array of all treatment codes
  total_cards: integer
  total_variations: integer
  last_analyzed: timestamp
}

// Game-level variation tracking
game_variations_metadata {
  id: integer
  game_id: integer
  visual_treatments: jsonb
  special_foils: jsonb
  border_colors: jsonb
  frame_effects: jsonb
  treatment_codes: jsonb
  total_sets: integer
  total_cards: integer
  total_variations: integer
  last_analyzed: timestamp
}
```

## Card Variation System

### Variation Types

#### Magic: The Gathering Variations
- **Finishes**: Nonfoil, Foil, Etched
- **Treatments**: Standard, Borderless, Extended Art, Showcase, Full Art
- **Special Foils**: Surge Foil, Galaxy Foil, Neon Ink, Chocobo Track Foil, Step-and-Compleat, Textured
- **Border Colors**: Black, Borderless, White, Silver
- **Frame Effects**: Extended Art, Inverted, Showcase variations

#### Pokémon Variations
- **Finishes**: Regular, Holofoil, Reverse Holofoil
- **Treatments**: Full Art, Alternate Art, Special Art, Trainer Gallery
- **Special Types**: Gold Rare, Rainbow Rare, Secret Rare

#### One Piece Variations
- **Treatments**: Regular, Manga Rare, Comic Parallel, Special Parallel
- **Finishes**: Standard, Foil variations

### Variation Framework Features

1. **Dynamic Discovery**: Automatically detects and catalogs variations during import
2. **Metadata Tracking**: Stores available variations per set and game
3. **Materialized Views**: Fast filtering using pre-computed variation data
4. **SKU Generation**: Unique identifiers for each card variation (e.g., `FIN-212-STANDARD-NONFOIL`)
5. **Flexible Inventory**: Link inventory to specific variations or qualities

### Database Constraints

**Cards Table:**
- **Unique Constraint**: `(set_id, card_number, finish)` - Allows multiple finishes of same card
- **SKU Unique**: Each variation has a unique SKU

**Inventory Table:**
- **Unique Constraint**: `(card_id, variation_id, quality, foil_type, language)` - Prevents duplicates

## Search & Filtering Requirements

### Search Capabilities
- **Full-text search**: Card names with fuzzy matching for typos
- **Advanced search**: Multiple field combinations (set, type, rarity, etc.)
- **Variation search**: Filter by treatment, finish, special foils
- **Autocomplete**: Intelligent suggestions as user types
- **Debounced input**: Smooth typing experience without excessive API calls (300ms)
- **Fast results**: Sub-200ms search response time target

### Filter Categories (Enhanced with Variations)

#### MTG Filters
- Colors/Color Identity
- Card Type (Creature, Instant, Sorcery, etc.)
- Mana Value (CMC)
- Rarity
- Set/Expansion
- **Treatment** (Standard, Borderless, Extended Art, Showcase) **[NEW]**
- **Finish** (Nonfoil, Foil, Etched) **[NEW]**
- **Border Color** (Black, Borderless, White) **[NEW]**
- **Special Foils** (Surge Foil, Neon Ink, etc.) **[NEW]**
- Format Legality
- Power/Toughness ranges
- Condition
- Price range

#### Pokémon Filters
- Type (Grass, Fire, Water, etc.)
- Rarity
- Set/Expansion
- HP range
- Stage (Basic, Stage 1, Stage 2, etc.)
- Card Type (Pokémon, Trainer, Energy)
- **Treatment** (Full Art, Alternate Art, etc.) **[NEW]**
- **Finish** (Regular, Holofoil, Reverse Holofoil) **[NEW]**
- Condition
- Price range

#### Universal Filters (All Games)
- In Stock only toggle
- Price range slider
- Condition checkboxes
- Language selector
- Sort options (Price, Name, Set, Rarity, Newest)

### Dynamic Filter Loading (NEW)

Filters are loaded based on what actually exists in the database:
- **Set-specific**: Only show variations available in selected set
- **Game-wide**: Show all variations across selected game
- **Real-time counts**: Display number of cards matching each filter
- **Materialized views**: `mv_set_variation_filters` for fast performance

### Filter UX Requirements
- Collapsible filter panels on mobile
- Clear active filter indicators with counts
- One-click clear all filters
- Filter counts showing result quantities
- Persistent filters during session
- URL-based filter state (shareable links)
- **Variation badges**: Visual indicators for treatments and finishes **[NEW]**

## Admin Dashboard Requirements

### Two-View System

#### 1. Card Management View (All Cards)
**Purpose**: Browse and manage all imported cards from the database

**Features**:
- Display all cards with their variations (treatments + finishes)
- Group by base card (same name + card_number)
- Show variation badges (Standard, Foil, Borderless, etc.)
- Expandable variation details
- Add to inventory button for variations without stock
- Clear visual distinction between cards with/without inventory
- **NO quality badges** until inventory is added

**Display Logic**:
```
Card: "Lightning Bolt #001"
  Variations:
    ✓ Standard Nonfoil (0 in stock) [Add to Inventory]
    ✓ Standard Foil (5 in stock) [Manage Stock]
    ✓ Borderless Nonfoil (0 in stock) [Add to Inventory]
```

#### 2. Inventory Management View
**Purpose**: Manage stock quantities, pricing, and conditions for cards you actually have

**Features**:
- Display only cards with inventory entries
- Group by card with quality/condition breakdown
- Expandable quality rows (Near Mint, Lightly Played, etc.)
- Inline editing for price and stock quantities
- Bulk operations (price updates, stock adjustments)
- Low stock alerts
- Last updated timestamps
- Price source tracking (API vs Manual)

### Admin Operations

#### Bulk Operations
- Bulk price updates across variations
- Bulk stock adjustments
- Set-wide operations
- Treatment-specific operations (e.g., update all foil prices)
- CSV import/export with variation support
- **Variation analysis**: Refresh metadata tables

#### Import System
- **Script**: `scripts/import_mtg_with_variations.js`
- Auto-detects and catalogs variations
- Generates unique SKUs
- Updates metadata tables automatically
- Handles double-faced cards
- Respects API rate limits

#### Analysis Tools
- **Script**: `scripts/analyze-variations.js`
- Analyze set-level variations
- Update game-wide metadata
- Refresh materialized views
- Generate variation statistics

#### Schema Documentation
- **Script**: `scripts/export-database-schema.js`
- Auto-generates comprehensive schema docs
- Includes sample data and relationships
- Outputs Mermaid ERD diagrams
- Tracks table statistics
- **Must be run after schema changes**

### Admin Interface Standards
- Same accessibility and UX standards as customer interface
- Clear visual hierarchy for card variations
- No confusing quality badges on cards without inventory
- Clear confirmation dialogs for destructive actions
- Undo capability where feasible
- Audit logging for inventory changes
- Role-based access control

## User Interface Guidelines

### Layout Structure
```
[Header: Logo, Game Selector, Search Bar, Cart Icon]
[Main Content Area]
  [Sidebar Filters (Desktop) / Drawer (Mobile)]
    [Dynamic Variation Filters] [NEW]
  [Card Grid: Responsive columns (1-2-3-4 based on viewport)]
  [Pagination/Infinite Scroll]
[Footer: Links, Info]
```

### Card Display (Enhanced)
- **Grid View**: 
  - Card image prominent with variation badge overlay
  - Name, set, card number
  - Treatment and finish badges
  - Price and stock status
  - Foil shimmer effect for foil cards
  
- **Variation Indicators**: 
  - Clear badges for treatments (Borderless, Extended Art, etc.)
  - Sparkle icon for foil finishes
  - Special foil type labels (Surge Foil, Neon Ink)
  - Border color indicators

- **List View** (optional): 
  - Compact row format with variation details
  - Inline variation badges
  
- **Card Hover/Focus**: 
  - Subtle scale animation
  - Quick view trigger showing all variations
  
- **Loading States**: Skeleton screens, not spinners

- **Empty States**: 
  - Helpful messaging with suggested actions
  - "No cards found" with filter adjustment suggestions

### Card Detail View (Enhanced)
- High-resolution image with variation indicator
- **Variation Selector**: Dropdown or button group for treatments/finishes
- Complete card information
- Price per variation
- Condition selector (if multiple qualities in stock)
- Quantity selector with stock validation
- Add to cart button (prominent, accessible)
- SKU display for reference
- Related variations showcase
- Treatment description tooltip

### Variation Badge Design Standards
```scss
// Treatment badges
.treatment-standard { 
  background: gray-100; 
  color: gray-800; 
}

.treatment-borderless { 
  background: purple-100; 
  color: purple-800; 
  border: purple-300;
}

.treatment-extended { 
  background: blue-100; 
  color: blue-800; 
}

// Foil indicator
.finish-foil {
  background: gradient(yellow-400, yellow-500);
  animation: shimmer 2s infinite;
}

// Special foils
.special-foil {
  background: gradient(pink-400, purple-400);
}
```

### Responsive Breakpoints
```scss
$mobile: 320px - 767px;    // 1 column grid
$tablet: 768px - 1023px;   // 2-3 column grid
$desktop: 1024px - 1439px; // 3-4 column grid
$wide: 1440px+;            // 4+ column grid
```

### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between clickable items (minimum 8px)
- Swipeable filter drawers on mobile
- Large enough variation badges for easy tapping

## Accessibility Requirements

### WCAG AAA Compliance
- **Color Contrast**: 7:1 minimum for normal text, 4.5:1 for large text
- **Variation Badges**: Maintain contrast ratios, not color-only indicators
- **Keyboard Navigation**: Full site navigable without mouse
- **Focus Indicators**: Clear, visible focus states (not just outline)
- **Screen Reader Support**: 
  - Semantic HTML
  - ARIA labels for variation badges
  - Announce stock changes
  - Announce filter updates
- **Alt Text**: All card images with descriptive alt including variation
- **Error Handling**: Clear, descriptive error messages
- **Form Labels**: Every input properly labeled

### Specific Implementations
- Skip to main content link
- Landmark regions (header, main, nav, footer)
- Heading hierarchy (h1 → h2 → h3, no skips)
- Button vs link distinction (actions vs navigation)
- Loading announcements for screen readers
- Reduced motion preferences respected
- **Variation changes announced** to screen readers

## Performance Standards

### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Optimization Strategies
- Lazy load card images with proper aspect ratio containers
- Virtual scrolling for large result sets (1000+ cards)
- Debounced search input (300ms)
- Optimistic UI updates for cart operations
- Efficient re-renders (React.memo, useMemo where appropriate)
- Code splitting by game type
- CDN for card images
- Progressive image loading (LQIP or blur-up)
- **Materialized views** for fast variation filtering
- **Database indexes** on variation columns
- **Batch variation updates** during import

### Database Optimization (NEW)
```sql
-- Indexes for variation filtering
CREATE INDEX idx_cards_treatment ON cards(treatment);
CREATE INDEX idx_cards_finish ON cards(finish);
CREATE INDEX idx_cards_border_color ON cards(border_color);
CREATE INDEX idx_cards_set_treatment ON cards(set_id, treatment);

-- Materialized view for fast filtering
CREATE MATERIALIZED VIEW mv_set_variation_filters AS
SELECT 
  set_id,
  ARRAY_AGG(DISTINCT treatment) as treatments,
  ARRAY_AGG(DISTINCT border_color) as border_colors,
  ARRAY_AGG(DISTINCT finish) as finishes
FROM cards
GROUP BY set_id;

-- Refresh function
CREATE FUNCTION refresh_variation_filters() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_set_variation_filters;
END;
$$ LANGUAGE plpgsql;
```

## Code Quality Standards

### React Patterns
```tsx
// Component Structure
- Functional components with hooks
- Custom hooks for shared logic
- Proper prop typing (TypeScript preferred)
- Error boundaries for graceful failures
- Suspense for async operations

// State Management
- Local state with useState for simple UI state
- Context for theme, user session, variation filters
- React Query for server state management
- Custom hooks for variation logic

// Code Organization
/components
  /common      // Buttons, Inputs, Cards, VariationBadge
  /layout      // Header, Footer, Sidebar
  /features    // CardGrid, Filters, SearchBar, VariationSelector
  /admin       // AdminDashboard, AllCardsView, InventoryManager
/hooks
  /useVariationFilters.js
  /useCardVariations.js
/utils
  /variationUtils.js  // Variation formatting and logic
```

### Variation Utilities (NEW)
```javascript
// Format treatment names for display
export const formatTreatment = (treatment) => {
  if (!treatment || treatment === 'STANDARD') return 'Standard';
  return treatment.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
};

// Get badge color for treatment
export const getTreatmentColor = (treatment) => {
  const colors = {
    'STANDARD': 'gray',
    'BORDERLESS': 'purple',
    'EXTENDED': 'blue',
    'SHOWCASE': 'indigo',
  };
  return colors[treatment] || 'gray';
};

// Generate variation display name
export const getVariationDisplayName = (card) => {
  const treatment = formatTreatment(card.treatment);
  const finish = card.finish === 'foil' ? ' Foil' : '';
  return `${treatment}${finish}`;
};
```

### Semantic HTML
```html
<!-- Use proper elements -->
<nav> for navigation
<main> for main content
<article> for card items
<button> for actions
<a> for navigation
<form> for search/filters
<dl> for variation details (definition list)

<!-- Variation badges -->
<span class="badge" role="status" aria-label="Borderless treatment">
  Borderless
</span>
```

### CSS/Styling
- CSS Modules or styled-components (avoid global styles)
- Consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px)
- Typography scale with rem units
- Dark mode support (future consideration)
- Animations respect prefers-reduced-motion
- **Variation badge system** with consistent styling
- **Foil shimmer effects** using CSS gradients and animations

### Error Handling
```tsx
// User-friendly error messages
"Unable to load cards. Please try again." 
// Not: "Error 500: Internal Server Error"

// Variation-specific errors
"This variation is out of stock."
"Unable to load variation data."

// Retry mechanisms for network failures
// Offline state handling
// Graceful degradation
```

## Testing Requirements

### User Testing Checklist
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)
- [ ] Desktop Chrome, Firefox, Safari
- [ ] Screen reader testing (NVDA/JAWS/VoiceOver)
- [ ] Keyboard-only navigation
- [ ] **Variation filter interactions**
- [ ] **Variation badge visibility**
- [ ] **Admin card vs inventory views**
- [ ] Slow 3G network simulation
- [ ] Empty state handling
- [ ] Large dataset handling (10,000+ cards with variations)

### Automated Testing
- Unit tests for utility functions
- **Variation formatting tests**
- Integration tests for filter logic
- **Variation metadata refresh tests**
- E2E tests for critical user paths
- Visual regression testing for UI components
- **Variation badge rendering tests**
- Accessibility testing (jest-axe)

## API Design Principles

### RESTful Endpoints (Enhanced)
```
GET    /api/cards                    // List with variation filters
GET    /api/cards/:id                // Single card detail
GET    /api/cards/:id/variations     // Get all variations of a card
GET    /api/admin/all-cards          // Admin: All cards with variations [NEW]
GET    /api/admin/inventory          // Admin: Inventory management
POST   /api/admin/inventory          // Admin: Add inventory for variation
GET    /api/sets                     // Available sets by game
GET    /api/variations/filters       // Dynamic variation filters [NEW]
GET    /api/search/autocomplete      // Search suggestions
POST   /api/cart/items               // Add to cart (with variation)
GET    /api/cart                     // Get cart contents
```

### Query Parameters for Filtering (Enhanced)
```
/api/cards?
  game=mtg
  &name=lightning
  &colors=R,W
  &rarity=rare,mythic
  &set=fin
  &treatment=BORDERLESS,EXTENDED    // NEW
  &finish=foil                      // NEW
  &border_color=borderless          // NEW
  &promo_type=surgefoil            // NEW
  &inStock=true
  &priceMin=1.00
  &priceMax=50.00
  &sort=price_asc
  &page=1
  &limit=50
```

### Response Format (Enhanced)
```json
{
  "data": [
    {
      "id": 1042,
      "name": "Lightning Bolt",
      "card_number": "212",
      "treatment": "STANDARD",
      "finish": "nonfoil",
      "border_color": "black",
      "frame_effect": null,
      "promo_type": null,
      "sku": "FIN-212-STANDARD-NONFOIL",
      "variations": [
        {
          "card_id": 1042,
          "treatment": "STANDARD",
          "finish": "nonfoil",
          "stock": 0
        },
        {
          "card_id": 1043,
          "treatment": "STANDARD",
          "finish": "foil",
          "stock": 5
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 594,
    "total_variations": 1114,
    "pages": 12
  },
  "filters": {
    "applied": {
      "treatment": ["BORDERLESS"],
      "finish": ["foil"]
    },
    "available": {
      "treatments": ["STANDARD", "BORDERLESS", "EXTENDED"],
      "finishes": ["nonfoil", "foil"],
      "border_colors": ["black", "borderless"],
      "special_foils": ["surgefoil", "neonink"]
    }
  }
}
```

### Admin API Endpoints (NEW)
```
GET    /api/admin/all-cards          // Browse all cards with variations
  - Groups by base card
  - Shows inventory status per variation
  - Supports filtering by treatment/finish
  - Returns variation count and stock totals

GET    /api/admin/inventory          // Manage inventory
  - Shows only cards with inventory entries
  - Groups by card with quality breakdown
  - Supports bulk operations

POST   /api/admin/bulk-create-variations
  - Create variations for multiple cards
  - Specify treatment types
  - Optionally create inventory entries

POST   /api/admin/analyze-variations
  - Trigger metadata refresh
  - Update materialized views
  - Return variation statistics
```

## Integration Guidelines

### Scryfall (MTG)
- Cache card data locally after initial fetch
- Use card images via Scryfall CDN
- Respect rate limits (10 requests per second)
- Handle multi-faced cards properly
- Store Scryfall ID for reference
- **Extract variation metadata** (finishes, treatments, promo types)
- **Map Scryfall treatments** to internal treatment codes
- **Handle special foil types** (surge foil, neon ink, etc.)
- **Import all variations** (foil/nonfoil/etched for each treatment)

### Import Process (NEW)
```javascript
// Import script structure
1. Fetch cards from Scryfall API with pagination
2. For each card:
   - Extract base card data
   - Identify treatments from card properties
   - Determine finishes available
   - Calculate treatment code
   - Generate SKU
   - Create card entry for each finish
3. Analyze variations and update metadata
4. Refresh materialized views
```

### PokémonTCG.io
- Similar caching strategy
- Handle alternate arts/variations
- Map API rarity to internal system
- Store PokémonTCG.io ID for reference
- **Extract variation types** (Full Art, Alternate Art, etc.)

### Collectr (Future)
- Price data refresh schedule
- Historical pricing (if scope expands)
- Price trend indicators
- **Price variations by finish** (foil vs nonfoil pricing)

## Security Considerations

### Customer-Facing
- Input sanitization (prevent XSS)
- Rate limiting on search
- CSRF protection on forms
- Secure session management
- HTTPS only
- **Validate variation parameters** in API requests

### Admin
- Strong authentication required (JWT)
- Role-based access control
- Audit logging for all changes
- **Variation import audit trail**
- **Bulk operation confirmations**
- Secure file uploads
- IP allowlisting (optional)

## Documentation Standards

### Code Comments
```tsx
// Good: Explains WHY, not WHAT
// Debounce search to prevent excessive API calls during typing
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);

// Variation-specific comments
// Group cards by base name + card_number to show all finishes together
const groupedCards = groupByBaseCard(cards);
```

### Component Documentation
- Props interface with JSDoc comments
- Usage examples for complex components
- Accessibility notes where relevant
- Known limitations or caveats
- **Variation handling notes**

### Database Documentation (NEW)
- **Auto-generated schema docs**: `docs/DATABASE_SCHEMA.md`
- **Generated after every schema change**
- Includes:
  - Complete table structures
  - All constraints and indexes
  - Sample data with variations
  - Entity Relationship Diagrams (Mermaid)
  - Table statistics
  - View definitions

### Generate Schema Documentation
```bash
# Run after any database schema changes
npm run schema:export

# Outputs:
# - docs/DATABASE_SCHEMA.md (human-readable)
# - docs/database-stats.json (machine-readable)
```

## Deployment & Monitoring

### Performance Monitoring
- Real User Monitoring (RUM)
- Error tracking (Sentry or similar)
- Analytics for user behavior
- Search performance metrics
- Cart abandonment tracking
- **Variation filter usage tracking**
- **Import job monitoring**
- **Metadata refresh monitoring**

### Database Maintenance (NEW)
```bash
# Refresh variation metadata
npm run analyze-variations

# Update materialized views
psql $DATABASE_URL -c "SELECT refresh_variation_filters();"

# Clean up orphaned metadata
psql $DATABASE_URL -c "
  DELETE FROM set_variations_metadata 
  WHERE set_id NOT IN (SELECT id FROM card_sets);
"
```

### Continuous Improvement
- A/B testing framework ready
- Feature flags for gradual rollouts
- User feedback mechanism
- Regular accessibility audits
- Performance budgets enforced
- **Variation system analytics** (which treatments are most popular)

## Anti-Patterns to Avoid

### UI/UX
- ❌ Infinite scroll without pagination option
- ❌ Auto-playing animations that can't be stopped
- ❌ Hover-only interactions (need keyboard/touch alternatives)
- ❌ Modal dialogs that trap focus improperly
- ❌ Loading states that cause layout shift
- ❌ Generic error messages without actionable guidance
- ❌ **Showing quality badges for cards without inventory** [FIXED]
- ❌ **Generating fake variations that don't exist in database** [FIXED]
- ❌ **Unclear variation indicators** [FIXED]

### Code
- ❌ Premature optimization
- ❌ Over-engineering simple features
- ❌ Ignoring TypeScript errors
- ❌ Prop drilling beyond 2-3 levels (use context)
- ❌ Massive components (split at ~200 lines)
- ❌ Inline styles for anything beyond dynamic values
- ❌ **Circular imports** (especially in database config) [FIXED]
- ❌ **N+1 queries for variations** (use joins/grouping) [FIXED]

### Data
- ❌ N+1 query problems
- ❌ Loading all cards at once
- ❌ No pagination on large datasets
- ❌ Unindexed database queries
- ❌ Storing images in database
- ❌ **Duplicate card entries without unique SKUs** [FIXED]
- ❌ **Missing indexes on variation columns** [FIXED]
- ❌ **Stale materialized views** [FIXED]

## Success Metrics

### User Experience
- Time to first card view < 1 second
- Search to result < 300ms
- **Variation filter response** < 200ms [NEW]
- Add to cart completion rate > 85%
- Mobile bounce rate < 40%
- Accessibility score 100 (Lighthouse)
- **Variation selection conversion** > 80% [NEW]

### Business
- Cart abandonment rate
- Average items per transaction
- Search → purchase conversion rate
- Return visitor rate
- **Foil vs nonfoil purchase ratio** [NEW]
- **Special treatment card popularity** [NEW]

### Technical
- **Import speed**: > 200 cards/minute [NEW]
- **Variation analysis time**: < 30 seconds per set [NEW]
- **Materialized view refresh**: < 5 seconds [NEW]
- **Schema documentation generation**: < 60 seconds [NEW]

## Utility Scripts

### Import Scripts
```bash
# Import MTG set with variations
node scripts/import_mtg_with_variations.js FIN

# Import Pokemon set
node scripts/import-pokemon-set.js sv3

# Import One Piece set
node scripts/import-onepiece-set.js OP01
```

### Analysis Scripts
```bash
# Analyze variations for a specific set
node scripts/analyze-variations.js FIN

# This will:
# - Analyze set-level variations
# - Update game-wide metadata
# - Refresh materialized views
# - Generate statistics
```

### Schema Management
```bash
# Export database schema documentation
npm run schema:export

# Outputs:
# - docs/DATABASE_SCHEMA.md (full documentation)
# - docs/database-stats.json (statistics)

# Should be run after:
# - Schema migrations
# - Major data imports
# - Adding new tables/columns
```

### Database Maintenance
```bash
# Refresh materialized views
psql $DATABASE_URL -c "SELECT refresh_variation_filters();"

# Clean up orphaned metadata
psql $DATABASE_URL -c "
  DELETE FROM set_variations_metadata 
  WHERE set_id NOT IN (SELECT id FROM card_sets);
  
  DELETE FROM game_variations_metadata 
  WHERE game_id NOT IN (SELECT id FROM games);
"

# Verify variation data integrity
psql $DATABASE_URL -c "
  SELECT 
    cs.code,
    COUNT(DISTINCT c.card_number) as unique_cards,
    COUNT(c.id) as total_variations,
    COUNT(DISTINCT c.treatment) as treatments
  FROM card_sets cs
  JOIN cards c ON c.set_id = cs.id
  GROUP BY cs.code;
"
```

## Project Structure (Enhanced)

```
mana-meeples-singles-market/
├── config/
│   └── database.js              # Database connection (no circular refs)
│
├── database/
│   ├── schema.sql               # Base schema
│   ├── variation_framework_schema.sql  # Variation tables & views
│   └── migrations/              # Schema migrations
│
├── scripts/
│   ├── import_mtg_with_variations.js    # MTG import with variations
│   ├── import-pokemon-set.js            # Pokemon import
│   ├── import-onepiece-set.js           # One Piece import
│   ├── analyze-variations.js            # Variation analysis
│   └── export-database-schema.js        # Schema documentation generator
│
├── services/
│   └── variationAnalysis.js     # Variation metadata service
│
├── routes/
│   ├── api.js                   # Main API routes + /admin/all-cards
│   └── variations.js            # Variation-specific endpoints
│
├── docs/
│   ├── claude.md                # This file - project specification
│   ├── DATABASE_SCHEMA.md       # Auto-generated schema docs
│   ├── database-stats.json      # Auto-generated statistics
│   ├── CARD_VARIATIONS_GUIDE.md # Variation system guide
│   ├── QUICK_START_VARIATIONS.md # Quick start guide
│   └── FIN_IMPORT_SUCCESS.md    # Import success summary
│
└── mana-meeples-shop/src/
    ├── components/
    │   ├── AdminDashboard.jsx      # Inventory management (existing)
    │   ├── AllCardsView.jsx        # All cards browser (NEW)
    │   ├── VariationBadge.jsx      # Variation badge component (NEW)
    │   └── VariationSelector.jsx   # Variation picker (NEW)
    │
    ├── hooks/
    │   ├── useVariationFilters.js  # Variation filter hook (NEW)
    │   └── useCardVariations.js    # Card variation hook (NEW)
    │
    └── utils/
        └── variationUtils.js       # Variation formatting utilities (NEW)
```

## Migration History

### Phase 1: Initial Setup (Completed)
- ✅ Basic card and inventory tables
- ✅ Multi-game support
- ✅ Search functionality
- ✅ Admin dashboard

### Phase 2: Variation Framework (Completed)
- ✅ Added variation columns to cards table
- ✅ Created variation metadata tables
- ✅ Implemented materialized views for fast filtering
- ✅ Built import scripts with variation support
- ✅ Added variation analysis service
- ✅ Created schema documentation automation
- ✅ Fixed database constraints for multiple finishes
- ✅ Fixed circular reference in database config
- ✅ Imported FIN set (1,114 variations of 594 unique cards)

### Phase 3: Admin UI Overhaul (In Progress)
- ✅ Created `/api/admin/all-cards` endpoint
- ✅ Created `AllCardsView` component
- ⏳ **NEXT**: Wire up routing and test
- 🔜 Add inventory modal from All Cards view
- 🔜 Improve variation badge visibility
- 🔜 Add bulk operations for variations

### Phase 4: Customer-Facing UI (Future)
- 🔜 Variation filters in main shop
- 🔜 Variation selector on card details
- 🔜 Variation indicators in search results
- 🔜 Cart support for specific variations
- 🔜 Checkout with variation details

## Key Learnings & Decisions

### Database Design Decisions

**Decision**: Use `(set_id, card_number, finish)` unique constraint instead of just `(set_id, card_number)`

**Rationale**: 
- Allows multiple finishes (foil/nonfoil) of same card number
- Each finish is a separate database entry with unique SKU
- Simplifies inventory and pricing management
- Matches real-world card distribution

**Decision**: Store variations in the cards table, not separate variation table

**Rationale**:
- Simpler queries (no joins needed for basic card display)
- Better performance for filtering
- Each variation is truly a distinct card
- Metadata tables track aggregated variation data

**Decision**: Use materialized views for variation filters

**Rationale**:
- Pre-computed filter options = fast response times
- Refresh on-demand or scheduled
- Eliminates expensive aggregation queries
- Supports dynamic filter generation

### Import Strategy Decisions

**Decision**: Import each finish as separate card entry

**Rationale**:
- Clean data model
- Unique SKU per variation
- Separate pricing and inventory per finish
- Better matches how cards are sold

**Decision**: Auto-analyze variations during import

**Rationale**:
- Metadata always synchronized
- No manual refresh needed
- Immediate filter availability
- Consistent data quality

### UI/UX Decisions

**Decision**: Separate "All Cards" and "Inventory" views

**Rationale**:
- All Cards: Browse what's in database, add inventory selectively
- Inventory: Manage stock and pricing for what you have
- Clear mental model
- Prevents confusion about what you're looking at

**Decision**: Show actual variations, not potential combinations

**Rationale**:
- No fake data (e.g., don't show LP/MP/HP if not in stock)
- Clear what exists vs what could exist
- Reduces cognitive load
- Better matches user expectations

**Decision**: Use treatment badges instead of text-only labels

**Rationale**:
- Visual hierarchy
- Easier to scan
- Color coding for quick identification
- Accessible with proper ARIA labels

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Duplicate key violation on import
**Symptom**: `duplicate key value violates unique constraint "cards_set_id_card_number_finish_key"`

**Solution**: Card already exists with that set_id, card_number, and finish combination. Either:
1. Delete the old set and re-import: `DELETE FROM card_sets WHERE code = 'XXX';`
2. Update the import script to handle updates: Use `ON CONFLICT DO UPDATE`

#### Issue: Circular reference in database config
**Symptom**: `Maximum call stack size exceeded` when using database

**Solution**: Ensure `config/database.js` uses proper wrapper object:
```javascript
const db = {
  pool: pool,
  getClient: function() { return pool.connect(); },
  query: function(text, params) { return pool.query(text, params); }
};
module.exports = db;
```

#### Issue: Variation metadata not updating
**Symptom**: Filters showing stale variation data

**Solution**:
```bash
# Run variation analysis
node scripts/analyze-variations.js SET_CODE

# Or manually refresh
psql $DATABASE_URL -c "SELECT refresh_variation_filters();"
```

#### Issue: Admin dashboard showing quality badges with no inventory
**Symptom**: All cards show NE/LI/MO/HE/DA badges even with 0 stock

**Solution**: Switch to the new `/api/admin/all-cards` endpoint which only shows:
- Actual card variations from database
- Real inventory status per variation
- No generated quality combinations

#### Issue: Import fails with "set not found"
**Symptom**: Import script can't find MTG set

**Solution**: 
1. Verify set code at https://scryfall.com/sets
2. Use exact 3-letter code (case-insensitive)
3. Check API connectivity: `curl https://api.scryfall.com/cards/search?q=set:FIN`

#### Issue: Foreign key constraint violation on metadata
**Symptom**: `violates foreign key constraint "set_variations_metadata_set_id_fkey"`

**Solution**: The trigger is trying to create metadata for deleted set. Fixed in latest schema:
- Trigger now skips DELETE operations
- Verifies set exists before inserting metadata
- Clean up orphans: See "Database Maintenance" section above

## Questions for AI Agents

When making decisions, consider:
1. Does this maintain the A++ quality standard?
2. Is this accessible to WCAG AAA standards?
3. Does this work well on mobile touch devices?
4. Is this solution production-ready with proper error handling?
5. Does this maintain performance standards?
6. Is this the simplest solution that works?
7. Does this follow semantic HTML practices?
8. Would a real user find this intuitive?
9. **Does this handle card variations correctly?** [NEW]
10. **Is the variation display clear and unambiguous?** [NEW]
11. **Will this scale to thousands of variations?** [NEW]
12. **Is the database design normalized appropriately?** [NEW]

## Revision History

### Version 1.0 (Initial)
- Initial claude.md creation
- Basic project structure and requirements

### Version 2.0 (Current - Variation Framework)
**Date**: October 14, 2025

**Major Changes**:
- Added comprehensive card variation system
- Enhanced data structure with variation metadata
- New database tables and views for variation tracking
- Import system with automatic variation detection
- Admin dashboard separation (All Cards vs Inventory)
- Schema documentation automation
- Updated API endpoints for variation support
- Enhanced filtering with dynamic variation options
- Fixed database constraints and triggers
- Resolved circular reference issues

**New Documentation**:
- Variation system architecture
- Import and analysis scripts
- Schema management tools
- Troubleshooting guide
- Migration history

**Technical Improvements**:
- Materialized views for performance
- Proper unique constraints
- Auto-generated schema docs
- Variation metadata service
- SKU generation system

**Next Steps**:
- Complete admin UI integration
- Customer-facing variation filters
- Bulk variation operations
- Enhanced variation analytics

---

**Note to AI Agents**: This project now includes a sophisticated card variation management system. When working with cards, always consider:
- Which variation (treatment + finish) is being referenced
- Whether inventory exists for specific variations
- How to display variations clearly to users
- Performance implications of variation queries
- Proper use of metadata tables for filtering

The goal remains: a card shop that feels premium and effortless to use, now with comprehensive support for the rich variety of card printings that exist in modern TCGs.