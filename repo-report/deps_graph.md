
> mana-meeples-singles-market@ deps:graph C:\Git_Repos\mana_meeples_singles_market
> tsx scripts/deps-graph.ts --dir ./ --format mermaid

graph LR
  apps_api_src_lib_authUtils_ts --> apps_api_src_lib_env_ts:::edge
  apps_api_src_routes_auth_ts --> apps_api_src_lib_authUtils_ts:::edge
  apps_api_src_routes_auth_ts --> apps_api_src_lib_env_ts:::edge
  apps_api_src_routes_cards_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_routes_variations_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_middleware_auth_ts --> apps_api_src_lib_authUtils_ts:::edge
  apps_api_src_middleware_auth_ts --> apps_api_src_lib_env_ts:::edge
  apps_api_src_routes_orders_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_routes_orders_ts --> apps_api_src_middleware_auth_ts:::edge
  apps_api_src_routes_inventory_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_routes_inventory_ts --> apps_api_src_middleware_auth_ts:::edge
  apps_api_src_routes_additional_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_routes_storefront_ts --> apps_api_src_lib_db_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_auth_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_cards_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_variations_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_orders_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_inventory_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_additional_ts:::edge
  apps_api_src_routes_index_ts --> apps_api_src_routes_storefront_ts:::edge
  apps_api_src_app_ts --> apps_api_src_routes_index_ts:::edge
  apps_api_src_index_ts --> apps_api_src_routes_index_ts:::edge
  apps_api_src_server_ts --> apps_api_src_app_ts:::edge
  apps_api_src_server_ts --> apps_api_src_lib_env_ts:::edge
  apps_web_src_App_tsx --> apps_web_src_features_shop_index_ts:::edge
  apps_web_src_App_tsx --> apps_web_src_features_admin_index_ts:::edge
  apps_web_src_main_tsx --> apps_web_src_styles_index_css:::edge
  apps_web_src_main_tsx --> apps_web_src_App_tsx:::edge
  apps_api_src_middleware_error_ts --> apps_api_src_lib_logger_ts:::edge
  apps_api_src_middleware_requestLog_ts --> apps_api_src_lib_logger_ts:::edge
  apps_api_src_services_variationAnalysis_ts --> apps_api_src_lib_db_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_models_card_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_models_order_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_models_inventory_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_api_requests_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_api_responses_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_ui_cart_ts:::edge
  apps_web_src_types_index_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_index_ts --> apps_web_src_features_admin_components_Dashboard_tsx:::edge
  apps_web_src_features_admin_index_ts --> apps_web_src_features_admin_components_Login_tsx:::edge
  apps_web_src_features_admin_index_ts --> apps_web_src_features_admin_hooks_useFilterCounts_ts:::edge
  apps_web_src_features_shop_index_ts --> apps_web_src_features_shop_ShopPage_tsx:::edge
  apps_web_src_features_shop_index_ts --> apps_web_src_features_shop_hooks_useCart_ts:::edge
  apps_web_src_features_shop_index_ts --> apps_web_src_features_shop_hooks_useShopFilters_ts:::edge
  apps_web_src_features_shop_index_ts --> apps_web_src_features_shop_hooks_useRecentlyViewed_ts:::edge
  apps_web_src_features_shop_index_ts --> apps_web_src_features_shop_components_Cart_index_ts:::edge
  apps_web_src_features_shop_hooks_useShopFilters_ts --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_shop_hooks_useShopFilters_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_hooks_useCart_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardItem_tsx --> apps_web_src_shared_components_media_OptimizedImage_tsx:::edge
  apps_web_src_shared_components_cardDisplay_CardItem_tsx --> apps_web_src_shared_components_ui_VariationBadge_tsx:::edge
  apps_web_src_shared_components_cardDisplay_CardItem_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardItem_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_ListCardItem_tsx --> apps_web_src_shared_components_media_OptimizedImage_tsx:::edge
  apps_web_src_shared_components_cardDisplay_ListCardItem_tsx --> apps_web_src_shared_components_ui_VariationBadge_tsx:::edge
  apps_web_src_shared_components_cardDisplay_ListCardItem_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_shared_hooks_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_shared_components_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_search_SearchBar_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_hooks_useShopFilters_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_forms_CurrencySelector_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_Cart_Checkout_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_hooks_useCart_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_layout_ErrorBoundary_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_layout_KeyboardShortcuts_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_cardDisplay_CardSkeleton_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_ui_SectionHeader_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_cardDisplay_CardItem_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_cardDisplay_ListCardItem_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_cardDisplay_CardList_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_components_cardDisplay_CardGrid_tsx:::edge
  apps_web_src_lib_api_client_ts --> apps_web_src_services_http_throttler_ts:::edge
  apps_web_src_lib_api_client_ts --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_lib_api_index_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_lib_api_index_ts --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_services_error_handler_ts --> apps_web_src_services_error_types_ts:::edge
  apps_web_src_lib_utils_format_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_lib_utils_groupCards_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_csv_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_groupCards_ts:::edge
  apps_web_src_shared_hooks_index_ts --> apps_web_src_shared_hooks_useVirtualScroll_ts:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_ui_Toast_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_ui_EmptyState_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_ui_SectionHeader_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_ui_VariationBadge_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_layout_ErrorBoundary_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_layout_KeyboardShortcuts_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_media_OptimizedImage_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_forms_CurrencySelector_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_forms_VariationFilter_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardDisplay_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardItem_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardSkeleton_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardRow_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardGrid_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_cardDisplay_CardList_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_search_FiltersPanel_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_search_SearchBar_tsx:::edge
  apps_web_src_shared_components_index_ts --> apps_web_src_shared_components_search_ActiveFilters_tsx:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_shared_components_forms_CurrencySelector_tsx:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_features_admin_components_Cards_CardsTab_tsx:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_features_admin_components_Orders_OrdersTab_tsx:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx:::edge
  apps_web_src_features_admin_components_Login_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Login_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_hooks_useFilterCounts_ts --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_admin_hooks_useFilterCounts_ts --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_shop_hooks_useCardFetching_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_hooks_useRecentlyViewed_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_hooks_useVariationSelection_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_RecentlyViewed_tsx --> apps_web_src_shared_components_media_OptimizedImage_tsx:::edge
  apps_web_src_features_shop_components_ShopHeader_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardDisplay_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_shared_components_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_features_shop_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_shared_components_forms_VariationFilter_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_shared_components_search_ActiveFilters_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_components_search_FiltersPanel_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_components_Cards_AdminCardGrid_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_components_Cards_AdminCardGrid_tsx --> apps_web_src_shared_components_cardDisplay_CardGrid_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_components_search_SearchBar_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_components_ui_EmptyState_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_components_cardDisplay_CardSkeleton_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_features_admin_components_Cards_AdminCardGrid_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_components_cardDisplay_CardList_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_components_forms_VariationFilter_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_utils_groupCards_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Inventory_BulkManager_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_admin_components_Inventory_BulkManager_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_CartItem_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_index_ts --> apps_web_src_features_shop_components_Cart_MiniCart_tsx:::edge
  apps_web_src_features_shop_components_Cart_index_ts --> apps_web_src_features_shop_components_Cart_Checkout_tsx:::edge
  apps_web_src_features_shop_components_Cart_index_ts --> apps_web_src_features_shop_components_Cart_AddtoCartModal_tsx:::edge
  apps_web_src_features_shop_components_Cart_MiniCart_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_App_tsx --> apps_web_src_features_shop_ShopPage_tsx:::edge
  apps_web_src_App_tsx --> apps_web_src_features_admin_components_Dashboard_tsx:::edge
  apps_web_src_App_tsx --> apps_web_src_features_admin_components_Login_tsx:::edge
  apps_web_src_features_shop_hooks_useShopFilters_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_shop_hooks_useShopFilters_ts --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_shop_hooks_useShopFilters_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_hooks_useCart_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardItem_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_ListCardItem_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_shared_hooks_useVirtualScroll_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_shared_components_cardDisplay_CardItem_tsx:::edge
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx --> apps_web_src_shared_components_cardDisplay_CardSkeleton_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_lib_utils_format_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_lib_utils_groupCards_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Dashboard_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_components_Login_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_hooks_useFilterCounts_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_shop_hooks_useCardFetching_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_hooks_useRecentlyViewed_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_hooks_useVariationSelection_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_ShopHeader_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardDisplay_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_shared_components_cardDisplay_CardRow_tsx:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_features_shop_components_Cart_index_ts:::edge
  apps_web_src_shared_components_cardDisplay_CardList_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_shared_components_forms_VariationFilter_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_shared_components_search_ActiveFilters_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_components_search_FiltersPanel_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Cards_AdminCardGrid_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Inventory_BulkManager_tsx --> apps_web_src_lib_utils_csv_ts:::edge
  apps_web_src_features_admin_components_Inventory_BulkManager_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_CartItem_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_MiniCart_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_api_vitest_config_ts["apps/api/vitest.config.ts"]
  apps_web_tailwind_config_ts["apps/web/tailwind.config.ts"]
  apps_web_vite_config_ts["apps/web/vite.config.ts"]
  apps_api_src_lib_env_ts["apps/api/src/lib/env.ts"]
  apps_api_src_lib_authUtils_ts["apps/api/src/lib/authUtils.ts"]
  apps_api_src_routes_auth_ts["apps/api/src/routes/auth.ts"]
  apps_api_src_lib_db_ts["apps/api/src/lib/db.ts"]
  apps_api_src_routes_cards_ts["apps/api/src/routes/cards.ts"]
  apps_api_src_routes_variations_ts["apps/api/src/routes/variations.ts"]
  apps_api_src_middleware_auth_ts["apps/api/src/middleware/auth.ts"]
  apps_api_src_routes_orders_ts["apps/api/src/routes/orders.ts"]
  apps_api_src_routes_inventory_ts["apps/api/src/routes/inventory.ts"]
  apps_api_src_routes_additional_ts["apps/api/src/routes/additional.ts"]
  apps_api_src_routes_storefront_ts["apps/api/src/routes/storefront.ts"]
  apps_api_src_routes_index_ts["apps/api/src/routes/index.ts"]
  apps_api_src_app_ts["apps/api/src/app.ts"]
  apps_api_src_index_ts["apps/api/src/index.ts"]
  apps_api_src_server_ts["apps/api/src/server.ts"]
  apps_web_src_App_tsx["apps/web/src/App.tsx"]
  apps_web_src_main_tsx["apps/web/src/main.tsx"]
  apps_web_src_reportWebVitals_ts["apps/web/src/reportWebVitals.ts"]
  apps_web_src_vit_env_d_ts["apps/web/src/vit-env.d.ts"]
  apps_api_src_lib_logger_ts["apps/api/src/lib/logger.ts"]
  apps_api_src_middleware_error_ts["apps/api/src/middleware/error.ts"]
  apps_api_src_middleware_rateLimit_ts["apps/api/src/middleware/rateLimit.ts"]
  apps_api_src_middleware_requestLog_ts["apps/api/src/middleware/requestLog.ts"]
  apps_api_src_middleware_securityHeaders_ts["apps/api/src/middleware/securityHeaders.ts"]
  apps_api_src_services_emailService_ts["apps/api/src/services/emailService.ts"]
  apps_api_src_services_variationAnalysis_ts["apps/api/src/services/variationAnalysis.ts"]
  apps_api_src_utils_strings_ts["apps/api/src/utils/strings.ts"]
  apps_web_src_a11y_Announcer_tsx["apps/web/src/a11y/Announcer.tsx"]
  apps_web_src_testUtils_storageMocks_ts["apps/web/src/testUtils/storageMocks.ts"]
  apps_web_src_types_index_ts["apps/web/src/types/index.ts"]
  apps_web_src_features_admin_index_ts["apps/web/src/features/admin/index.ts"]
  apps_web_src_features_shop_index_ts["apps/web/src/features/shop/index.ts"]
  apps_web_src_features_shop_hooks_useShopFilters_ts["apps/web/src/features/shop/hooks/useShopFilters.ts"]
  apps_web_src_features_shop_components_Cart_Checkout_tsx["apps/web/src/features/shop/components/Cart/Checkout.tsx"]
  apps_web_src_features_shop_hooks_useCart_ts["apps/web/src/features/shop/hooks/useCart.ts"]
  apps_web_src_shared_components_cardDisplay_CardSkeleton_tsx["apps/web/src/shared/components/cardDisplay/CardSkeleton.tsx"]
  apps_web_src_shared_components_cardDisplay_CardItem_tsx["apps/web/src/shared/components/cardDisplay/CardItem.tsx"]
  apps_web_src_shared_components_cardDisplay_ListCardItem_tsx["apps/web/src/shared/components/cardDisplay/ListCardItem.tsx"]
  apps_web_src_shared_components_cardDisplay_CardGrid_tsx["apps/web/src/shared/components/cardDisplay/CardGrid.tsx"]
  apps_web_src_features_shop_ShopPage_tsx["apps/web/src/features/shop/ShopPage.tsx"]
  apps_web_src_lib_api_client_ts["apps/web/src/lib/api/client.ts"]
  apps_web_src_lib_api_endpoints_ts["apps/web/src/lib/api/endpoints.ts"]
  apps_web_src_lib_api_index_ts["apps/web/src/lib/api/index.ts"]
  apps_web_src_lib_constants_index_ts["apps/web/src/lib/constants/index.ts"]
  apps_web_src_lib_constants_validation_ts["apps/web/src/lib/constants/validation.ts"]
  apps_web_src_services_error_handler_ts["apps/web/src/services/error/handler.ts"]
  apps_web_src_services_error_types_ts["apps/web/src/services/error/types.ts"]
  apps_web_src_lib_utils_csv_ts["apps/web/src/lib/utils/csv.ts"]
  apps_web_src_lib_utils_format_ts["apps/web/src/lib/utils/format.ts"]
  apps_web_src_lib_utils_groupCards_ts["apps/web/src/lib/utils/groupCards.ts"]
  apps_web_src_lib_utils_index_ts["apps/web/src/lib/utils/index.ts"]
  apps_web_src_lib_utils_sanitization_ts["apps/web/src/lib/utils/sanitization.ts"]
  apps_web_src_services_http_throttler_ts["apps/web/src/services/http/throttler.ts"]
  apps_web_src_shared_hooks_index_ts["apps/web/src/shared/hooks/index.ts"]
  apps_web_src_shared_hooks_useVirtualScroll_ts["apps/web/src/shared/hooks/useVirtualScroll.ts"]
  apps_web_src_types_api_requests_ts["apps/web/src/types/api/requests.ts"]
  apps_web_src_types_api_responses_ts["apps/web/src/types/api/responses.ts"]
  apps_web_src_types_models_card_ts["apps/web/src/types/models/card.ts"]
  apps_web_src_types_models_inventory_ts["apps/web/src/types/models/inventory.ts"]
  apps_web_src_types_models_order_ts["apps/web/src/types/models/order.ts"]
  apps_web_src_shared_components_index_ts["apps/web/src/shared/components/index.ts"]
  apps_web_src_types_ui_cart_ts["apps/web/src/types/ui/cart.ts"]
  apps_web_src_types_ui_common_ts["apps/web/src/types/ui/common.ts"]
  apps_web_src_features_admin_components_Dashboard_tsx["apps/web/src/features/admin/components/Dashboard.tsx"]
  apps_web_src_features_admin_components_Login_tsx["apps/web/src/features/admin/components/Login.tsx"]
  apps_web_src_features_admin_hooks_useFilterCounts_ts["apps/web/src/features/admin/hooks/useFilterCounts.ts"]
  apps_web_src_features_shop_hooks_useCardFetching_ts["apps/web/src/features/shop/hooks/useCardFetching.ts"]
  apps_web_src_features_shop_hooks_useRecentlyViewed_ts["apps/web/src/features/shop/hooks/useRecentlyViewed.ts"]
  apps_web_src_features_shop_hooks_useShopState_ts["apps/web/src/features/shop/hooks/useShopState.ts"]
  apps_web_src_features_shop_hooks_useVariationSelection_ts["apps/web/src/features/shop/hooks/useVariationSelection.ts"]
  apps_web_src_features_shop_components_RecentlyViewed_tsx["apps/web/src/features/shop/components/RecentlyViewed.tsx"]
  apps_web_src_features_shop_components_ShopHeader_tsx["apps/web/src/features/shop/components/ShopHeader.tsx"]
  apps_web_src_shared_components_cardDisplay_CardDisplay_tsx["apps/web/src/shared/components/cardDisplay/CardDisplay.tsx"]
  apps_web_src_shared_components_cardDisplay_CardList_tsx["apps/web/src/shared/components/cardDisplay/CardList.tsx"]
  apps_web_src_shared_components_cardDisplay_CardRow_tsx["apps/web/src/shared/components/cardDisplay/CardRow.tsx"]
  apps_web_src_shared_components_forms_CurrencySelector_tsx["apps/web/src/shared/components/forms/CurrencySelector.tsx"]
  apps_web_src_shared_components_forms_VariationFilter_tsx["apps/web/src/shared/components/forms/VariationFilter.tsx"]
  apps_web_src_shared_components_layout_ErrorBoundary_tsx["apps/web/src/shared/components/layout/ErrorBoundary.tsx"]
  apps_web_src_shared_components_layout_KeyboardShortcuts_tsx["apps/web/src/shared/components/layout/KeyboardShortcuts.tsx"]
  apps_web_src_shared_components_search_ActiveFilters_tsx["apps/web/src/shared/components/search/ActiveFilters.tsx"]
  apps_web_src_shared_components_search_FiltersPanel_tsx["apps/web/src/shared/components/search/FiltersPanel.tsx"]
  apps_web_src_shared_components_search_SearchBar_tsx["apps/web/src/shared/components/search/SearchBar.tsx"]
  apps_web_src_shared_components_media_OptimizedImage_tsx["apps/web/src/shared/components/media/OptimizedImage.tsx"]
  apps_web_src_shared_components_ui_Button_tsx["apps/web/src/shared/components/ui/Button.tsx"]
  apps_web_src_shared_components_ui_EmptyState_tsx["apps/web/src/shared/components/ui/EmptyState.tsx"]
  apps_web_src_shared_components_ui_Modal_tsx["apps/web/src/shared/components/ui/Modal.tsx"]
  apps_web_src_shared_components_ui_SectionHeader_tsx["apps/web/src/shared/components/ui/SectionHeader.tsx"]
  apps_web_src_shared_components_ui_Toast_tsx["apps/web/src/shared/components/ui/Toast.tsx"]
  apps_web_src_shared_components_ui_VariationBadge_tsx["apps/web/src/shared/components/ui/VariationBadge.tsx"]
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx["apps/web/src/features/admin/components/Cards/AddToInventoryModal.tsx"]
  apps_web_src_features_admin_components_Cards_AdminCardGrid_tsx["apps/web/src/features/admin/components/Cards/AdminCardGrid.tsx"]
  apps_web_src_features_admin_components_Cards_CardsTab_tsx["apps/web/src/features/admin/components/Cards/CardsTab.tsx"]
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx["apps/web/src/features/admin/components/Analytics/AnalyticsTab.tsx"]
  apps_web_src_features_admin_components_Inventory_BulkManager_tsx["apps/web/src/features/admin/components/Inventory/BulkManager.tsx"]
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx["apps/web/src/features/admin/components/Orders/OrdersTab.tsx"]
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx["apps/web/src/features/shop/components/Cart/AddToCartModal.tsx"]
  apps_web_src_features_shop_components_Cart_CartItem_tsx["apps/web/src/features/shop/components/Cart/CartItem.tsx"]
  apps_web_src_features_shop_components_Cart_CartModal_tsx["apps/web/src/features/shop/components/Cart/CartModal.tsx"]
  apps_web_src_features_shop_components_Cart_CartPanel_tsx["apps/web/src/features/shop/components/Cart/CartPanel.tsx"]
  apps_web_src_features_shop_components_Cart_index_ts["apps/web/src/features/shop/components/Cart/index.ts"]
  apps_web_src_features_shop_components_Cart_MiniCart_tsx["apps/web/src/features/shop/components/Cart/MiniCart.tsx"]
classDef edge stroke-width:1px;
