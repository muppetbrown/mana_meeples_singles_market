```
mana_meeples_singles_market
├── .git/
├── .github/
├── apps/
│ ├── api/
│ │ ├── src/
│ │ │ ├── lib/
│ │ │ │ ├── db.ts
│ │ │ │ ├── env.ts
│ │ │ │ └── logger.ts
│ │ │ ├── middleware/
│ │ │ │ ├── auth.js
│ │ │ │ ├── auth.ts
│ │ │ │ ├── error.ts
│ │ │ │ ├── rateLimit.ts
│ │ │ │ └── requestLog.ts
│ │ │ ├── routes/
│ │ │ │ ├── api.ts
│ │ │ │ ├── auth.js
│ │ │ │ ├── auth.ts
│ │ │ │ ├── cards.ts
│ │ │ │ ├── filters.js
│ │ │ │ ├── filters.ts
│ │ │ │ ├── index.ts
│ │ │ │ └── variations.ts
│ │ │ ├── services/
│ │ │ │ ├── emailService.ts
│ │ │ │ ├── priceService.ts
│ │ │ │ ├── pricing.ts
│ │ │ │ ├── search.ts
│ │ │ │ ├── searchUtils.ts
│ │ │ │ └── variationAnalysis.ts
│ │ │ ├── App.js
│ │ │ ├── app.ts
│ │ │ ├── db.ts
│ │ │ ├── index.ts
│ │ │ ├── server.js
│ │ │ └── server.ts
│ │ ├── tests/
│ │ │ ├── a11y/
│ │ │ └── integration/
│ │ ├── package.json
│ │ └── tsconfig.json
│ └── web/
│  ├── build/
│  │ ├── favicon.ico
│  │ ├── logo192.png
│  │ ├── logo512.png
│  │ ├── mana_meeples_logo.ico
│  │ ├── manifest.json
│  │ └── robots.txt
│  ├── public/
│  │ ├── favicon.ico
│  │ ├── logo192.png
│  │ ├── logo512.png
│  │ ├── mana_meeples_logo.ico
│  │ ├── manifest.json
│  │ └── robots.txt
│  ├── src/
│  │ ├── a11y/
│  │ │ └── Announcer.tsx
│  │ ├── components/
│  │ │ ├── admin/
│  │ │ │ ├── AnalyticsTab.tsx
│  │ │ │ ├── BulkInventoryManager.tsx
│  │ │ │ ├── OrdersTab.tsx
│  │ │ │ └── UnifiedCardsTab.tsx
│  │ │ ├── cards/
│  │ │ │ ├── CardItem.tsx
│  │ │ │ ├── ListCardItem.tsx
│  │ │ │ └── types.ts
│  │ │ ├── common/
│  │ │ │ ├── RecentlyViewedCards.tsx
│  │ │ │ └── SectionHeader.tsx
│  │ │ ├── hooks/
│  │ │ │ └── useSearchFilters.ts
│  │ │ ├── skeletons/
│  │ │ │ └── CardSkeleton.tsx
│  │ │ ├── utils/
│  │ │ │ └── searchUtils.tsx
│  │ │ ├── AdminDashboard.tsx
│  │ │ ├── AdminLogin.tsx
│  │ │ ├── CardGrid.tsx
│  │ │ ├── CardSearchBar.tsx
│  │ │ ├── Checkout.tsx
│  │ │ ├── CurrencySelector.tsx
│  │ │ ├── DynamicVariationFilter.tsx
│  │ │ ├── EmptyState.tsx
│  │ │ ├── ErrorBoundary.tsx
│  │ │ ├── FiltersPanel.tsx
│  │ │ ├── KeyboardShortcutsModal.tsx
│  │ │ ├── OptimizedImage.tsx
│  │ │ ├── TCGShop.tsx
│  │ │ ├── Toast.tsx
│  │ │ ├── VariationBadge.tsx
│  │ │ └── VirtualCardGrid.tsx
│  │ ├── config/
│  │ │ ├── api.ts
│  │ │ └── constants.ts
│  │ ├── features/
│  │ │ └── cards/
│  │ │  └── api.ts
│  │ ├── hooks/
│  │ │ ├── __tests__/
│  │ │ │ ├── useEnhancedCart.test.ts
│  │ │ │ └── useRecentlyViewed.test.ts
│  │ │ ├── useEnhancedCart.ts
│  │ │ ├── useFilterCounts.ts
│  │ │ ├── useRecentlyViewed.ts
│  │ │ └── useVirtualScrolling.ts
│  │ ├── services/
│  │ │ ├── errorHandler.ts
│  │ │ └── requestThrottler.ts
│  │ ├── styles/
│  │ │ └── index.css
│  │ ├── testUtils/
│  │ │ └── storageMocks.ts
│  │ ├── utils/
│  │ │ └── csvUtils.ts
│  │ ├── App.css
│  │ ├── App.test.tsx
│  │ ├── App.tsx
│  │ ├── index.tsx
│  │ ├── logo.svg
│  │ ├── reportWebVitals.ts
│  │ └── setupTests.ts
│  ├── .env
│  ├── index.html
│  ├── package-lock.json
│  ├── package.json
│  ├── postcss.config.ts
│  ├── README.md
│  ├── tailwind.config.ts
│  ├── tsconfig.json
│  └── vite.config.ts
├── config/
│ └── database.ts
├── database/
│ ├── migrations/
│ │ ├── add_card_pricing_table.sql
│ │ ├── schema.sql
│ │ └── variation_framework_schema.sql
│ ├── DATABASE_SCHEMA.md
│ └── database-stats.json
├── docs/
│ ├── samples/
│ │ ├── api_driven_variations.ts
│ │ ├── mtg_card_variations_sample.json
│ │ ├── onepiece_card_variations_sample.json
│ │ └── sv_card_variations_sample.json
│ ├── CARD_VARIATIONS_GUIDE.md
│ ├── claude.md
│ ├── DATABASE_SCHEMA.md
│ ├── database-stats.json
│ ├── EMBED_GUIDE.md
│ ├── IMPLEMENTATION_GUIDE.md
│ ├── openapi.yaml
│ ├── QUICK_START_VARIATIONS.md
│ └── SCHEMA_EXPORT_GUIDE.md
├── scripts/
│ ├── analyze-variations.ts
│ ├── create-bulk-foils.ts
│ ├── export-database-schema.ts
│ ├── generate-admin-hash.ts
│ ├── import_mtg_with_variations.ts
│ ├── import-onepiece-set.ts
│ ├── import-pokemon-set.ts
│ ├── list-pokemon-sets.ts
│ ├── migrate-card-pricing.ts
│ ├── migrate.sql
│ ├── refresh-mviews.sh
│ ├── run-migration.ts
│ └── test-password.ts
├── utils/
│ └── sanitization.ts
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .nvmrc
├── analyze-repo.mjs
├── api.effective.tsconfig.json
├── generate_tree.py
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.cjs
├── test-cors-fix.sh
├── tsconfig.base.json
├── tsconfig.json
└── typecheck_errors.txt
```