```
mana_meeples_singles_market
├── .git/
├── .github/
├── apps/
│ ├── api/
│ │ ├── scripts/
│ │ │ └── print-coverage-summary.mjs
│ │ ├── src/
│ │ │ ├── lib/
│ │ │ │ ├── authUtils.ts
│ │ │ │ ├── db.ts
│ │ │ │ ├── env.ts
│ │ │ │ └── logger.ts
│ │ │ ├── middleware/
│ │ │ │ ├── auth.ts
│ │ │ │ ├── error.ts
│ │ │ │ ├── rateLimit.ts
│ │ │ │ └── requestLog.ts
│ │ │ ├── routes/
│ │ │ │ ├── additional.ts
│ │ │ │ ├── auth.ts
│ │ │ │ ├── cards.ts
│ │ │ │ ├── index.ts
│ │ │ │ ├── inventory.ts
│ │ │ │ ├── off-filters.ts
│ │ │ │ ├── orders.ts
│ │ │ │ ├── storefront.ts
│ │ │ │ └── variations.ts
│ │ │ ├── services/
│ │ │ │ ├── emailService.ts
│ │ │ │ ├── priceService.ts
│ │ │ │ ├── pricing.ts
│ │ │ │ └── variationAnalysis.ts
│ │ │ ├── utils/
│ │ │ │ └── strings.ts
│ │ │ ├── app.ts
│ │ │ ├── index.ts
│ │ │ └── server.ts
│ │ ├── test-logs/
│ │ │ ├── test-env-1761092727187.json
│ │ │ ├── test-env-1761092727187.txt
│ │ │ ├── test-env-1761092727198.json
│ │ │ ├── test-env-1761092727198.txt
│ │ │ ├── test-env-1761092727199.json
│ │ │ ├── test-env-1761092727199.txt
│ │ │ ├── test-env-1761092727200.json
│ │ │ ├── test-env-1761092727200.txt
│ │ │ ├── test-env-1761092727207.json
│ │ │ ├── test-env-1761092727207.txt
│ │ │ ├── test-env-1761092727209.json
│ │ │ ├── test-env-1761092727209.txt
│ │ │ ├── test-env-1761092727336.json
│ │ │ ├── test-env-1761092727336.txt
│ │ │ ├── test-env-1761095979787.json
│ │ │ ├── test-env-1761095979787.txt
│ │ │ ├── test-env-1761095979788.json
│ │ │ ├── test-env-1761095979788.txt
│ │ │ ├── test-env-1761095979792.json
│ │ │ ├── test-env-1761095979792.txt
│ │ │ ├── test-env-1761095979796.json
│ │ │ ├── test-env-1761095979796.txt
│ │ │ ├── test-env-1761095979798.json
│ │ │ ├── test-env-1761095979798.txt
│ │ │ ├── test-env-1761095979802.json
│ │ │ ├── test-env-1761095979802.txt
│ │ │ ├── test-env-1761154530372.json
│ │ │ ├── test-env-1761154530372.txt
│ │ │ ├── test-env-1761154530373.json
│ │ │ ├── test-env-1761154530373.txt
│ │ │ ├── test-env-1761154530374.json
│ │ │ ├── test-env-1761154530374.txt
│ │ │ ├── test-env-1761154530375.json
│ │ │ └── test-env-1761154530375.txt
│ │ ├── tests/
│ │ │ ├── e2e/
│ │ │ │ └── checkout.flow.test.ts
│ │ │ ├── integration/
│ │ │ │ ├── auth.routes.test.ts
│ │ │ │ ├── cards.search.test.ts
│ │ │ │ ├── error-handling.test.ts
│ │ │ │ ├── inventory.routes.test.ts
│ │ │ │ ├── orders.routes.test.ts
│ │ │ │ └── storefront.routes.test.ts
│ │ │ ├── setup/
│ │ │ │ ├── db.ts
│ │ │ │ └── testEnv.ts
│ │ │ ├── unit/
│ │ │ │ ├── auth.validateCredentials.test.ts
│ │ │ │ ├── slugify.test.ts
│ │ │ │ ├── utils.test.ts
│ │ │ │ └── validation.test.ts
│ │ │ ├── testEmail.js
│ │ │ └── testresults.txt
│ │ ├── .env
│ │ ├── package-lock.json
│ │ ├── package.json
│ │ ├── tsconfig.build.json
│ │ ├── tsconfig.json
│ │ ├── tsconfig.typecheck.json
│ │ └── vitest.config.ts
│ └── web/
│  ├── public/
│  │ ├── favicon.ico
│  │ ├── logo192.png
│  │ ├── logo512.png
│  │ ├── mana_meeples_logo.ico
│  │ ├── manifest.webmanifest
│  │ ├── robots.txt
│  │ └── static.json
│  ├── src/
│  │ ├── a11y/
│  │ │ └── Announcer.tsx
│  │ ├── features/
│  │ │ ├── admin/
│  │ │ │ ├── components/
│  │ │ │ │ ├── Analytics/
│  │ │ │ │ │ └── AnalyticsTab.tsx
│  │ │ │ │ ├── Cards/
│  │ │ │ │ │ ├── AddToInventoryModal.tsx
│  │ │ │ │ │ └── CardsTab.tsx
│  │ │ │ │ ├── Inventory/
│  │ │ │ │ │ └── BulkManager.tsx
│  │ │ │ │ ├── Orders/
│  │ │ │ │ │ └── OrdersTab.tsx
│  │ │ │ │ ├── Dashboard.tsx
│  │ │ │ │ └── Login.tsx
│  │ │ │ ├── hooks/
│  │ │ │ │ └── useFilterCounts.ts
│  │ │ │ └── index.ts
│  │ │ └── shop/
│  │ │  ├── components/
│  │ │  │ ├── CardDisplay/
│  │ │  │ │ ├── CardDisplay.tsx
│  │ │  │ │ ├── CardGrid.tsx
│  │ │  │ │ ├── CardItem.tsx
│  │ │  │ │ ├── CardList.tsx
│  │ │  │ │ ├── CardSkeleton.tsx
│  │ │  │ │ └── ListCardItem.tsx
│  │ │  │ ├── Cart/
│  │ │  │ │ ├── CartItem.tsx
│  │ │  │ │ ├── CartModal.tsx
│  │ │  │ │ ├── CartPanel.tsx
│  │ │  │ │ ├── Checkout.tsx
│  │ │  │ │ ├── index.ts
│  │ │  │ │ └── MiniCart.tsx
│  │ │  │ ├── Search/
│  │ │  │ │ ├── ActiveFilters.tsx
│  │ │  │ │ ├── FiltersPanel.tsx
│  │ │  │ │ └── SearchBar.tsx
│  │ │  │ ├── RecentlyViewed.tsx
│  │ │  │ └── ShopHeader.tsx
│  │ │  ├── hooks/
│  │ │  │ ├── useCardFetching.ts
│  │ │  │ ├── useCart.ts
│  │ │  │ ├── useRecentlyViewed.ts
│  │ │  │ ├── useShopFilters.ts
│  │ │  │ ├── useShopState.ts
│  │ │  │ └── useVariationSelection.ts
│  │ │  ├── index.ts
│  │ │  └── ShopPage.tsx
│  │ ├── lib/
│  │ │ ├── api/
│  │ │ │ ├── client.ts
│  │ │ │ ├── endpoints.ts
│  │ │ │ └── index.ts
│  │ │ ├── constants/
│  │ │ │ ├── index.ts
│  │ │ │ └── validation.ts
│  │ │ └── utils/
│  │ │  ├── csv.ts
│  │ │  ├── format.ts
│  │ │  ├── index.ts
│  │ │  ├── sanitization.ts
│  │ │  └── search.ts
│  │ ├── retired/
│  │ │ ├── AdminCardGrid.tsx
│  │ │ ├── App.css
│  │ │ ├── setupTests.ts
│  │ │ ├── ShopPage.tsx
│  │ │ ├── useEnhancedCart.test.ts
│  │ │ ├── useRecentlyViewed.test.ts
│  │ │ ├── VirtualCardGrid.tsx
│  │ │ └── vite-env.d.ts
│  │ ├── services/
│  │ │ ├── error/
│  │ │ │ ├── handler.ts
│  │ │ │ └── types.ts
│  │ │ └── http/
│  │ │  └── throttler.ts
│  │ ├── shared/
│  │ │ ├── components/
│  │ │ │ ├── forms/
│  │ │ │ │ ├── CurrencySelector.tsx
│  │ │ │ │ └── VariationFilter.tsx
│  │ │ │ ├── layout/
│  │ │ │ │ ├── ErrorBoundary.tsx
│  │ │ │ │ └── KeyboardShortcuts.tsx
│  │ │ │ ├── media/
│  │ │ │ │ └── OptimizedImage.tsx
│  │ │ │ ├── ui/
│  │ │ │ │ ├── Button.tsx
│  │ │ │ │ ├── EmptyState.tsx
│  │ │ │ │ ├── Modal.tsx
│  │ │ │ │ ├── SectionHeader.tsx
│  │ │ │ │ ├── Toast.tsx
│  │ │ │ │ └── VariationBadge.tsx
│  │ │ │ └── index.ts
│  │ │ └── hooks/
│  │ │  ├── index.ts
│  │ │  └── useVirtualScroll.ts
│  │ ├── styles/
│  │ │ └── index.css
│  │ ├── testUtils/
│  │ │ └── storageMocks.ts
│  │ ├── types/
│  │ │ ├── api/
│  │ │ │ ├── requests.ts
│  │ │ │ └── responses.ts
│  │ │ ├── models/
│  │ │ │ ├── card.ts
│  │ │ │ ├── inventory.ts
│  │ │ │ └── order.ts
│  │ │ ├── ui/
│  │ │ │ ├── cart.ts
│  │ │ │ └── common.ts
│  │ │ └── index.ts
│  │ ├── App.tsx
│  │ ├── main.tsx
│  │ ├── pnpm typecheck.txt
│  │ ├── reportWebVitals.ts
│  │ └── vit-env.d.ts
│  ├── .env
│  ├── .env.local
│  ├── index.html
│  ├── package.json
│  ├── postcss.config.cjs
│  ├── tailwind.config.ts
│  ├── tsconfig.json
│  └── vite.config.ts
├── database/
│ ├── DATABASE_SCHEMA.md
│ └── database-stats.json
├── docs/
│ ├── samples/
│ │ ├── api_driven_variations.ts
│ │ ├── mtg_card_variations_sample.json
│ │ ├── onepiece_card_variations_sample.json
│ │ └── sv_card_variations_sample.json
│ ├── CARD_VARIATIONS_GUIDE.md
│ ├── openapi.yaml
│ ├── pokemon_set_codes.txt
│ └── QUICK_START_VARIATIONS.md
├── scripts/
│ ├── imports/
│ │ ├── analyze-variations.ts
│ │ ├── import_mtg_with_variations.ts
│ │ ├── import-onepiece-set.ts
│ │ ├── import-pokemon-set.ts
│ │ └── list-pokemon-sets.ts
│ ├── migrations/
│ │ ├── migrate-card-pricing.ts
│ │ └── run-migration.ts
│ ├── copy-dist-to-api.js
│ ├── debug-admin-login.ts
│ ├── export-database-schema.ts
│ ├── generate-admin-hash.ts
│ ├── refresh-mviews.sh
│ ├── smoke.mjs
│ ├── test-db-connected.ts
│ ├── test-login.sh
│ └── test-password.ts
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── ai_dev_principles.md
├── analyze-repo.mjs
├── analyze-unused-code.js
├── api.effective.tsconfig.json
├── package.json
├── pnpm
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.cjs
├── render-deployment-guide.md
├── render.yaml
├── repo-tree.txt
├── route-analysis-report.json
├── scan-routes.js
├── tsconfig.base.json
├── tsconfig.json
├── typecheck_errors.txt
└── unused-code-report.json
```