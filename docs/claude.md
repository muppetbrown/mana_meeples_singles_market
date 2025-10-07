# TCG Single Card Shop Interface

## Project Overview

A best-of-breed single storefront for trading card game (TCG) singles, supporting multiple card games with real-time inventory. The interface prioritizes simplicity, elegance, and exceptional user experience while maintaining professional polish and accessibility standards.

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

## User Experience Requirements

### Primary User Flow
```
Browse/Search → Filter/Refine → View Card Details → Add to Cart → Checkout
```

### Core Features
- **Advanced Filtering**: Best-in-class filtering system with faceted search
- **Real-time Inventory**: Live stock quantities and availability
- **Multi-game Support**: Seamless switching between card games
- **Card Details**: Comprehensive information with high-quality imagery
- **Simple Cart**: Straightforward add-to-cart and checkout process

### Future Considerations (Not Current Scope)
- Collection management
- Wishlist/saved searches
- Price tracking and alerts

## Technical Architecture

### Stack
- **Frontend**: React with modern hooks patterns
- **Database**: PostgreSQL for relational data integrity
- **Search**: PostgreSQL full-text search with pg_trgm for fuzzy matching, or dedicated search solution if needed for scale
- **API**: RESTful or GraphQL (decision based on query complexity needs)

### External Integrations
- **Scryfall API**: MTG card data and imagery
- **PokémonTCG.io API**: Pokémon card data and imagery
- **Collectr API**: Price data (future integration)
- Integration architecture should support adding new card games easily

### Data Structure

#### Card Entity (Core Fields)
```typescript
{
  // Identity
  id: string
  game: 'mtg' | 'pokemon' | 'onepiece'
  name: string
  set: string
  setCode: string
  collectorNumber: string
  
  // Physical attributes
  rarity: string
  foil: boolean
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  language: string
  
  // Inventory
  price: decimal
  quantity: integer
  inStock: boolean
  
  // Game-specific data (flexible JSON)
  gameData: {
    // MTG: manaCost, cardType, colors, power, toughness, etc.
    // Pokémon: hp, types, attacks, weaknesses, etc.
    // One Piece: cost, power, counter, etc.
  }
  
  // Media
  imageUrl: string
  imageUrlBack?: string // For double-faced cards
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Search & Filtering Requirements

### Search Capabilities
- **Full-text search**: Card names with fuzzy matching for typos
- **Advanced search**: Multiple field combinations (set, type, rarity, etc.)
- **Autocomplete**: Intelligent suggestions as user types
- **Debounced input**: Smooth typing experience without excessive API calls
- **Fast results**: Sub-200ms search response time target

### Filter Categories (Game-Specific)

#### MTG Filters
- Colors/Color Identity
- Card Type (Creature, Instant, Sorcery, etc.)
- Mana Value (CMC)
- Rarity
- Set/Expansion
- Format Legality
- Power/Toughness ranges
- Foil/Non-foil
- Condition
- Price range

#### Pokémon Filters
- Type (Grass, Fire, Water, etc.)
- Rarity
- Set/Expansion
- HP range
- Stage (Basic, Stage 1, Stage 2, etc.)
- Card Type (Pokémon, Trainer, Energy)
- Foil/Non-foil
- Condition
- Price range

#### Universal Filters (All Games)
- In Stock only toggle
- Price range slider
- Condition checkboxes
- Foil/Non-foil toggle
- Sort options (Price, Name, Set, Rarity, Newest)

### Filter UX Requirements
- Collapsible filter panels on mobile
- Clear active filter indicators
- One-click clear all filters
- Filter counts showing result quantities
- Persistent filters during session
- URL-based filter state (shareable links)

## User Interface Guidelines

### Layout Structure
```
[Header: Logo, Game Selector, Search Bar, Cart Icon]
[Main Content Area]
  [Sidebar Filters (Desktop) / Drawer (Mobile)]
  [Card Grid: Responsive columns (1-2-3-4 based on viewport)]
  [Pagination/Infinite Scroll]
[Footer: Links, Info]
```

### Card Display
- **Grid View**: Card image prominent, name, set, price, stock status
- **List View** (optional): Compact row format with key details
- **Card Hover/Focus**: Subtle scale animation, quick view trigger
- **Loading States**: Skeleton screens, not spinners
- **Empty States**: Helpful messaging with suggested actions

### Card Detail View
- High-resolution image(s)
- Complete card information
- Price and condition selector
- Quantity selector with stock validation
- Add to cart button (prominent, accessible)
- Related cards/recommendations (optional)

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

## Accessibility Requirements

### WCAG AAA Compliance
- **Color Contrast**: 7:1 minimum for normal text, 4.5:1 for large text
- **Keyboard Navigation**: Full site navigable without mouse
- **Focus Indicators**: Clear, visible focus states (not just outline)
- **Screen Reader Support**: Semantic HTML, ARIA labels where needed
- **Alt Text**: All card images with descriptive alt attributes
- **Error Handling**: Clear, descriptive error messages
- **Form Labels**: Every input properly labeled

### Specific Implementations
- Skip to main content link
- Landmark regions (header, main, nav, footer)
- Heading hierarchy (h1 → h2 → h3, no skips)
- Button vs link distinction (actions vs navigation)
- Loading announcements for screen readers
- Reduced motion preferences respected

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

## Admin Features

### Bulk Operations (Admin Only)
- Bulk price updates
- Bulk condition updates
- Bulk inventory adjustments
- CSV import/export
- Batch image uploads
- Set-wide operations

### Admin Interface Standards
- Same accessibility and UX standards as customer interface
- Clear confirmation dialogs for destructive actions
- Undo capability where feasible
- Audit logging for inventory changes
- Role-based access control

## Code Quality Standards

### React Patterns
```tsx
// Component Structure
- Functional components with hooks
- Custom hooks for shared logic
- Proper prop typing (TypeScript)
- Error boundaries for graceful failures
- Suspense for async operations

