import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';

const API_URL = 'https://mana-meeples-singles-market.onrender.com/api';

const TCGShop = () => {
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedQualities, setSelectedQualities] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [gamesRes, cardsRes] = await Promise.all([
          fetch(`${API_URL}/games`),
          fetch(`${API_URL}/cards?limit=200`)
        ]);
        
        if (!gamesRes.ok || !cardsRes.ok) {
          throw new Error('API request failed');
        }
        
        const gamesData = await gamesRes.json();
        const cardsData = await cardsRes.json();
        
        // Group cards by base card (same card, different quality/variation)
        const groupedCards = {};
        cardsData.cards.forEach(item => {
          const key = `${item.game_name}-${item.set_name}-${item.card_number}`;
          
          if (!groupedCards[key]) {
            groupedCards[key] = {
              id: item.id,
              name: item.name,
              game_name: item.game_name,
              set_name: item.set_name,
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
            price: parseFloat(item.price),
            stock: item.stock_quantity
          });
        });
        
        setGames(gamesData);
        setCards(Object.values(groupedCards));
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load data. The API might be waking up. Please wait 30 seconds and try again.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGame = selectedGame === 'all' || card.game_name === selectedGame;
      return matchesSearch && matchesGame;
    });
  }, [cards, searchTerm, selectedGame]);

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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="search"
                placeholder="Search by card name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search cards"
              />
            </div>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              aria-label="Filter by game"
            >
              <option value="all">All Games</option>
              {games.map(game => (
                <option key={game.id} value={game.name}>{game.name}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mb-4 text-slate-600">
          <span className="font-medium">{filteredCards.length}</span> cards found
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredCards.map(card => {
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
                      Condition:
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
                          {variation.quality} ({variation.stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        ${selectedVariation?.price.toFixed(2)}
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      {selectedVariation?.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-slate-500 text-lg">No cards found</p>
          </div>
        )}
      </main>

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
                        <p className="text-sm font-bold text-blue-600 mb-3">${item.price.toFixed(2)}</p>
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
                  <span className="text-3xl font-bold text-blue-600">${cartTotal.toFixed(2)}</span>
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