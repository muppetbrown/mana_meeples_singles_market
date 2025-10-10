import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, X, Plus, Minus, Filter, Search, ChevronDown, LayoutGrid, List } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import CurrencySelector from './CurrencySelector';
import Checkout from './Checkout';
import { useFilterCounts } from '../hooks/useFilterCounts';
import { useEnhancedCart } from '../hooks/useEnhancedCart';
import ErrorBoundary from './ErrorBoundary';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { API_URL } from '../config/api';

// Lazy load VirtualCardGrid for code splitting
const VirtualCardGrid = React.lazy(() => import('./VirtualCardGrid'));

// Helper function to highlight matching text in suggestions
const highlightMatch = (text, query) => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    regex.test(part) ?
      <mark key={idx} className="bg-yellow-200 font-medium">{part}</mark> :
      part
  );
};

// Section Header Component
const SectionHeader = ({ title, count, isGrid = false }) => {
  if (!title) return null;

  return (
    <div className={`${isGrid ? 'col-span-full' : ''} mb-4`}>
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="text-xs opacity-90">{count} cards</div>
        </div>
        <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-200 to-purple-200"></div>
      </div>
    </div>
  );
};

// Memoized Card Component for Grid View
// Desktop: Image above, details below (vertical card)
// Mobile: Image left, details right (horizontal card for better mobile scrolling)
const CardItem = React.memo(({
  card,
  selectedVariationKey,
  selectedVariation,
  currency,
  onVariationChange,
  onAddToCart
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all motion-reduce:transition-none overflow-hidden border border-slate-200 flex flex-row lg:flex-col h-full">
      {/* Card Image - Left on mobile, top on desktop */}
      <div className="relative flex-shrink-0 w-24 sm:w-32 lg:w-full">
        <OptimizedImage
          src={card.image_url}
          alt={`${card.name} from ${card.set_name}`}
          width={250}
          height={350}
          className={`w-full h-32 sm:h-44 lg:h-64 object-cover bg-gradient-to-br from-slate-100 to-slate-200 ${
            selectedVariation?.foil_type !== 'Regular'
              ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
              : ''
          }`}
          placeholder="blur"
          sizes="(max-width: 640px) 128px, (max-width: 1024px) 192px, 100%"
        />
        {/* Foil Badge */}
        {selectedVariation?.foil_type !== 'Regular' && (
          <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-full shadow-md border border-yellow-300">
            ✨ {selectedVariation.foil_type}
          </div>
        )}
      </div>

      {/* Card Content - Right on mobile, bottom on desktop */}
      <div className="p-3 sm:p-4 lg:p-5 flex flex-col gap-2 lg:gap-3 flex-grow min-w-0">
        {/* Title & Set Info */}
        <div className="flex-shrink-0">
          <h3 className="font-semibold text-sm lg:text-lg leading-tight text-slate-900 mb-1 lg:mb-2 line-clamp-2">
            {card.name}
          </h3>
          <p className="text-xs lg:text-sm text-slate-600 pb-2 lg:pb-3 border-b border-slate-100">
            {card.set_name} • #{card.card_number}
          </p>
        </div>

        {/* Condition Selector */}
        <div className="space-y-1 lg:space-y-2 flex-shrink-0">
          <label
            htmlFor={`condition-${card.id}`}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
          >
            Condition
          </label>
          <select
            id={`condition-${card.id}`}
            value={selectedVariationKey}
            onChange={onVariationChange}
            className="w-full text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2.5 border-2 border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-colors"
          >
            {card.variations.map(variation => (
              <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                {variation.quality}
                {variation.foil_type !== 'Regular' ? ` ✨` : ''}
                {variation.language !== 'English' ? ` • ${variation.language}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Availability Status */}
        <div className="flex items-center gap-2 pb-2 lg:pb-3 border-b border-slate-100 flex-shrink-0">
          {selectedVariation?.stock > 0 ? (
            <>
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs lg:text-sm font-medium text-emerald-700">
                {selectedVariation.stock} left
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-slate-400"></div>
              <span className="text-xs lg:text-sm font-medium text-slate-500">Out of stock</span>
            </>
          )}
        </div>

        {/* Price & CTA Section - Pushed to bottom */}
        <div className="mt-auto pt-1 lg:pt-2">
          {/* Price Display */}
          <div className="mb-2 lg:mb-3">
            <div className="text-lg lg:text-2xl font-bold text-slate-900 leading-none mb-1">
              {currency.symbol}{(selectedVariation?.price * currency.rate).toFixed(2)}
            </div>
            {selectedVariation?.stock <= 3 && selectedVariation?.stock > 0 && (
              <div className="text-xs font-semibold text-red-600">
                Only {selectedVariation.stock} left!
              </div>
            )}
          </div>

          {/* Add to Cart Button - Full Width */}
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm lg:text-base font-semibold rounded-lg transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none min-h-[44px]"
            aria-label={`Add ${card.name} to cart`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.selectedVariationKey === nextProps.selectedVariationKey &&
    prevProps.currency.symbol === nextProps.currency.symbol &&
    prevProps.currency.rate === nextProps.currency.rate &&
    JSON.stringify(prevProps.selectedVariation) === JSON.stringify(nextProps.selectedVariation)
  );
});

// List Card Item Component for List View
// Fully responsive version with flexible widths - no hard-coded sizes
const ListCardItem = React.memo(({
  card,
  selectedVariationKey,
  selectedVariation,
  currency,
  onVariationChange,
  onAddToCart
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all motion-reduce:transition-none border border-slate-200">
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        {/* Card Thumbnail - Fixed small size */}
        <div className="relative w-12 h-16 sm:w-16 sm:h-24 flex-shrink-0">
          <OptimizedImage
            src={card.image_url}
            alt={`${card.name} from ${card.set_name}`}
            width={80}
            height={112}
            className="bg-gradient-to-br from-slate-100 to-slate-200 w-full h-full object-cover rounded"
            placeholder="blur"
            sizes="80px"
          />
        </div>

        {/* Card Info - Flexible with overflow handling */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate mb-0.5">
            {card.name}
          </h3>
          <p className="text-xs text-slate-600 truncate">
            {card.set_name} • #{card.card_number}
          </p>

          {/* Stock indicator - Mobile only */}
          <div className="flex items-center gap-1.5 mt-1 sm:hidden">
            <div className={`w-1.5 h-1.5 rounded-full ${
              selectedVariation?.stock > 0 ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-xs font-medium ${
              selectedVariation?.stock > 0 ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {selectedVariation?.stock > 0
                ? `${selectedVariation.stock} in stock`
                : 'Out of stock'
              }
            </span>
          </div>
        </div>

        {/* Desktop-only responsive columns - Fully flexible, no fixed widths */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 flex-shrink-0 min-w-0">
          {/* Condition Selector - Flexible, takes available space */}
          <select
            id={`condition-list-${card.id}`}
            value={selectedVariationKey}
            onChange={onVariationChange}
            className="flex-shrink-0 min-w-[100px] max-w-[160px] text-xs lg:text-sm px-2 py-2 border-2 border-slate-300 rounded-md bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-colors"
          >
            {card.variations.map(variation => (
              <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
                {variation.quality}
                {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type.slice(0,1)}` : ''}
              </option>
            ))}
          </select>

          {/* Stock - Compact, flexible */}
          <div className="flex items-center gap-1 flex-shrink-0 min-w-[32px]">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              selectedVariation?.stock > 0 ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></div>
            <span className={`text-xs font-medium whitespace-nowrap ${
              selectedVariation?.stock > 0 ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {selectedVariation?.stock > 0 ? selectedVariation.stock : '0'}
            </span>
          </div>

          {/* Price - Flexible but doesn't shrink below content */}
          <div className="text-right flex-shrink-0 min-w-[60px]">
            <span className="text-sm lg:text-base font-bold text-slate-900 block leading-none whitespace-nowrap">
              {currency.symbol}{(selectedVariation?.price * currency.rate).toFixed(2)}
            </span>
            {selectedVariation?.stock <= 3 && selectedVariation?.stock > 0 && (
              <span className="text-xs font-semibold text-red-600 block mt-0.5 whitespace-nowrap">
                {selectedVariation.stock} left
              </span>
            )}
          </div>

          {/* Add to Cart Button - Flexible */}
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="px-3 lg:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none min-h-[44px] flex-shrink-0 whitespace-nowrap"
            aria-label={`Add ${card.name} to cart`}
          >
            <span className="hidden lg:inline">Add to Cart</span>
            <span className="lg:hidden">Add</span>
          </button>
        </div>

        {/* Mobile-only Add button */}
        <div className="sm:hidden flex-shrink-0">
          <button
            onClick={onAddToCart}
            disabled={!selectedVariation || selectedVariation.stock === 0}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-all motion-reduce:transition-none focus:ring-4 focus:ring-blue-500/50 focus:outline-none shadow-sm hover:shadow-md disabled:shadow-none min-h-[44px] whitespace-nowrap"
            aria-label={`Add ${card.name} to cart`}
          >
            Add
          </button>
        </div>
      </div>

      {/* Condition selector for mobile - Expandable section */}
      <div className="sm:hidden border-t border-slate-100 px-3 py-2 bg-slate-50">
        <label
          htmlFor={`condition-list-mobile-${card.id}`}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1"
        >
          Condition
        </label>
        <select
          id={`condition-list-mobile-${card.id}`}
          value={selectedVariationKey}
          onChange={onVariationChange}
          className="w-full text-sm px-2.5 py-2 border-2 border-slate-300 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
        >
          {card.variations.map(variation => (
            <option key={`${card.id}-${variation.variation_key}`} value={variation.variation_key}>
              {variation.quality}
              {variation.foil_type !== 'Regular' ? ` • ${variation.foil_type}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});

const TCGShop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [viewMode, setViewMode] = useState('grid');

  // Enhanced cart hook with localStorage persistence
  const {
    cart,
    cartNotifications,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  } = useEnhancedCart(API_URL);

  // Initialize state from URL parameters
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';

  // Enhanced filter states from URL - memoized to prevent hook dependency issues
  const filters = useMemo(() => ({
    quality: searchParams.get('quality') || 'all',
    rarity: searchParams.get('rarity') || 'all',
    foilType: searchParams.get('foilType') || 'all',
    language: searchParams.get('language') || 'English',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    set: searchParams.get('set') || 'all'
  }), [searchParams]);

  // Filter counts hook for dynamic counts in dropdowns
  const { getCount, filterCounts } = useFilterCounts(API_URL, { ...filters, game: selectedGame });

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: []
  });
  const [availableSets, setAvailableSets] = useState([]);

  // Currency and localization with toggle - Default to NZD for NZ-based shop
  const [currency, setCurrency] = useState({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });

  // Search autocomplete with proper debouncing and request cancellation
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const abortController = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Load initial data and currency detection
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [gamesRes, , filtersRes] = await Promise.all([
          fetch(`${API_URL}/games`),
          fetch(`${API_URL}/currency/detect`),
          fetch(`${API_URL}/filters`)
        ]);

        if (!gamesRes.ok) {
          throw new Error('Failed to fetch games');
        }

        const gamesData = await gamesRes.json();
        setGames(gamesData);

        // Keep NZD as default for NZ-based shop - don't override with API detection
        // if (currencyRes.ok) {
        //   const currencyData = await currencyRes.json();
        //   setCurrency({ ...currencyData, code: currencyData.currency || 'USD' });
        // }

        // Set filter options if available
        if (filtersRes.ok) {
          const filtersData = await filtersRes.json();
          setFilterOptions(filtersData);
        }

      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load data. The API might be waking up. Please wait 30 seconds and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target.matches('input, textarea, select')) {
        // Exception: allow "?" shortcut even in inputs if it's just a question mark
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowKeyboardShortcuts(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case '?':
          setShowKeyboardShortcuts(true);
          e.preventDefault();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setShowMobileFilters(prev => !prev);
            e.preventDefault();
          }
          break;
        case 'g':
        case 'G':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
            e.preventDefault();
          }
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            setShowCart(true);
            e.preventDefault();
          }
          break;
        case '/':
          // Focus search input
          const searchInput = document.querySelector('input[type="search"]');
          if (searchInput) {
            searchInput.focus();
            e.preventDefault();
          }
          break;
        case 'Escape':
          // Close any open modals/panels
          setShowKeyboardShortcuts(false);
          setShowCart(false);
          setShowMobileFilters(false);
          setShowSuggestions(false);
          e.preventDefault();
          break;
        default:
          // No action needed for other keys
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch available sets when game changes (matching AdminDashboard logic)
  useEffect(() => {
    const fetchSets = async () => {
      if (selectedGame === 'all') {
        setAvailableSets([]);
        return;
      }

      try {
        const gameId = getGameIdFromName(selectedGame);
        if (!gameId) return;

        const response = await fetch(`${API_URL}/sets?game_id=${gameId}`);

        if (response.ok) {
          const sets = await response.json();
          setAvailableSets(sets);
        } else {
          console.error('Failed to fetch sets');
          setAvailableSets([]);
        }
      } catch (error) {
        console.error('Error fetching sets:', error);
        setAvailableSets([]);
      }
    };

    fetchSets();
    // Reset set filter when game changes
    handleFilterChange('set', 'all');
  }, [selectedGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cards with current filters
  const fetchCards = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: '100',
        search: searchTerm,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      });

      if (selectedGame !== 'all') {
        const selectedGameData = games.find(g => g.name === selectedGame);
        if (selectedGameData) {
          queryParams.append('game_id', selectedGameData.id);
        }
      }

      if (filters.quality !== 'all') queryParams.append('quality', filters.quality);
      if (filters.rarity !== 'all') queryParams.append('rarity', filters.rarity);
      if (filters.foilType !== 'all') queryParams.append('foil_type', filters.foilType);
      if (filters.language !== 'English') queryParams.append('language', filters.language);
      if (filters.set !== 'all') queryParams.append('set_name', filters.set);
      if (filters.minPrice) queryParams.append('min_price', filters.minPrice);
      if (filters.maxPrice) queryParams.append('max_price', filters.maxPrice);

      const cardsRes = await fetch(`${API_URL}/cards?${queryParams}`);

      if (!cardsRes.ok) {
        throw new Error('API request failed');
      }

      const cardsData = await cardsRes.json();

      // Group cards by base card (consolidated variants)
      const groupedCards = {};
      cardsData.cards.forEach(item => {
        const key = `${item.game_name}-${item.set_name}-${item.card_number}`;

        if (!groupedCards[key]) {
          groupedCards[key] = {
            id: key, // Use stable key as ID instead of inventory-specific item.id
            name: item.name,
            game_name: item.game_name,
            set_name: item.set_name,
            set_code: item.set_code,
            card_number: item.card_number,
            rarity: item.rarity,
            card_type: item.card_type,
            description: item.description,
            image_url: item.image_url,
            variations: []
          };
        }

        groupedCards[key].variations.push({
          inventory_id: item.inventory_id,
          quality: item.quality,
          variation_name: item.variation_name,
          foil_type: item.foil_type || 'Regular',
          language: item.language || 'English',
          price: parseFloat(item.price) * currency.rate,
          stock: item.stock_quantity,
          // Add unique identifier for variation selection
          variation_key: `${item.quality}-${item.foil_type || 'Regular'}-${item.language || 'English'}`
        });
      });

      setCards(Object.values(groupedCards));
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Failed to load cards. Please try again.');
    }
  }, [searchTerm, selectedGame, filters, games, currency.rate]);

  useEffect(() => {
    if (games.length > 0) {
      fetchCards();
    }
  }, [fetchCards, games]);

  // Improved autocomplete search with debouncing and request cancellation
  const handleSearchChange = useCallback(async (value) => {
    // Update URL immediately for responsiveness
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set('search', value);
      } else {
        newParams.delete('search');
      }
      return newParams;
    });

    // Cancel previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Create new AbortController for this request
          abortController.current = new AbortController();

          const res = await fetch(
            `${API_URL}/search/autocomplete?q=${encodeURIComponent(value)}`,
            { signal: abortController.current.signal }
          );

          if (res.ok) {
            const data = await res.json();
            setSearchSuggestions(data.suggestions || []);
            setShowSuggestions(true);
            setSelectedSuggestionIndex(-1);
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Autocomplete error:', err);
          }
        }
      }, 300); // 300ms debounce
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [setSearchParams]);

  // Handle filter changes with URL state management
  const handleFilterChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Handle game selection
  const handleGameChange = useCallback((game) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const active = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== 'English') {
        let displayName = key;
        let displayValue = value;

        // Format display names
        switch (key) {
          case 'foilType': displayName = 'Foil'; break;
          case 'minPrice': displayName = 'Min Price'; displayValue = `$${value}`; break;
          case 'maxPrice': displayName = 'Max Price'; displayValue = `$${value}`; break;
          case 'sortBy': displayName = 'Sort'; break;
          case 'sortOrder': return; // Don't show sort order as separate filter
          default: displayName = key.charAt(0).toUpperCase() + key.slice(1); break;
        }

        active.push({ key, displayName, displayValue });
      }
    });

    if (searchTerm) {
      active.push({ key: 'search', displayName: 'Search', displayValue: searchTerm });
    }

    if (selectedGame && selectedGame !== 'all') {
      active.push({ key: 'game', displayName: 'Game', displayValue: selectedGame });
    }

    return active;
  }, [filters, searchTerm, selectedGame]);

  // Helper function to get game ID from name (matching AdminDashboard)
  const getGameIdFromName = (gameName) => {
    const gameMap = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    return gameMap[gameName] || null;
  };

  // Currency change function
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
  };

  // Show mini cart when items added
  useEffect(() => {
    if (cart.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  // Update cart quantity function (wrapper for useEnhancedCart)
  const updateCartQuantity = useCallback((id, quality, delta) => {
    const existingItem = cart.find(item => item.id === id && item.quality === quality);
    if (existingItem) {
      const newQuantity = existingItem.quantity + delta;
      updateQuantity(id, quality, newQuantity);
    }
  }, [cart, updateQuantity]);

  // Memoized expensive calculations
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Group cards by sections for sorting
  const groupedCards = useMemo(() => {
    if (!cards.length) return [];

    const { sortBy } = filters;

    // If no sorting by name, set, rarity, or price, return ungrouped
    if (!['name', 'set', 'rarity', 'price', 'price_low', 'price_high'].includes(sortBy)) {
      return [{ section: null, cards }];
    }

    const groups = new Map();

    cards.forEach(card => {
      let sectionKey;
      let sectionTitle;

      if (sortBy === 'name') {
        const firstLetter = card.name.charAt(0).toUpperCase();
        sectionKey = firstLetter;
        sectionTitle = firstLetter;
      } else if (sortBy === 'set') {
        sectionKey = card.set_name;
        sectionTitle = card.set_name;
      } else if (sortBy === 'rarity') {
        // Group by rarity type
        const rarity = card.rarity || 'Unknown';
        sectionKey = rarity;
        sectionTitle = rarity;
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Group by price ranges
        const price = card.variations?.[0]?.price || 0;
        let priceRange;

        if (price < 1) {
          priceRange = 'Under $1';
        } else if (price < 5) {
          priceRange = '$1 - $4.99';
        } else if (price < 10) {
          priceRange = '$5 - $9.99';
        } else if (price < 25) {
          priceRange = '$10 - $24.99';
        } else if (price < 50) {
          priceRange = '$25 - $49.99';
        } else if (price < 100) {
          priceRange = '$50 - $99.99';
        } else {
          priceRange = '$100+';
        }

        sectionKey = priceRange;
        sectionTitle = priceRange;
      }

      if (!groups.has(sectionKey)) {
        groups.set(sectionKey, {
          section: sectionTitle,
          cards: []
        });
      }

      groups.get(sectionKey).cards.push(card);
    });

    // Sort the sections
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (sortBy === 'name') {
        return a.section.localeCompare(b.section);
      } else if (sortBy === 'set') {
        return a.section.localeCompare(b.section);
      } else if (sortBy === 'rarity') {
        // Sort rarities by power level
        const rarityOrder = {
          'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Mythic': 4, 'Mythic Rare': 4,
          'Special': 5, 'Legendary': 5, 'Basic': 0, 'Unknown': 6
        };
        return (rarityOrder[a.section] || 6) - (rarityOrder[b.section] || 6);
      } else if (['price', 'price_low', 'price_high'].includes(sortBy)) {
        // Sort price ranges numerically
        const priceOrder = {
          'Under $1': 1, '$1 - $4.99': 2, '$5 - $9.99': 3, '$10 - $24.99': 4,
          '$25 - $49.99': 5, '$50 - $99.99': 6, '$100+': 7
        };
        const aOrder = priceOrder[a.section] || 8;
        const bOrder = priceOrder[b.section] || 8;

        // Reverse order for price_high
        if (sortBy === 'price_high') {
          return bOrder - aOrder;
        }
        return aOrder - bOrder;
      }
      return 0;
    });

    // Apply secondary alphabetical sorting within each group
    sortedGroups.forEach(group => {
      group.cards.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedGroups;
  }, [cards, filters]);

  // Memoized card handlers
  const handleVariationChange = useCallback((cardId) => (e) => {
    setSelectedVariations(prev => ({
      ...prev,
      [cardId]: e.target.value
    }));
  }, []);

  const handleAddToCart = useCallback((card, selectedVariation) => () => {
    addToCart({
      id: card.id,
      inventory_id: selectedVariation.inventory_id,
      name: card.name,
      image_url: card.image_url,
      quality: selectedVariation.quality,
      price: selectedVariation.price,
      stock: selectedVariation.stock,
      foil_type: selectedVariation.foil_type,
      language: selectedVariation.language,
      game_name: card.game_name,
      set_name: card.set_name,
      card_number: card.card_number,
      rarity: card.rarity
    });
  }, [addToCart]);

  // Checkout handlers
  const handleCheckoutClick = useCallback(() => {
    setShowCart(false);
    setShowCheckout(true);
  }, []);

  const handleBackFromCheckout = useCallback(() => {
    setShowCheckout(false);
    setShowCart(false);
  }, []);

  const handleOrderSubmit = useCallback(async (orderData) => {
    try {
      // Here you would typically send the order to your backend
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        // Clear the cart after successful order
        clearCart();
        // Order submission was successful
        return true;
      } else {
        throw new Error('Failed to submit order');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      throw error;
    }
  }, [clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin motion-reduce:animate-none rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading cards...</p>
          <p className="mt-2 text-sm text-slate-700">If this takes a while, the API might be waking up...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show checkout if checkout is active
  if (showCheckout) {
    return (
      <Checkout
        cart={cart}
        currency={currency}
        onBack={handleBackFromCheckout}
        onOrderSubmit={handleOrderSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TCG Singles
            </h1>
            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <CurrencySelector
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                className="flex-shrink-0"
              />

              {/* Shopping Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-3 hover:bg-slate-100 rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label={`Open shopping cart with ${cartCount} items`}
              >
                <ShoppingCart className="w-6 h-6 text-slate-700" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                    aria-live="assertive"
                    aria-label={`${cartCount} items in cart`}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Open filters and search panel"
            aria-expanded={showMobileFilters}
          >
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-700">Filters & Search</span>
            <ChevronDown className="w-4 h-4 text-slate-600 ml-auto" />
          </button>
        </div>

        {/* Desktop Layout with Sidebar */}
        <div className="lg:flex lg:gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Search & Filters</h2>

              {/* Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="search"
                    placeholder="Card name, set, number..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                    onBlur={(e) => {
                      // Don't hide suggestions if clicking on them
                      if (!e.relatedTarget?.closest('#search-suggestions')) {
                        setTimeout(() => setShowSuggestions(false), 200);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!showSuggestions) return;

                      switch (e.key) {
                        case 'ArrowDown':
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev =>
                            prev < searchSuggestions.length - 1 ? prev + 1 : 0
                          );
                          break;
                        case 'ArrowUp':
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev =>
                            prev > 0 ? prev - 1 : searchSuggestions.length - 1
                          );
                          break;
                        case 'Enter':
                          if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
                            e.preventDefault();
                            const suggestion = searchSuggestions[selectedSuggestionIndex];
                            handleSearchChange(suggestion.name);
                            setShowSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          }
                          break;
                        case 'Escape':
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                          break;
                        default:
                          // Allow other key events to proceed normally
                          break;
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    aria-label="Search for cards by name, set, or number"
                    aria-describedby={showSuggestions ? "search-suggestions" : undefined}
                    aria-expanded={showSuggestions}
                    aria-controls={showSuggestions ? "search-suggestions" : undefined}
                    aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
                    role="combobox"
                  />
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    id="search-suggestions"
                    className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-lg mt-1 shadow-lg z-50 max-h-48 overflow-y-auto"
                    role="listbox"
                  >
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        id={`suggestion-${idx}`}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center gap-2 border-b last:border-b-0 ${
                          selectedSuggestionIndex === idx ? 'bg-blue-50' : ''
                        }`}
                        onMouseDown={() => {
                          // Use onMouseDown instead of onClick to prevent blur issues
                          handleSearchChange(suggestion.name);
                          setShowSuggestions(false);
                          setSelectedSuggestionIndex(-1);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        role="option"
                        aria-selected={selectedSuggestionIndex === idx}
                        aria-label={`Select ${suggestion.name} from ${suggestion.set_name}`}
                      >
                        <img
                          src={suggestion.image_url}
                          alt=""
                          className="w-6 h-8 object-contain rounded"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="text-xs font-medium">
                            {highlightMatch(suggestion.name, searchTerm)}
                          </div>
                          <div className="text-xs text-slate-600">{suggestion.set_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Game Filter - Dropdown Style */}
              <div className="mb-6">
                <label htmlFor="game-filter" className="block text-sm font-medium text-slate-700 mb-2">Game</label>
                <select
                  id="game-filter"
                  value={selectedGame}
                  onChange={(e) => handleGameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">All Games</option>
                  {games.map(game => (
                    <option key={game.id} value={game.name}>{game.name}</option>
                  ))}
                </select>
              </div>

              {/* Set Filter - Dynamic based on selected game */}
              <div className="mb-6">
                <label htmlFor="set-filter" className="block text-sm font-medium text-slate-700 mb-2">Set</label>
                <select
                  id="set-filter"
                  value={filters.set}
                  onChange={(e) => handleFilterChange('set', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                  disabled={selectedGame === 'all'}
                  aria-describedby={selectedGame === 'all' ? "set-help-text" : undefined}
                  aria-label={`Filter by card set${selectedGame !== 'all' ? `, currently ${availableSets.length} sets available` : ' (select a game first)'}`}
                >
                  <option value="all">All Sets</option>
                  {availableSets.map(set => (
                    <option key={set.id} value={set.name}>{set.name}</option>
                  ))}
                </select>
                {selectedGame === 'all' && (
                  <p id="set-help-text" className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
                )}
              </div>

              {/* Other Filters */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="rarity-filter" className="block text-sm font-medium text-slate-700 mb-2">Rarity</label>
                  <select
                    id="rarity-filter"
                    value={filters.rarity}
                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    aria-label={`Filter by card rarity, ${Object.keys(filterCounts.rarities || {}).length} rarity types available`}
                  >
                    <option value="all">All Rarities</option>
                    <optgroup label="⚪ Common">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('common') || rarity.toLowerCase().includes('basic')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟢 Uncommon">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('uncommon')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟡 Rare">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('rare') && !rarity.toLowerCase().includes('mythic')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🔴 Mythic & Special">
                      {filterOptions.rarities.filter(rarity =>
                        rarity.toLowerCase().includes('mythic') ||
                        rarity.toLowerCase().includes('legendary') ||
                        rarity.toLowerCase().includes('special')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 Other">
                      {filterOptions.rarities.filter(rarity =>
                        !rarity.toLowerCase().includes('common') &&
                        !rarity.toLowerCase().includes('basic') &&
                        !rarity.toLowerCase().includes('uncommon') &&
                        !rarity.toLowerCase().includes('rare') &&
                        !rarity.toLowerCase().includes('mythic') &&
                        !rarity.toLowerCase().includes('legendary') &&
                        !rarity.toLowerCase().includes('special')
                      ).map(rarity => (
                        <option key={rarity} value={rarity}>
                          {rarity} {getCount('rarities', rarity)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                  <select
                    value={filters.quality}
                    onChange={(e) => handleFilterChange('quality', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Conditions</option>
                    {filterOptions.qualities.map(quality => (
                      <option key={quality} value={quality}>
                        {quality} {getCount('qualities', quality)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Foil Type</label>
                  <select
                    value={filters.foilType}
                    onChange={(e) => handleFilterChange('foilType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Foil Types</option>
                    {filterOptions.foilTypes.map(foilType => (
                      <option key={foilType} value={foilType}>
                        {foilType} {getCount('foilTypes', foilType === 'Foil' ? 'foil' : 'non-foil')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price Range ({currency.symbol})</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="📝 Basic">
                        <option value="name">Name</option>
                        <option value="set">Set</option>
                        <option value="updated">Recently Updated</option>
                      </optgroup>
                      <optgroup label="💎 Rarity">
                        <option value="rarity">By Rarity</option>
                      </optgroup>
                      <optgroup label="💰 Price">
                        <option value="price">By Price</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                      </optgroup>
                    </select>
                    <button
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center mb-4">
              <div className="flex-1 pr-4">
                <p className="text-slate-600" aria-live="polite">
                  <span className="font-medium">{cards.length}</span> cards found
                </p>
              </div>

              {/* View Toggle - Absolutely Fixed Position */}
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '140px', width: '140px' }}>
                <span className="text-sm text-slate-600 hidden sm:inline" style={{ width: '36px' }}>View:</span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" style={{ width: '96px' }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={{ width: '44px', minWidth: '44px' }}
                    aria-pressed={viewMode === 'grid'}
                    aria-label="Switch to grid view"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={{ width: '44px', minWidth: '44px' }}
                    aria-pressed={viewMode === 'list'}
                    aria-label="Switch to list view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Badges */}
            {activeFilters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Active filters:</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-sm"
                  >
                    <span>{filter.displayName}: {filter.displayValue}</span>
                    <button
                      onClick={() => {
                        if (filter.key === 'search') {
                          handleSearchChange('');
                        } else if (filter.key === 'game') {
                          handleGameChange('all');
                        } else {
                          handleFilterChange(filter.key, '');
                        }
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`Clear ${filter.displayName} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}

            {/* Conditional Rendering Based on View Mode */}
            <div className="w-full">
              {viewMode === 'grid' ? (
                /* Grid View */
                cards.length > 100 ? (
                  /* Virtual Scrolling for large datasets (100+ cards) */
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-slate-600 text-sm">Loading virtual scrolling...</p>
                        </div>
                      }
                    >
                      <VirtualCardGrid
                        cards={cards}
                        CardComponent={({ card }) => {
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <CardItem
                              card={card}
                              selectedVariationKey={selectedVariationKey}
                              selectedVariation={selectedVariation}
                              currency={currency}
                              onVariationChange={handleVariationChange(card.id)}
                              onAddToCart={handleAddToCart(card, selectedVariation)}
                            />
                          );
                        }}
                        cardHeight={500}    // Increased for vertical card layout on desktop
                        containerHeight={800}
                        enableProgressiveLoading={cards.length > 500}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  /* Standard Grid for smaller datasets (< 100 cards) with sections */
                  <div>
                    {groupedCards.map((group, groupIndex) => (
                      <div key={groupIndex} className="mb-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                          <SectionHeader title={group.section} count={group.cards.length} isGrid={true} />
                          {group.cards.map(card => {
                            const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                            const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                            return (
                              <CardItem
                                key={card.id}
                                card={card}
                                selectedVariationKey={selectedVariationKey}
                                selectedVariation={selectedVariation}
                                currency={currency}
                                onVariationChange={handleVariationChange(card.id)}
                                onAddToCart={handleAddToCart(card, selectedVariation)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* List View */
                <div>
                  {groupedCards.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-8">
                      <SectionHeader title={group.section} count={group.cards.length} isGrid={false} />
                      <div className="space-y-2">
                        {group.cards.map(card => {
                          const selectedVariationKey = selectedVariations[card.id] || card.variations[0]?.variation_key;
                          const selectedVariation = card.variations.find(v => v.variation_key === selectedVariationKey) || card.variations[0];

                          return (
                            <ListCardItem
                              key={card.id}
                              card={card}
                              selectedVariationKey={selectedVariationKey}
                              selectedVariation={selectedVariation}
                              currency={currency}
                              onVariationChange={handleVariationChange(card.id)}
                              onAddToCart={handleAddToCart(card, selectedVariation)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cards.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-slate-700 text-lg">No cards found matching your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileFilters(false)}>
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  aria-label="Close filters panel"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {/* Mobile search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="search"
                      placeholder="Card name, set, number..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      aria-label="Search for cards by name, set, or number"
                    />
                  </div>
                </div>

                {/* Mobile filters - same as desktop sidebar */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Game</label>
                    <select
                      value={selectedGame}
                      onChange={(e) => handleGameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Games</option>
                      {games.map(game => (
                        <option key={game.id} value={game.name}>{game.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Set</label>
                    <select
                      value={filters.set}
                      onChange={(e) => handleFilterChange('set', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      disabled={selectedGame === 'all'}
                    >
                      <option value="all">All Sets</option>
                      {availableSets.map(set => (
                        <option key={set.id} value={set.name}>{set.name}</option>
                      ))}
                    </select>
                    {selectedGame === 'all' && (
                      <p className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rarity</label>
                    <select
                      value={filters.rarity}
                      onChange={(e) => handleFilterChange('rarity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Rarities</option>
                      <optgroup label="⚪ Common">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('common') || rarity.toLowerCase().includes('basic')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🟢 Uncommon">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('uncommon')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🟡 Rare">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('rare') && !rarity.toLowerCase().includes('mythic')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔴 Mythic & Special">
                        {filterOptions.rarities.filter(rarity =>
                          rarity.toLowerCase().includes('mythic') ||
                          rarity.toLowerCase().includes('legendary') ||
                          rarity.toLowerCase().includes('special')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="📦 Other">
                        {filterOptions.rarities.filter(rarity =>
                          !rarity.toLowerCase().includes('common') &&
                          !rarity.toLowerCase().includes('basic') &&
                          !rarity.toLowerCase().includes('uncommon') &&
                          !rarity.toLowerCase().includes('rare') &&
                          !rarity.toLowerCase().includes('mythic') &&
                          !rarity.toLowerCase().includes('legendary') &&
                          !rarity.toLowerCase().includes('special')
                        ).map(rarity => (
                          <option key={rarity} value={rarity}>
                            {rarity} {getCount('rarities', rarity)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="condition-filter" className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                    <select
                      id="condition-filter"
                      value={filters.quality}
                      onChange={(e) => handleFilterChange('quality', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      aria-label={`Filter by card condition, ${filterOptions.qualities.length} condition types available`}
                    >
                      <option value="all">All Conditions</option>
                      {filterOptions.qualities.map(quality => (
                        <option key={quality} value={quality}>
                          {quality} {getCount('qualities', quality)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-slate-700 mb-2">Price Range ({currency.symbol})</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          id="min-price"
                          type="number"
                          placeholder="Min"
                          value={filters.minPrice}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                          aria-label={`Minimum price filter in ${currency.symbol}`}
                        />
                        <input
                          id="max-price"
                          type="number"
                          placeholder="Max"
                          value={filters.maxPrice}
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                          aria-label={`Maximum price filter in ${currency.symbol}`}
                        />
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <label htmlFor="sort-by" className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                    <div className="flex gap-2">
                      <select
                        id="sort-by"
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        aria-label="Choose sorting method for cards"
                      >
                        <optgroup label="📝 Basic">
                          <option value="name">Name</option>
                          <option value="set">Set</option>
                          <option value="updated">Recently Updated</option>
                        </optgroup>
                        <optgroup label="💎 Rarity">
                          <option value="rarity">By Rarity</option>
                        </optgroup>
                        <optgroup label="💰 Price">
                          <option value="price">By Price</option>
                          <option value="price_low">Price: Low to High</option>
                          <option value="price_high">Price: High to Low</option>
                        </optgroup>
                      </select>
                      <button
                        onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        title={`Currently sorting ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full mt-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Mini Cart */}
      {showMiniCart && cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-40 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900">Cart ({cartCount})</h3>
            <button
              onClick={() => setShowMiniCart(false)}
              className="text-slate-400 hover:text-slate-600 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none rounded"
              aria-label="Close mini cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.slice(0, 3).map((item, idx) => (
              <div key={`${item.id}-${item.quality}`} className="flex items-center gap-2 text-sm">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-8 h-10 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-slate-600">
                    <div className="truncate">{item.set_name} #{item.card_number}</div>
                    <div>{item.quality} × {item.quantity}</div>
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      <div className="text-yellow-600">✨ {item.foil_type}</div>
                    )}
                    {item.language && item.language !== 'English' && (
                      <div>{item.language}</div>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-blue-600">
                  {currency.symbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
            {cart.length > 3 && (
              <div className="text-xs text-slate-600 text-center">
                ...and {cart.length - 3} more items
              </div>
            )}
          </div>

          <div className="border-t mt-3 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg text-blue-600">
                {currency.symbol}{cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCart(true)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                View Cart
              </button>
              <button
                onClick={() => setShowMiniCart(false)}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-700">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={`${item.id}-${item.quality}`} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-20 h-28 object-contain rounded bg-white" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="112"%3E%3Crect fill="%231e293b" width="80" height="112"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{item.name}</h3>
                        <div className="text-xs text-slate-600 mb-2 space-y-1">
                          <div className="font-medium">{item.game_name}</div>
                          <div>{item.set_name} #{item.card_number}</div>
                          <div>{item.quality}</div>
                          {item.foil_type && item.foil_type !== 'Regular' && (
                            <div className="flex items-center gap-1">
                              <span>✨</span>
                              <span className="font-medium text-yellow-600">{item.foil_type}</span>
                            </div>
                          )}
                          {item.language && item.language !== 'English' && (
                            <div className="font-medium text-slate-700">{item.language}</div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-blue-600 mb-3">{currency.symbol}{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                              disabled={item.quantity >= item.stock}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none rounded px-2 py-1"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-6 py-4 bg-slate-50">
                <div className="flex justify-between mb-4">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">{currency.symbol}{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckoutClick}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Notifications */}
      {cartNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {cartNotifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                notification.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              } border`}
              role={notification.type === 'error' ? 'alert' : 'status'}
              aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* ARIA Live Regions for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {groupedCards.length > 0 && (
          `Showing ${groupedCards.reduce((total, group) => total + group.cards.length, 0)} cards`
        )}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {loading && "Loading cards..."}
        {error && `Error: ${error}`}
      </div>

      {/* Search Results Announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        key={`search-${searchTerm}-${groupedCards.length}`}
      >
        {searchTerm && !loading && (
          groupedCards.length > 0
            ? `Found ${groupedCards.reduce((total, group) => total + group.cards.length, 0)} cards matching "${searchTerm}"`
            : `No cards found matching "${searchTerm}"`
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

    </div>
  );
};

export default TCGShop;