import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, X, Plus, Minus, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';

// Use environment variable for API URL, fallback for development
const API_URL = process.env.REACT_APP_API_URL || 'https://mana-meeples-singles-market.onrender.com/api';

const TCGShop = () => {
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [selectedQualities, setSelectedQualities] = useState({});

  // Enhanced filter states
  const [filters, setFilters] = useState({
    quality: 'all',
    rarity: 'all',
    foilType: 'all',
    language: 'English',
    minPrice: '',
    maxPrice: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    rarities: [],
    qualities: [],
    foilTypes: [],
    languages: []
  });

  // Currency and localization with toggle
  const [currency, setCurrency] = useState({ symbol: '$', rate: 1.0, code: 'USD' });
  const [currencyToggle, setCurrencyToggle] = useState(false);

  // Search autocomplete
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load initial data and currency detection
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [gamesRes, currencyRes, filtersRes] = await Promise.all([
          fetch(`${API_URL}/games`),
          fetch(`${API_URL}/currency/detect`),
          fetch(`${API_URL}/filters`)
        ]);

        if (!gamesRes.ok) {
          throw new Error('Failed to fetch games');
        }

        const gamesData = await gamesRes.json();
        setGames(gamesData);

        // Set currency if available
        if (currencyRes.ok) {
          const currencyData = await currencyRes.json();
          setCurrency({ ...currencyData, code: currencyData.currency || 'USD' });
        }

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

  // Fetch cards with current filters
  const fetchCards = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: '200',
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
            id: item.id,
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
          stock: item.stock_quantity
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

  // Autocomplete search
  const handleSearchChange = useCallback(async (value) => {
    setSearchTerm(value);

    if (value.length >= 2) {
      try {
        const res = await fetch(`${API_URL}/search/autocomplete?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Currency toggle function
  const toggleCurrency = () => {
    const isUSD = currency.code === 'USD';
    setCurrency({
      symbol: isUSD ? 'NZ$' : '$',
      rate: isUSD ? 1.6 : 1.0,
      code: isUSD ? 'NZD' : 'USD'
    });
  };

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('tcg-shop-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Failed to load cart:', err);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('tcg-shop-cart', JSON.stringify(cart));

    // Show mini cart when items added
    if (cart.length > 0 && !showCart) {
      setShowMiniCart(true);
    }
  }, [cart, showCart]);

  const addToCart = (item) => {
    const existingItem = cart.find(c => 
      c.id === item.id && c.quality === item.quality
    );
    
    if (existingItem) {
      if (existingItem.quantity < item.stock) {
        setCart(cart.map(c =>
          c.id === item.id && c.quality === item.quality
            ? { ...c, quantity: c.quantity + 1 }
            : c
        ));
      }
    } else {
      setCart([...cart, { 
        id: item.id,
        inventory_id: item.inventory_id,
        name: item.name,
        image_url: item.image_url,
        quality: item.quality,
        price: item.price,
        stock: item.stock,
        quantity: 1
      }]);
    }
  };

  const updateCartQuantity = (id, quality, delta) => {
    setCart(cart.map(item => {
      if (item.id === id && item.quality === quality) {
        const newQuantity = Math.max(0, Math.min(item.stock, item.quantity + delta));
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id, quality) => {
    setCart(cart.filter(item => !(item.id === id && item.quality === quality)));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading cards...</p>
          <p className="mt-2 text-sm text-slate-500">If this takes a while, the API might be waking up...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TCG Singles
            </h1>
            <div className="flex items-center gap-3">
              {/* Currency Toggle */}
              <button
                onClick={toggleCurrency}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                title="Toggle currency"
              >
                <span className="text-slate-700">{currency.code}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-500">{currency.code === 'USD' ? 'NZD' : 'USD'}</span>
              </button>

              {/* Shopping Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-3 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={`Shopping cart with ${cartCount} items`}
              >
                <ShoppingCart className="w-6 h-6 text-slate-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-700">Filters & Search</span>
            <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
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
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-lg mt-1 shadow-lg z-50 max-h-48 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 border-b last:border-b-0"
                        onClick={() => {
                          setSearchTerm(suggestion.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <img
                          src={suggestion.image_url}
                          alt={suggestion.name}
                          className="w-6 h-8 object-contain rounded"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="text-xs font-medium">{suggestion.name}</div>
                          <div className="text-xs text-slate-500">{suggestion.set_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Game Filter with Visual Icons */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">Card Game</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="gameFilter"
                      value="all"
                      checked={selectedGame === 'all'}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300"
                    />
                    <span className="text-sm">All Games</span>
                  </label>
                  {games.map(game => (
                    <label key={game.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="gameFilter"
                        value={game.name}
                        checked={selectedGame === game.name}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-slate-300"
                      />
                      <div className="flex items-center gap-2">
                        {/* Game Icon */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                          {game.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm">{game.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rarity</label>
                  <select
                    value={filters.rarity}
                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Rarities</option>
                    {filterOptions.rarities.map(rarity => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
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
                      <option key={quality} value={quality}>{quality}</option>
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
                      <option key={foilType} value={foilType}>{foilType}</option>
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
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="rarity">Rarity</option>
                      <option value="set">Set</option>
                      <option value="updated">Recently Updated</option>
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
            {/* Mobile Search (only visible on mobile) */}
            <div className="lg:hidden bg-white rounded-xl shadow-sm p-4 mb-6 border border-slate-200">
              <div className="relative">
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search cards"
                />
              </div>

              {/* Autocomplete suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-lg mt-1 shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b last:border-b-0"
                      onClick={() => {
                        setSearchTerm(suggestion.name);
                        setShowSuggestions(false);
                      }}
                    >
                      <img
                        src={suggestion.image_url}
                        alt={suggestion.name}
                        className="w-8 h-10 object-contain rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div>
                        <div className="font-medium text-sm">{suggestion.name}</div>
                        <div className="text-xs text-slate-500">{suggestion.set_name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-40"
              aria-label="Filter by game"
            >
              <option value="all">All Games</option>
              {games.map(game => (
                <option key={game.id} value={game.name}>{game.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <select
                  value={filters.rarity}
                  onChange={(e) => handleFilterChange('rarity', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="all">All Rarities</option>
                  {filterOptions.rarities.map(rarity => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>

                <select
                  value={filters.quality}
                  onChange={(e) => handleFilterChange('quality', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="all">All Conditions</option>
                  {filterOptions.qualities.map(quality => (
                    <option key={quality} value={quality}>{quality}</option>
                  ))}
                </select>

                <select
                  value={filters.foilType}
                  onChange={(e) => handleFilterChange('foilType', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="all">All Foil Types</option>
                  {filterOptions.foilTypes.map(foilType => (
                    <option key={foilType} value={foilType}>{foilType}</option>
                  ))}
                </select>

                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {filterOptions.languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Min Price ({currency.symbol})</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Max Price ({currency.symbol})</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="999.99"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="rarity">Rarity</option>
                      <option value="set">Set</option>
                      <option value="updated">Recently Updated</option>
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
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-slate-600">
            <span className="font-medium">{cards.length}</span> cards found
          </p>

          {/* Currency indicator */}
          <div className="text-sm text-slate-500">
            Prices in {currency.symbol === 'NZ$' ? 'New Zealand Dollars (NZD)' : 'US Dollars (USD)'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {cards.map(card => {
            const selectedQuality = selectedQualities[card.id] || card.variations[0]?.quality;
            const selectedVariation = card.variations.find(v => v.quality === selectedQuality) || card.variations[0];
            
            return (
              <div key={card.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-slate-200">
                <div className="aspect-[5/7] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="350"%3E%3Crect fill="%231e293b" width="250" height="350"/%3E%3Ctext fill="white" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-slate-900 mb-1">{card.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {card.set_name} • #{card.card_number}
                  </p>
                  
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Variation:
                    </label>
                    <select
                      value={selectedQuality}
                      onChange={(e) => setSelectedQualities({
                        ...selectedQualities,
                        [card.id]: e.target.value
                      })}
                      className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {card.variations.map(variation => (
                        <option key={`${card.id}-${variation.quality}`} value={variation.quality}>
                          {variation.quality}{variation.foil_type !== 'Regular' ? ` (${variation.foil_type})` : ''} - {variation.stock} in stock
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variation details */}
                  {selectedVariation && (
                    <div className="mb-3 text-xs text-slate-600 space-y-1">
                      {selectedVariation.foil_type !== 'Regular' && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"></span>
                          {selectedVariation.foil_type}
                        </div>
                      )}
                      {selectedVariation.language !== 'English' && (
                        <div>Language: {selectedVariation.language}</div>
                      )}
                      {selectedVariation.variation_name && (
                        <div>Variant: {selectedVariation.variation_name}</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {currency.symbol}{selectedVariation?.price.toFixed(2)}
                      </div>
                      {selectedVariation?.stock < 5 && selectedVariation?.stock > 0 && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Only {selectedVariation.stock} left
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addToCart({
                        ...card,
                        ...selectedVariation,
                        quality: selectedQuality
                      })}
                      disabled={!selectedVariation || selectedVariation.stock === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      {selectedVariation?.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {cards.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-slate-500 text-lg">No cards found matching your search</p>
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
              className="text-slate-400 hover:text-slate-600"
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
                  <div className="text-xs text-slate-500">{item.quality} × {item.quantity}</div>
                </div>
                <div className="font-semibold text-blue-600">
                  {currency.symbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
            {cart.length > 3 && (
              <div className="text-xs text-slate-500 text-center">
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
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
              >
                View Cart
              </button>
              <button
                onClick={() => setShowMiniCart(false)}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
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
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Your cart is empty</p>
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
                        <p className="text-xs text-slate-500 mb-2">{item.quality}</p>
                        <p className="text-sm font-bold text-blue-600 mb-3">{currency.symbol}{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                              disabled={item.quantity >= item.stock}
                              className="p-1.5 bg-white border rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
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
                <button className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TCGShop;