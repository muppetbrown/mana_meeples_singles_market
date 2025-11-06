# Variation Badge Text Improvements

## Summary

Implemented smart deduplication and admin override system for variation badge text to address redundancy issues like "Borderless Inverted Regular borderless border".

## Changes Made

### 1. Smart Formatting Logic (Options 1 + 2)

**Files Updated:**
- `apps/web/src/shared/modal/VariationField.tsx`
- `apps/web/src/lib/utils/variationComparison.ts`
- `apps/web/src/shared/card/CardItem.tsx`

**Improvements:**
1. **Deduplication**: Prevents showing border information twice when it's already in the treatment name
   - Before: "Borderless Inverted Regular borderless border"
   - After: "Borderless Inverted"

2. **Hide "Regular" for Special Treatments**: Omits "Regular" when there's a special treatment
   - Before: "Extended Art Regular"
   - After: "Extended Art"
   - Keeps: "Standard Regular" (both shown when standard)

### 2. Admin Override System

**New Database Table:**
```sql
CREATE TABLE variation_display_overrides (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  treatment VARCHAR(100),
  finish VARCHAR(50),
  border_color VARCHAR(50),
  frame_effect VARCHAR(100),
  promo_type VARCHAR(100),
  display_text VARCHAR(200) NOT NULL,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE NULLS NOT DISTINCT (game_id, treatment, finish, border_color, frame_effect, promo_type)
);
```

**New Backend Service:**
- `apps/api/src/services/variationDisplayOverrides.ts`
  - Table initialization
  - CRUD operations for overrides
  - Variation combination discovery
  - Auto-text generation for comparison

**New API Endpoints:**
- `POST /api/variation-overrides/init` - Initialize table
- `GET /api/variation-overrides/combinations` - Get all variations with overrides
- `GET /api/variation-overrides` - Get all overrides
- `GET /api/variation-overrides/lookup` - Lookup specific override
- `POST /api/variation-overrides` - Create override
- `PUT /api/variation-overrides/:id` - Update override
- `PATCH /api/variation-overrides/:id/toggle` - Toggle active status
- `DELETE /api/variation-overrides/:id` - Delete override

**New Admin UI:**
- `apps/web/src/features/admin/components/VariationBadges/VariationBadgesTab.tsx`
  - View all variation combinations in the system
  - See auto-generated vs custom text side-by-side
  - Edit/create custom overrides
  - Delete overrides to revert to auto-generated
  - Search and filter variations
  - View stats (total, overridden, auto-generated)

**Dashboard Integration:**
- Added new "Variation Badges" tab to admin dashboard
- Auto-initializes database table on server startup

## Example Results

### Before Changes:
- "Borderless Inverted Regular borderless border" → Redundant and verbose
- "Extended Art Regular" → Unnecessary "Regular"
- "Showcase Standard Regular" → Too much information

### After Changes:
- "Borderless Inverted" → Clean and concise
- "Extended Art" → Clear and simple
- "Showcase" → Just what's needed
- "Standard Foil" → Both shown when needed

## Game-Agnostic Design

The system works for any card game:
- Field-based matching (treatment, finish, border, etc.)
- No hardcoded MTG-specific logic
- Overrides can be game-specific or global (NULL game_id)
- Future games can define their own variation fields

## Usage

### For Admins:
1. Navigate to Admin Dashboard → "Variation Badges" tab
2. Browse all variation combinations in the system
3. Click edit icon to create/modify override text
4. Add optional notes for why the override was created
5. Delete override to revert to auto-generated text

### For Developers:
The formatting functions automatically:
1. Apply smart deduplication (hide redundant info)
2. Hide "Regular" for special treatments
3. Check for admin overrides (future enhancement)

## Future Enhancements

1. **Override Lookup in Frontend**: Update formatting functions to check API for overrides before displaying
2. **Bulk Override Operations**: Apply same pattern to multiple variations
3. **Game-Specific Rules**: Define per-game formatting rules
4. **Preview Mode**: Show what text will look like before saving
5. **Import/Export**: Backup and restore override configurations

## Files Changed

### Backend
- `apps/api/src/services/variationDisplayOverrides.ts` (new)
- `apps/api/src/routes/variationDisplayOverrides.ts` (new)
- `apps/api/src/routes/index.ts` (updated)
- `apps/api/src/server.ts` (updated)

### Frontend
- `apps/web/src/features/admin/components/VariationBadges/VariationBadgesTab.tsx` (new)
- `apps/web/src/features/admin/Dashboard.tsx` (updated)
- `apps/web/src/lib/api/endpoints.ts` (updated)
- `apps/web/src/shared/modal/VariationField.tsx` (updated)
- `apps/web/src/lib/utils/variationComparison.ts` (updated)
- `apps/web/src/shared/card/CardItem.tsx` (updated)

### Database
- `scripts/migrations/001_create_variation_display_overrides.sql` (new)
- `scripts/run-migration.ts` (new)

## Testing Recommendations

1. **Check existing variations**: Verify current cards display correctly with new logic
2. **Create overrides**: Test creating custom text for a variation
3. **Edit overrides**: Modify existing overrides
4. **Delete overrides**: Ensure text reverts to auto-generated
5. **Search/filter**: Test searching for specific variations
6. **Game filtering**: If multiple games, test per-game filtering

## Notes

- Database table auto-initializes on server startup
- Overrides are optional - system works with smart defaults
- All variations continue to use auto-generated text until explicitly overridden
- Changes are backward compatible
