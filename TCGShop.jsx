import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingCart, X, Filter, ChevronDown, Plus, Minus } from 'lucide-react';

// Mock data structure - in production, this would come from your API
const MOCK_DATA = {
  games: ['Magic: The Gathering', 'Pokemon', 'Yu-Gi-Oh!', 'Flesh and Blood'],
  sets: {
    'Magic: The Gathering': ['Bloomburrow', 'Modern Horizons 3', 'Outlaws of Thunder Junction'],
    'Pokemon': ['Scarlet & Violet', 'Obsidian Flames', 'Paldean Fates'],
    'Yu-Gi-Oh!': ['Phantom Nightmare', 'Age of Overlord', 'Duelist Nexus'],
    'Flesh and Blood': ['Bright Lights', 'Part the Mistveil', 'Heavy Hitters']
  },
  qualities: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'],
  cards: [
    {
      id: 1,
      name: 'Ral, Monsoon Mage',
      game: 'Magic: The Gathering',
      set: 'Bloomburrow',
      number: '215',
      variation: 'Borderless',
      quality: 'Near Mint',
      price: 24.99,
      stock: 8,
      image: 'https://cards.scryfall.io/large/front/1/4/14c16dca-1e2a-4689-8b3b-8e0d4631e4f6.jpg',
      rarity: 'Mythic Rare',
      type: 'Planeswalker',
      description: 'Legendary Planeswalker — Ral'
    },
    {
      id: 2,
      name: 'Charizard ex',
      game: 'Pokemon',
      set: 'Obsidian Flames',
      number: '125',
      variation: 'Full Art',
      quality: 'Near Mint',
      price: 89.99,
      stock: 3,
      image: 'https://images.pokemontcg.io/sv3/125_hires.png',
      rarity: 'Ultra Rare',
      type: 'Pokemon',
      description: 'Fire-type Pokemon ex'
    },
    {
      id: 3,
      name: 'Blue-Eyes White Dragon',
      game: 'Yu-Gi-Oh!',
      set: 'Phantom Nightmare',
      number: 'PHNI-EN001',
      variation: 'Ultra Rare',
      quality: 'Near Mint',
      price: 15.50,
      stock: 12,
      image: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
      rarity: 'Ultra Rare',
      type: 'Monster',
      description: 'Level 8 Dragon/Normal'
    },
    {
      id: 4,
      name: 'Prism, Awakener of Sol',
      game: 'Flesh and Blood',
      set: 'Bright Lights',
      number: 'ELE001',
      variation: 'Cold Foil',
      quality: 'Near Mint',
      price: 45.00,
      stock: 5,
      image: 'https://fabdb2.imgix.net/cards/printings/ELE001-CF.png',
      rarity: 'Fabled',
      type: 'Hero',
      description: 'Illusionist Hero'
    },
    {
      id: 5,
      name: 'Ral, Monsoon Mage',
      game: 'Magic: The Gathering',
      set: 'Bloomburrow',
      number: '215',
      variation: 'Borderless',
      quality: 'Lightly Played',
      price: 21.99,
      stock: 4,
      image: 'https://cards.scryfall.io/large/front/1/4/14c16dca-1e2a-4689-8b3b-8e0d4631e4f6.jpg',
      rarity: 'Mythic Rare',
      type: 'Planeswalker',
      description: 'Legendary Planeswalker — Ral'
    }
  ]
};