// State Management
- Local state with useState for simple UI state
- Context for theme, user session
- Consider Zustand/Jotai for complex global state
- React Query for server state management

// Code Organization
/components
  /common      // Buttons, Inputs, Cards
  /layout      // Header, Footer, Sidebar
  /features    // CardGrid, Filters, SearchBar
  /admin       // Admin-specific components
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

<!-- Not -->
<div onclick="...">  <!-- Use button -->
<div class="button"> <!-- Use button -->
```

### CSS/Styling
- CSS Modules or styled-components (avoid global styles)
- Consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px)
- Typography scale with rem units
- Dark mode support (future consideration)
- Animations respect prefers-reduced-motion

### Error Handling
```tsx
// User-friendly error messages
"Unable to load cards. Please try again." 
// Not: "Error 500: Internal Server Error"

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
- [ ] Slow 3G network simulation
- [ ] Empty state handling
- [ ] Large dataset handling (10,000+ cards)

### Automated Testing
- Unit tests for utility functions
- Integration tests for filter logic
- E2E tests for critical user paths
- Visual regression testing for UI components
- Accessibility testing (jest-axe)

## API Design Principles

### RESTful Endpoints (Example)
```
GET    /api/cards              // List with filters
GET    /api/cards/:id          // Single card detail
GET    /api/sets               // Available sets by game
GET    /api/search/autocomplete // Search suggestions
POST   /api/cart/items         // Add to cart
GET    /api/cart               // Get cart contents
```

### Query Parameters for Filtering
```
/api/cards?
  game=mtg
  &name=lightning
  &colors=R,W
  &rarity=rare,mythic
  &set=ltr
  &inStock=true
  &priceMin=1.00
  &priceMax=50.00
  &sort=price_asc
  &page=1
  &limit=50
```

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1247,
    "pages": 25
  },
  "filters": {
    "applied": {...},
    "available": {...}
  }
}
```

## Integration Guidelines

### Scryfall (MTG)
- Cache card data locally after initial fetch
- Use card images via Scryfall CDN
- Respect rate limits (10 requests per second)
- Handle multi-faced cards properly
- Store Scryfall ID for reference

### PokémonTCG.io
- Similar caching strategy
- Handle alternate arts/variations
- Map API rarity to internal system
- Store PokémonTCG.io ID for reference

### Collectr (Future)
- Price data refresh schedule
- Historical pricing (if scope expands)
- Price trend indicators

## Security Considerations

### Customer-Facing
- Input sanitization (prevent XSS)
- Rate limiting on search
- CSRF protection on forms
- Secure session management
- HTTPS only

### Admin
- Strong authentication required
- Role-based access control
- Audit logging for all changes
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

// Not needed: Code is self-explanatory
// Set the loading state to true
setLoading(true);
```

### Component Documentation
- Props interface with JSDoc comments
- Usage examples for complex components
- Accessibility notes where relevant
- Known limitations or caveats

## Deployment & Monitoring

### Performance Monitoring
- Real User Monitoring (RUM)
- Error tracking (Sentry or similar)
- Analytics for user behavior
- Search performance metrics
- Cart abandonment tracking

### Continuous Improvement
- A/B testing framework ready
- Feature flags for gradual rollouts
- User feedback mechanism
- Regular accessibility audits
- Performance budgets enforced

## Anti-Patterns to Avoid

### UI/UX
- ❌ Infinite scroll without pagination option
- ❌ Auto-playing animations that can't be stopped
- ❌ Hover-only interactions (need keyboard/touch alternatives)
- ❌ Modal dialogs that trap focus improperly
- ❌ Loading states that cause layout shift
- ❌ Generic error messages without actionable guidance

### Code
- ❌ Premature optimization
- ❌ Over-engineering simple features
- ❌ Ignoring TypeScript errors
- ❌ Prop drilling beyond 2-3 levels (use context)
- ❌ Massive components (split at ~200 lines)
- ❌ Inline styles for anything beyond dynamic values

### Data
- ❌ N+1 query problems
- ❌ Loading all cards at once
- ❌ No pagination on large datasets
- ❌ Unindexed database queries
- ❌ Storing images in database

## Success Metrics

### User Experience
- Time to first card view < 1 second
- Search to result < 300ms
- Add to cart completion rate > 85%
- Mobile bounce rate < 40%
- Accessibility score 100 (Lighthouse)

### Business
- Cart abandonment rate
- Average items per transaction
- Search → purchase conversion rate
- Return visitor rate

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

## Revision History

This document should evolve with the project. Document major changes:
- Version 1.0: Initial claude.md creation
- [Future updates here]

---

**Note to AI Agents**: This project values user experience and code quality equally. When in doubt, prioritize simplicity and accessibility over clever technical solutions. The goal is a card shop that feels premium and effortless to use.