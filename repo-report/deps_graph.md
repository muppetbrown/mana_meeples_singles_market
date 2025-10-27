
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
  apps_web_src_App_tsx --> apps_web_src_features_shop_ShopPage_tsx:::edge
  apps_web_src_App_tsx --> apps_web_src_features_admin_Login_tsx:::edge
  apps_web_src_App_tsx --> apps_web_src_features_admin_Dashboard_tsx:::edge
  apps_web_src_App_tsx --> apps_web_src_shared_ui_Toast_tsx:::edge
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
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_shared_ui_CurrencySelector_tsx:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_features_admin_components_Cards_CardsTab_tsx:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_features_admin_components_Orders_OrdersTab_tsx:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx:::edge
  apps_web_src_features_admin_Login_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_Login_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_Login_tsx --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useCardFetching_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useCart_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useRecentlyViewed_tsx:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useShopFilters_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useShopKeyboardShortcuts_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useShopViewMode_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_hooks_index_ts --> apps_web_src_features_hooks_useCardDisplayArea_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_features_hooks_useShopViewMode_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_layout_index_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_ui_index_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useCart_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useCart_ts --> apps_web_src_shared_ui_Toast_tsx:::edge
  apps_web_src_features_hooks_useFilterCounts_ts --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_hooks_useFilterCounts_ts --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_hooks_useRecentlyViewed_tsx --> apps_web_src_shared_media_index_ts:::edge
  apps_web_src_features_hooks_useRecentlyViewed_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useShopViewMode_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_hooks_useVariationSelection_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_hooks_useCardDisplayArea_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_layout_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_hooks_useCardDisplayArea_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_shared_layout_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_lib_api_client_ts --> apps_web_src_services_http_throttler_ts:::edge
  apps_web_src_lib_api_client_ts --> apps_web_src_services_error_handler_ts:::edge
  apps_web_src_lib_api_index_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_lib_api_index_ts --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_lib_constants_validation_ts --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_lib_utils_format_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_lib_utils_groupCards_ts --> apps_web_src_types_index_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_csv_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_groupCards_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_sanitization_ts:::edge
  apps_web_src_lib_utils_index_ts --> apps_web_src_lib_utils_virtualScroll_ts:::edge
  apps_web_src_services_error_handler_ts --> apps_web_src_services_error_types_ts:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_shared_media_OptimizedImage_tsx:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_shared_ui_VariationBadge_tsx:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_card_index_ts --> apps_web_src_shared_card_CardItem_tsx:::edge
  apps_web_src_shared_card_index_ts --> apps_web_src_shared_card_CardRow_tsx:::edge
  apps_web_src_shared_card_index_ts --> apps_web_src_shared_card_CardSkeleton_tsx:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_features_shop_components_index_ts:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_shared_layout_ErrorBoundary_tsx --> apps_web_src_lib_utils_errorLogger_ts:::edge
  apps_web_src_shared_layout_index_ts --> apps_web_src_shared_layout_ErrorBoundary_tsx:::edge
  apps_web_src_shared_layout_index_ts --> apps_web_src_shared_layout_KeyboardShortcuts_tsx:::edge
  apps_web_src_shared_layout_index_ts --> apps_web_src_shared_layout_CardGrid_tsx:::edge
  apps_web_src_shared_layout_index_ts --> apps_web_src_shared_layout_CardList_tsx:::edge
  apps_web_src_shared_media_index_ts --> apps_web_src_shared_media_OptimizedImage_tsx:::edge
  apps_web_src_shared_search_ActiveFilters_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_shared_search_FiltersPanel_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_shared_search_index_ts --> apps_web_src_shared_search_FiltersPanel_tsx:::edge
  apps_web_src_shared_search_index_ts --> apps_web_src_shared_search_SearchBar_tsx:::edge
  apps_web_src_shared_search_index_ts --> apps_web_src_shared_search_ActiveFilters_tsx:::edge
  apps_web_src_shared_search_index_ts --> apps_web_src_shared_search_MobileFilterButton_tsx:::edge
  apps_web_src_shared_search_index_ts --> apps_web_src_shared_search_VariationFilter_tsx:::edge
  apps_web_src_shared_search_SearchBar_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_shared_search_VariationFilter_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_shared_search_VariationFilter_tsx --> apps_web_src_shared_search_VariationFilterCache_ts:::edge
  apps_web_src_shared_ui_FilterSidebar_tsx --> apps_web_src_shared_search_index_ts:::edge
  apps_web_src_shared_ui_FilterSidebar_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_shared_ui_FilterSidebar_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_Toast_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_EmptyState_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_SectionHeader_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_VariationBadge_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_MobileFilterModal_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_FilterSidebar_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_CurrencySelector_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_Button_tsx:::edge
  apps_web_src_shared_ui_index_ts --> apps_web_src_shared_ui_Modal_tsx:::edge
  apps_web_src_shared_ui_MobileFilterModal_tsx --> apps_web_src_shared_search_index_ts:::edge
  apps_web_src_shared_ui_MobileFilterModal_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_shared_ui_MobileFilterModal_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_shared_ui_Toast_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_ShopHeader_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_ResultsHeader_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_RecentlyViewedCards_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_ShopFilters_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_ShopCart_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_ShopState_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_Cart_AddToCartModal_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_Cart_CartItem_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_Cart_CartModal_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_Cart_MiniCart_tsx:::edge
  apps_web_src_features_shop_components_index_ts --> apps_web_src_features_shop_components_Cart_Checkout_tsx:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_shared_media_index_ts:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_ResultsHeader_tsx --> apps_web_src_features_hooks_useShopViewMode_ts:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_features_shop_components_index_ts:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_shared_ui_index_ts:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_shared_search_index_ts:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_shop_components_ShopHeader_tsx --> apps_web_src_shared_ui_CurrencySelector_tsx:::edge
  apps_web_src_features_shop_components_ShopHeader_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_ShopState_tsx --> apps_web_src_shared_layout_index_ts:::edge
  apps_web_src_features_shop_components_ShopState_tsx --> apps_web_src_features_hooks_index_ts:::edge
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_components_Cards_BulkManager_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_admin_components_Cards_BulkManager_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_search_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_card_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_layout_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_ui_index_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_api_index_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_constants_index_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_CartItem_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_CartItem_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_Checkout_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_components_Cart_Checkout_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_shop_components_Cart_MiniCart_tsx --> apps_web_src_lib_utils_index_ts:::edge
  apps_web_src_features_shop_components_Cart_MiniCart_tsx --> apps_web_src_types_index_ts:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_Dashboard_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_Login_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_layout_CardList_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_layout_CardGrid_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_layout_ErrorBoundary_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_card_CardItem_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_shared_ui_SectionHeader_tsx:::edge
  apps_web_src_features_hooks_useCardDisplayArea_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_hooks_useCardFetching_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useCart_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useFilterCounts_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_hooks_useRecentlyViewed_tsx --> apps_web_src_shared_media_OptimizedImage_tsx:::edge
  apps_web_src_features_hooks_useRecentlyViewed_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_hooks_useShopFilters_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useShopViewMode_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_hooks_useVariationSelection_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_ResultsHeader_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_ShopHeader_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_ShopFilters_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_ShopCart_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_features_shop_components_ShopState_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_layout_ErrorBoundary_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_shared_card_CardSkeleton_tsx:::edge
  apps_web_src_features_shop_ShopPage_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_ResultsHeader_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_ShopHeader_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_ShopFilters_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_ShopCart_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_features_shop_components_ShopState_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_shared_layout_ErrorBoundary_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_shared_card_CardSkeleton_tsx:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_ShopPageRefactored_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_lib_utils_format_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_lib_utils_groupCards_ts --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_shared_card_CardItem_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_lib_utils_virtualScroll_ts:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_shared_card_CardItem_tsx:::edge
  apps_web_src_shared_layout_CardGrid_tsx --> apps_web_src_shared_card_CardSkeleton_tsx:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_shared_card_CardRow_tsx:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_features_shop_components_Cart_MiniCart_tsx:::edge
  apps_web_src_shared_layout_CardList_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_shared_search_ActiveFilters_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_shared_search_FiltersPanel_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_shared_search_VariationFilter_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_shared_search_VariationFilter_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_shared_ui_FilterSidebar_tsx --> apps_web_src_shared_search_SearchBar_tsx:::edge
  apps_web_src_shared_ui_FilterSidebar_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_shared_ui_MobileFilterModal_tsx --> apps_web_src_shared_search_SearchBar_tsx:::edge
  apps_web_src_shared_ui_MobileFilterModal_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_shared_media_OptimizedImage_tsx:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_features_shop_components_Cart_MiniCart_tsx:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_features_shop_components_Cart_Checkout_tsx:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_shop_components_ShopCart_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_shared_ui_FilterSidebar_tsx:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_shared_ui_MobileFilterModal_tsx:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_shared_search_MobileFilterButton_tsx:::edge
  apps_web_src_features_shop_components_ShopFilters_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_shop_components_ShopHeader_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_ShopState_tsx --> apps_web_src_shared_layout_KeyboardShortcuts_tsx:::edge
  apps_web_src_features_shop_components_ShopState_tsx --> apps_web_src_features_hooks_useVariationSelection_ts:::edge
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Cards_BulkManager_tsx --> apps_web_src_lib_utils_csv_ts:::edge
  apps_web_src_features_admin_components_Cards_BulkManager_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_lib_utils_groupCards_ts:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_search_SearchBar_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_search_VariationFilter_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_card_CardSkeleton_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_layout_CardList_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_layout_CardGrid_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_shared_ui_EmptyState_tsx:::edge
  apps_web_src_features_admin_components_Cards_CardsTab_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_api_client_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_api_endpoints_ts:::edge
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_CartItem_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_CartModal_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_Checkout_tsx --> apps_web_src_lib_utils_sanitization_ts:::edge
  apps_web_src_features_shop_components_Cart_Checkout_tsx --> apps_web_src_lib_utils_format_ts:::edge
  apps_web_src_features_shop_components_Cart_Checkout_tsx --> apps_web_src_types_ui_common_ts:::edge
  apps_web_src_features_shop_components_Cart_MiniCart_tsx --> apps_web_src_lib_utils_format_ts:::edge
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
  apps_web_src_types_index_ts["apps/web/src/types/index.ts"]
  apps_web_src_features_admin_Dashboard_tsx["apps/web/src/features/admin/Dashboard.tsx"]
  apps_web_src_features_admin_Login_tsx["apps/web/src/features/admin/Login.tsx"]
  apps_web_src_features_hooks_index_ts["apps/web/src/features/hooks/index.ts"]
  apps_web_src_features_hooks_useCardDisplayArea_tsx["apps/web/src/features/hooks/useCardDisplayArea.tsx"]
  apps_web_src_features_hooks_useCardFetching_ts["apps/web/src/features/hooks/useCardFetching.ts"]
  apps_web_src_features_hooks_useCart_ts["apps/web/src/features/hooks/useCart.ts"]
  apps_web_src_features_hooks_useFilterCounts_ts["apps/web/src/features/hooks/useFilterCounts.ts"]
  apps_web_src_features_hooks_useRecentlyViewed_tsx["apps/web/src/features/hooks/useRecentlyViewed.tsx"]
  apps_web_src_features_hooks_useShopFilters_ts["apps/web/src/features/hooks/useShopFilters.ts"]
  apps_web_src_features_hooks_useShopKeyboardShortcuts_ts["apps/web/src/features/hooks/useShopKeyboardShortcuts.ts"]
  apps_web_src_features_hooks_useShopViewMode_ts["apps/web/src/features/hooks/useShopViewMode.ts"]
  apps_web_src_features_hooks_useVariationSelection_ts["apps/web/src/features/hooks/useVariationSelection.ts"]
  apps_web_src_features_shop_ShopPage_tsx["apps/web/src/features/shop/ShopPage.tsx"]
  apps_web_src_features_shop_ShopPageRefactored_tsx["apps/web/src/features/shop/ShopPageRefactored.tsx"]
  apps_web_src_lib_api_client_ts["apps/web/src/lib/api/client.ts"]
  apps_web_src_lib_api_endpoints_ts["apps/web/src/lib/api/endpoints.ts"]
  apps_web_src_lib_api_index_ts["apps/web/src/lib/api/index.ts"]
  apps_web_src_lib_constants_index_ts["apps/web/src/lib/constants/index.ts"]
  apps_web_src_lib_constants_validation_ts["apps/web/src/lib/constants/validation.ts"]
  apps_web_src_lib_utils_csv_ts["apps/web/src/lib/utils/csv.ts"]
  apps_web_src_lib_utils_errorLogger_ts["apps/web/src/lib/utils/errorLogger.ts"]
  apps_web_src_lib_utils_format_ts["apps/web/src/lib/utils/format.ts"]
  apps_web_src_lib_utils_groupCards_ts["apps/web/src/lib/utils/groupCards.ts"]
  apps_web_src_lib_utils_index_ts["apps/web/src/lib/utils/index.ts"]
  apps_web_src_lib_utils_sanitization_ts["apps/web/src/lib/utils/sanitization.ts"]
  apps_web_src_lib_utils_virtualScroll_ts["apps/web/src/lib/utils/virtualScroll.ts"]
  apps_web_src_services_error_handler_ts["apps/web/src/services/error/handler.ts"]
  apps_web_src_services_error_types_ts["apps/web/src/services/error/types.ts"]
  apps_web_src_services_http_throttler_ts["apps/web/src/services/http/throttler.ts"]
  apps_web_src_shared_card_CardItem_tsx["apps/web/src/shared/card/CardItem.tsx"]
  apps_web_src_shared_card_CardRow_tsx["apps/web/src/shared/card/CardRow.tsx"]
  apps_web_src_shared_card_CardSkeleton_tsx["apps/web/src/shared/card/CardSkeleton.tsx"]
  apps_web_src_shared_card_index_ts["apps/web/src/shared/card/index.ts"]
  apps_web_src_shared_layout_CardGrid_tsx["apps/web/src/shared/layout/CardGrid.tsx"]
  apps_web_src_shared_layout_CardList_tsx["apps/web/src/shared/layout/CardList.tsx"]
  apps_web_src_shared_layout_ErrorBoundary_tsx["apps/web/src/shared/layout/ErrorBoundary.tsx"]
  apps_web_src_shared_layout_index_ts["apps/web/src/shared/layout/index.ts"]
  apps_web_src_shared_layout_KeyboardShortcuts_tsx["apps/web/src/shared/layout/KeyboardShortcuts.tsx"]
  apps_web_src_shared_media_index_ts["apps/web/src/shared/media/index.ts"]
  apps_web_src_shared_media_OptimizedImage_tsx["apps/web/src/shared/media/OptimizedImage.tsx"]
  apps_web_src_shared_search_ActiveFilters_tsx["apps/web/src/shared/search/ActiveFilters.tsx"]
  apps_web_src_shared_search_FiltersPanel_tsx["apps/web/src/shared/search/FiltersPanel.tsx"]
  apps_web_src_shared_search_index_ts["apps/web/src/shared/search/index.ts"]
  apps_web_src_shared_search_MobileFilterButton_tsx["apps/web/src/shared/search/MobileFilterButton.tsx"]
  apps_web_src_shared_search_SearchBar_tsx["apps/web/src/shared/search/SearchBar.tsx"]
  apps_web_src_shared_search_VariationFilter_tsx["apps/web/src/shared/search/VariationFilter.tsx"]
  apps_web_src_shared_search_VariationFilterCache_ts["apps/web/src/shared/search/VariationFilterCache.ts"]
  apps_web_src_shared_ui_Button_tsx["apps/web/src/shared/ui/Button.tsx"]
  apps_web_src_shared_ui_CurrencySelector_tsx["apps/web/src/shared/ui/CurrencySelector.tsx"]
  apps_web_src_shared_ui_EmptyState_tsx["apps/web/src/shared/ui/EmptyState.tsx"]
  apps_web_src_shared_ui_FilterSidebar_tsx["apps/web/src/shared/ui/FilterSidebar.tsx"]
  apps_web_src_shared_ui_index_ts["apps/web/src/shared/ui/index.ts"]
  apps_web_src_shared_ui_MobileFilterModal_tsx["apps/web/src/shared/ui/MobileFilterModal.tsx"]
  apps_web_src_shared_ui_Modal_tsx["apps/web/src/shared/ui/Modal.tsx"]
  apps_web_src_shared_ui_SectionHeader_tsx["apps/web/src/shared/ui/SectionHeader.tsx"]
  apps_web_src_shared_ui_Toast_tsx["apps/web/src/shared/ui/Toast.tsx"]
  apps_web_src_shared_ui_VariationBadge_tsx["apps/web/src/shared/ui/VariationBadge.tsx"]
  apps_web_src_types_models_card_ts["apps/web/src/types/models/card.ts"]
  apps_web_src_types_models_inventory_ts["apps/web/src/types/models/inventory.ts"]
  apps_web_src_types_models_order_ts["apps/web/src/types/models/order.ts"]
  apps_web_src_types_ui_cart_ts["apps/web/src/types/ui/cart.ts"]
  apps_web_src_types_ui_common_ts["apps/web/src/types/ui/common.ts"]
  apps_web_src_types_api_requests_ts["apps/web/src/types/api/requests.ts"]
  apps_web_src_types_api_responses_ts["apps/web/src/types/api/responses.ts"]
  apps_web_src_features_shop_components_index_ts["apps/web/src/features/shop/components/index.ts"]
  apps_web_src_features_shop_components_RecentlyViewedCards_tsx["apps/web/src/features/shop/components/RecentlyViewedCards.tsx"]
  apps_web_src_features_shop_components_ResultsHeader_tsx["apps/web/src/features/shop/components/ResultsHeader.tsx"]
  apps_web_src_features_shop_components_ShopCart_tsx["apps/web/src/features/shop/components/ShopCart.tsx"]
  apps_web_src_features_shop_components_ShopFilters_tsx["apps/web/src/features/shop/components/ShopFilters.tsx"]
  apps_web_src_features_shop_components_ShopHeader_tsx["apps/web/src/features/shop/components/ShopHeader.tsx"]
  apps_web_src_features_shop_components_ShopState_tsx["apps/web/src/features/shop/components/ShopState.tsx"]
  apps_web_src_features_admin_components_Analytics_AnalyticsTab_tsx["apps/web/src/features/admin/components/Analytics/AnalyticsTab.tsx"]
  apps_web_src_features_admin_components_Cards_AddToInventoryModal_tsx["apps/web/src/features/admin/components/Cards/AddToInventoryModal.tsx"]
  apps_web_src_features_admin_components_Cards_BulkManager_tsx["apps/web/src/features/admin/components/Cards/BulkManager.tsx"]
  apps_web_src_features_admin_components_Cards_CardsTab_tsx["apps/web/src/features/admin/components/Cards/CardsTab.tsx"]
  apps_web_src_features_admin_components_Orders_OrdersTab_tsx["apps/web/src/features/admin/components/Orders/OrdersTab.tsx"]
  apps_web_src_features_shop_components_Cart_AddToCartModal_tsx["apps/web/src/features/shop/components/Cart/AddToCartModal.tsx"]
  apps_web_src_features_shop_components_Cart_CartItem_tsx["apps/web/src/features/shop/components/Cart/CartItem.tsx"]
  apps_web_src_features_shop_components_Cart_CartModal_tsx["apps/web/src/features/shop/components/Cart/CartModal.tsx"]
  apps_web_src_features_shop_components_Cart_Checkout_tsx["apps/web/src/features/shop/components/Cart/Checkout.tsx"]
  apps_web_src_features_shop_components_Cart_MiniCart_tsx["apps/web/src/features/shop/components/Cart/MiniCart.tsx"]
classDef edge stroke-width:1px;