const TCGSinglesShop = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedSet, setSelectedSet] = useState('all');
  const [selectedQuality, setSelectedQuality] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = MOCK_DATA.cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           card.number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGame = selectedGame === 'all' || card.game === selectedGame;
      const matchesSet = selectedSet === 'all' || card.set === selectedSet;
      const matchesQuality = selectedQuality === 'all' || card.quality === selectedQuality;
      const matchesMinPrice = !priceRange.min || card.price >= parseFloat(priceRange.min);
      const matchesMaxPrice = !priceRange.max || card.price <= parseFloat(priceRange.max);

      return matchesSearch && matchesGame && matchesSet && matchesQuality && 
             matchesMinPrice && matchesMaxPrice;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'stock-asc':
          return a.stock - b.stock;
        case 'stock-desc':
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedGame, selectedSet, selectedQuality, priceRange, sortBy]);

  // Available sets based on selected game
  const availableSets = selectedGame === 'all' 
    ? [] 
    : MOCK_DATA.sets[selectedGame] || [];

  // Add to cart
  const addToCart = (card) => {
    const existingItem = cart.find(item => 
      item.id === card.id && item.quality === card.quality
    );
    
    if (existingItem) {
      if (existingItem.quantity < card.stock) {
        setCart(cart.map(item =>
          item.id === card.id && item.quality === card.quality
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { ...card, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (cardId, quality, delta) => {
    setCart(cart.map(item => {
      if (item.id === cardId && item.quality === quality) {
        const newQuantity = Math.max(0, Math.min(item.stock, item.quantity + delta));
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cardId, quality) => {
    setCart(cart.filter(item => !(item.id === cardId && item.quality === quality)));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TCG Singles
            </h1>
            
            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
              aria-label={`Shopping cart with ${cartItemCount} items`}
            >
              <ShoppingCart className="w-6 h-6 text-slate-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search by card name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                aria-label="Search cards"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors touch-manipulation font-medium"
              aria-expanded={showFilters}
              aria-controls="filters-panel"
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters */}
          <div 
            id="filters-panel"
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${showFilters ? '' : 'hidden sm:grid'}`}
          >
            <div>
              <label htmlFor="game-select" className="block text-sm font-medium text-slate-700 mb-2">
                Game
              </label>
              <select
                id="game-select"
                value={selectedGame}
                onChange={(e) => {
                  setSelectedGame(e.target.value);
                  setSelectedSet('all');
                }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Games</option>
                {MOCK_DATA.games.map(game => (
                  <option key={game} value={game}>{game}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="set-select" className="block text-sm font-medium text-slate-700 mb-2">
                Set
              </label>
              <select
                id="set-select"
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                disabled={selectedGame === 'all'}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Sets</option>
                {availableSets.map(set => (
                  <option key={set} value={set}>{set}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quality-select" className="block text-sm font-medium text-slate-700 mb-2">
                Quality
              </label>
              <select
                id="quality-select"
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Qualities</option>
                {MOCK_DATA.qualities.map(quality => (
                  <option key={quality} value={quality}>{quality}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="price-min" className="block text-sm font-medium text-slate-700 mb-2">
                Min Price
              </label>
              <input
                id="price-min"
                type="number"
                placeholder="$0"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="sort-select" className="block text-sm font-medium text-slate-700 mb-2">
                Sort By
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="stock-asc">Stock (Low to High)</option>
                <option value="stock-desc">Stock (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-slate-600">
          <span className="font-medium">{filteredAndSortedCards.length}</span> cards found
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredAndSortedCards.map(card => (
            <article
              key={`${card.id}-${card.quality}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-200 group"
            >
              <button
                onClick={() => setSelectedCard(card)}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-xl"
                aria-label={`View details for ${card.name}`}
              >
                <div className="aspect-[5/7] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden relative">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {card.stock < 5 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      Low Stock
                    </span>
                  )}
                </div>
              </button>

              <div className="p-4">
                <div className="mb-2">
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1 mb-1">
                    {card.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {card.set} • #{card.number}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {card.quality}
                  </span>
                  <span className="text-xs text-slate-500">
                    Stock: {card.stock}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-bold text-blue-600">
                    ${card.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(card)}
                    disabled={card.stock === 0}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`Add ${card.name} to cart`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredAndSortedCards.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-lg">No cards found matching your criteria.</p>
            <p className="text-slate-400 text-sm mt-2">Try adjusting your filters or search term.</p>
          </div>
        )}
      </main>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 id="modal-title" className="text-2xl font-bold text-slate-900">Card Details</h2>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="aspect-[5/7] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden">
                  <img
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">
                      {selectedCard.name}
                    </h3>
                    <p className="text-slate-600 mb-4">{selectedCard.description}</p>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Game:</span>
                        <span className="text-slate-900">{selectedCard.game}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Set:</span>
                        <span className="text-slate-900">{selectedCard.set}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Number:</span>
                        <span className="text-slate-900">{selectedCard.number}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Rarity:</span>
                        <span className="text-slate-900">{selectedCard.rarity}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Variation:</span>
                        <span className="text-slate-900">{selectedCard.variation}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Quality:</span>
                        <span className="text-slate-900">{selectedCard.quality}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200">
                        <span className="font-medium text-slate-700">Stock Available:</span>
                        <span className={`font-bold ${selectedCard.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedCard.stock} {selectedCard.stock === 1 ? 'copy' : 'copies'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl font-bold text-blue-600">
                        ${selectedCard.price.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        addToCart(selectedCard);
                        setSelectedCard(null);
                      }}
                      disabled={selectedCard.stock === 0}
                      className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {selectedCard.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setShowCart(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
        >
          <div 
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="cart-title" className="text-2xl font-bold text-slate-900">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close cart"
              >
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
                    <div 
                      key={`${item.id}-${item.quality}`}
                      className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-28 object-contain rounded bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 mb-2">
                          {item.quality}
                        </p>
                        <p className="text-sm font-bold text-blue-600 mb-3">
                          ${item.price.toFixed(2)}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, -1)}
                              className="p-1.5 bg-white hover:bg-slate-100 rounded border border-slate-300 transition-colors touch-manipulation"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quality, 1)}
                              disabled={item.quantity >= item.stock}
                              className="p-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed rounded border border-slate-300 transition-colors touch-manipulation"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeFromCart(item.id, item.quality)}
                            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
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
              <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium text-slate-700">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                <button
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
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

export default TCGSinglesShop;