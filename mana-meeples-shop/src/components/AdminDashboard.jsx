import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  DollarSign,
  AlertCircle,
  Edit,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  EyeOff
} from 'lucide-react';

// Use environment variable for API URL, fallback for development
const API_URL = process.env.REACT_APP_API_URL || 'https://mana-meeples-singles-market.onrender.com/api';

const AdminDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterPriceSource, setFilterPriceSource] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showInStock, setShowInStock] = useState(false);
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [editingItems, setEditingItems] = useState(new Map());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [currency, setCurrency] = useState({ symbol: '$', rate: 1.0, code: 'USD' });

  // Fetch inventory from API
  useEffect(() => {
    fetch(`${API_URL}/admin/inventory?limit=5000`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.inventory.map(card => ({
          id: card.inventory_id,
          sku: `${card.game_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.set_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.card_number}-${card.quality?.substring(0,2).toUpperCase() || 'NM'}`,
          card_name: card.name,
          game: card.game_name,
          set: card.set_name,
          number: card.card_number,
          quality: card.quality,
          price: parseFloat(card.price),
          stock: card.stock_quantity,
          image_url: card.image_url,
          low_stock_threshold: 3,
          price_source: card.price_source || 'api_scryfall',
          last_updated: card.updated_at || card.last_updated,
          card_id: card.id // Add card_id to group by
        }));
        setInventory(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading inventory:', err);
        setLoading(false);
      });
  }, []);

  // Group inventory by card (name, game, set, number)
  const groupedInventory = useMemo(() => {
    const groups = inventory.reduce((acc, item) => {
      const key = `${item.game}-${item.set}-${item.number}-${item.card_name}`;
      if (!acc[key]) {
        acc[key] = {
          card_name: item.card_name,
          game: item.game,
          set: item.set,
          number: item.number,
          image_url: item.image_url,
          qualities: [],
          totalValue: 0,
          totalStock: 0,
          hasLowStock: false,
          lastUpdated: item.last_updated
        };
      }

      acc[key].qualities.push(item);
      acc[key].totalValue += item.price * item.stock;
      acc[key].totalStock += item.stock;
      acc[key].hasLowStock = acc[key].hasLowStock || (item.stock > 0 && item.stock <= item.low_stock_threshold);

      // Keep the most recent update time
      if (item.last_updated && (!acc[key].lastUpdated || new Date(item.last_updated) > new Date(acc[key].lastUpdated))) {
        acc[key].lastUpdated = item.last_updated;
      }

      return acc;
    }, {});

    return Object.entries(groups).map(([key, group]) => ({
      ...group,
      key,
      qualities: group.qualities.sort((a, b) => {
        const qualityOrder = { 'Near Mint': 1, 'Lightly Played': 2, 'Moderately Played': 3, 'Heavily Played': 4, 'Damaged': 5 };
        return (qualityOrder[a.quality] || 999) - (qualityOrder[b.quality] || 999);
      })
    }));
  }, [inventory]);

  // Filter grouped inventory
  const filteredInventory = useMemo(() => {
    return groupedInventory.filter(group => {
      const matchesSearch =
        group.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.qualities.some(q => q.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesGame = filterGame === 'all' || group.game === filterGame;
      const matchesPriceSource = filterPriceSource === 'all' || group.qualities.some(q => q.price_source === filterPriceSource);
      const matchesLowStock = !showLowStock || group.hasLowStock;
      const matchesInStock = !showInStock || group.totalStock > 0;
      const matchesZeroStock = showZeroStock || group.totalStock > 0;

      return matchesSearch && matchesGame && matchesPriceSource && matchesLowStock && matchesInStock && matchesZeroStock;
    });
  }, [groupedInventory, searchTerm, filterGame, filterPriceSource, showLowStock, showInStock, showZeroStock]);

  // Calculate metrics
  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockCount = inventory.filter(item => item.stock <= item.low_stock_threshold && item.stock > 0).length;
  const totalItems = inventory.length;
  const inStockItems = inventory.filter(item => item.stock > 0).length;

  const updateItem = async (id, updates) => {
    try {
      await fetch(`${API_URL}/admin/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      setInventory(inventory.map(item =>
        item.id === id
          ? {
              ...item,
              ...updates,
              price: updates.price !== undefined ? parseFloat(updates.price) : item.price,
              stock: updates.stock_quantity !== undefined ? parseInt(updates.stock_quantity) : item.stock,
              price_source: updates.price !== undefined ? 'manual' : item.price_source,
              last_updated: new Date().toISOString()
            }
          : item
      ));

      return true;
    } catch (err) {
      console.error('Failed to update item:', err);
      return false;
    }
  };

  const toggleCardExpansion = (key) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCards(newExpanded);
  };

  const startEditing = (item) => {
    const newEditing = new Map(editingItems);
    newEditing.set(item.id, { ...item });
    setEditingItems(newEditing);
  };

  const cancelEditing = (id) => {
    const newEditing = new Map(editingItems);
    newEditing.delete(id);
    setEditingItems(newEditing);
  };

  const saveEditing = async (id) => {
    const editedItem = editingItems.get(id);
    const updates = {};

    if (editedItem.price !== inventory.find(i => i.id === id).price) {
      updates.price = editedItem.price;
    }
    if (editedItem.stock !== inventory.find(i => i.id === id).stock) {
      updates.stock_quantity = editedItem.stock;
    }

    if (Object.keys(updates).length > 0) {
      const success = await updateItem(id, updates);
      if (success) {
        cancelEditing(id);
      } else {
        alert('Failed to update item');
      }
    } else {
      cancelEditing(id);
    }
  };

  const updateEditingItem = (id, field, value) => {
    const newEditing = new Map(editingItems);
    const item = newEditing.get(id);
    if (item) {
      item[field] = value;
      newEditing.set(id, item);
      setEditingItems(newEditing);
    }
  };

  const refreshPrices = async () => {
    setLoading(true);
    try {
      // In production, this would call the price update API
      const response = await fetch(`${API_URL}/admin/refresh-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Reload inventory data
        window.location.reload();
      } else {
        throw new Error('Failed to refresh prices');
      }
    } catch (error) {
      console.error('Price refresh error:', error);
      alert('Price refresh is not available yet. This feature will be added in a future update.');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Quality', 'Price', 'Stock', 'Last Updated'].join(','),
      ...inventory.map(item => [
        item.sku,
        `"${item.card_name}"`,
        item.game,
        item.set,
        item.quality,
        item.price,
        item.stock,
        item.last_updated || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="text-sm text-slate-500">
                {filteredInventory.length} cards ({inventory.length} total items)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Toggle */}
              <button
                onClick={toggleCurrency}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                title="Toggle currency display"
              >
                <span className="text-slate-700">{currency.code}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-500">{currency.code === 'USD' ? 'NZD' : 'USD'}</span>
              </button>

              <button
                onClick={() => setBulkEditMode(!bulkEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  bulkEditMode
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {bulkEditMode ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                <span className="hidden sm:inline">{bulkEditMode ? 'Exit Bulk' : 'Bulk Edit'}</span>
              </button>
              <button
                onClick={refreshPrices}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Refresh prices from API"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh Prices</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Inventory Value</span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {currency.symbol}{(totalValue * currency.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {inStockItems} items in stock
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Low Stock Alerts</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {lowStockCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Items need restocking
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Unique Cards</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {groupedInventory.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalItems} total variations
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Showing</span>
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {filteredInventory.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Matching filters
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search by card name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Game
              </label>
              <select
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Games</option>
                <option value="Magic: The Gathering">Magic: The Gathering</option>
                <option value="Pokemon">Pokemon</option>
                <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Price Source
              </label>
              <select
                value={filterPriceSource}
                onChange={(e) => setFilterPriceSource(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="api_scryfall">Scryfall API</option>
                <option value="api_pokemon">Pokemon API</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInStock}
                  onChange={(e) => setShowInStock(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  In Stock Only
                </span>
              </label>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Low Stock Only
                </span>
              </label>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZeroStock}
                  onChange={(e) => setShowZeroStock(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Show Zero Stock
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-10">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Card</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Qualities</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInventory.map(group => {
                  const isExpanded = expandedCards.has(group.key);
                  const hasLowStock = group.hasLowStock;
                  const isZeroStock = group.totalStock === 0;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Main card row */}
                      <tr
                        className={`hover:bg-slate-50 cursor-pointer ${
                          hasLowStock ? 'bg-amber-50' : isZeroStock ? 'bg-slate-50' : ''
                        }`}
                        onClick={() => toggleCardExpansion(group.key)}
                      >
                        <td className="px-4 py-3 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <img
                            src={group.image_url}
                            alt={group.card_name}
                            className="w-12 h-16 object-contain rounded border border-slate-200"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect fill="%23cbd5e1" width="48" height="64"/%3E%3C/svg%3E';
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{group.card_name}</span>
                            <span className="text-xs text-slate-500">{group.game} • {group.set} #{group.number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-slate-900">
                            {currency.symbol}{(group.totalValue * currency.rate).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${
                            isZeroStock ? 'text-slate-400' : hasLowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                            {group.totalStock}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {group.qualities.map(quality => (
                              <span
                                key={quality.id}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  quality.stock === 0
                                    ? 'bg-slate-100 text-slate-500'
                                    : quality.stock <= quality.low_stock_threshold
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {quality.quality.substring(0, 2).toUpperCase()} ({quality.stock})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{formatDate(group.lastUpdated)}</span>
                        </td>
                      </tr>

                      {/* Expanded quality rows */}
                      {isExpanded && group.qualities.map(item => {
                        const isLowStock = item.stock <= item.low_stock_threshold && item.stock > 0;
                        const isEditing = editingItems.has(item.id);
                        const editedItem = editingItems.get(item.id);

                        return (
                          <tr key={item.id} className="bg-slate-50 border-l-4 border-l-blue-200">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <div className="w-8 h-10 bg-slate-200 rounded border border-slate-300 flex items-center justify-center">
                                <span className="text-xs text-slate-500 font-mono">
                                  {item.quality.substring(0,2).toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700">{item.quality}</span>
                                <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editedItem.price}
                                  onChange={(e) => updateEditingItem(item.id, 'price', parseFloat(e.target.value))}
                                  className="w-24 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-slate-900">{currency.symbol}{(item.price * currency.rate).toFixed(2)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editedItem.stock}
                                  onChange={(e) => updateEditingItem(item.id, 'stock', parseInt(e.target.value))}
                                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                                />
                              ) : (
                                <span className={`text-sm font-semibold ${
                                  item.stock === 0 ? 'text-slate-400' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {item.stock}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                item.price_source === 'manual'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.price_source === 'manual' ? 'Manual' : 'API'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveEditing(item.id);
                                    }}
                                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    title="Save changes"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelEditing(item.id);
                                    }}
                                    className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(item);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded"
                                  title="Edit item"
                                >
                                  <Edit className="w-4 h-4 text-slate-500" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No cards found</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Action Panel for Expanded Cards */}
        {expandedCards.size > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">
                {expandedCards.size} card{expandedCards.size !== 1 ? 's' : ''} expanded
              </span>
            </div>
            <button
              onClick={() => setExpandedCards(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <EyeOff className="w-4 h-4" />
              Collapse All
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;