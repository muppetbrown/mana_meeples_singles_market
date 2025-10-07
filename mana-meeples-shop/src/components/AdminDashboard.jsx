import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  AlertCircle,
  Edit,
  Download,
  RefreshCw,
  Search
} from 'lucide-react';

const API_URL = 'https://mana-meeples-singles-market.onrender.com/api';

const AdminDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterPriceSource, setFilterPriceSource] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showInStock, setShowInStock] = useState(false); // NEW
  const [editingItem, setEditingItem] = useState(null);

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
          last_updated: card.updated_at || card.last_updated // NEW
        }));
        setInventory(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading inventory:', err);
        setLoading(false);
      });
  }, []);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGame = filterGame === 'all' || item.game === filterGame;
      const matchesPriceSource = filterPriceSource === 'all' || item.price_source === filterPriceSource;
      const matchesLowStock = !showLowStock || item.stock <= item.low_stock_threshold;
      const matchesInStock = !showInStock || item.stock > 0; // NEW

      return matchesSearch && matchesGame && matchesPriceSource && matchesLowStock && matchesInStock;
    });
  }, [inventory, searchTerm, filterGame, filterPriceSource, showLowStock, showInStock]);

  // Calculate metrics
  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockCount = filteredInventory.filter(item => item.stock <= item.low_stock_threshold && item.stock > 0).length;
  const totalItems = inventory.length;
  const inStockItems = inventory.filter(item => item.stock > 0).length;

  const updatePrice = async (id, newPrice) => {
    try {
      await fetch(`${API_URL}/admin/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });
      
      setInventory(inventory.map(item => 
        item.id === id 
          ? { ...item, price: parseFloat(newPrice), price_source: 'manual', last_updated: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      alert('Failed to update price');
    }
  };

  const updateStock = async (id, newStock) => {
    try {
      await fetch(`${API_URL}/admin/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: parseInt(newStock) })
      });
      
      setInventory(inventory.map(item => 
        item.id === id 
          ? { ...item, stock: parseInt(newStock), last_updated: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  const refreshPrices = async () => {
    alert('Price refresh feature coming soon!');
  };

  const exportCSV = () => {
    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Quality', 'Price', 'Stock', 'Last Updated'].join(','),
      ...filteredInventory.map(item => [
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
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
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
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <span className="text-slate-600 text-sm font-medium">Total Inventory</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {totalItems}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All card variations
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Card</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Quality</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Update</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInventory.map(item => {
                  const isLowStock = item.stock <= item.low_stock_threshold && item.stock > 0;
                  const isEditing = editingItem?.id === item.id;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLowStock ? 'bg-amber-50' : item.stock === 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-2">
                        <img 
                          src={item.image_url} 
                          alt={item.card_name}
                          className="w-12 h-16 object-contain rounded border border-slate-200"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect fill="%23cbd5e1" width="48" height="64"/%3E%3C/svg%3E';
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">{item.card_name}</span>
                          <span className="text-xs text-slate-500">{item.game} • {item.set} #{item.number}</span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5">{item.sku}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{item.quality}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editingItem.price}
                            onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                            className="w-24 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-900">${item.price.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingItem.stock}
                            onChange={(e) => setEditingItem({ ...editingItem, stock: e.target.value })}
                            className="w-20 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                          />
                        ) : (
                          <span className={`text-sm font-semibold ${item.stock === 0 ? 'text-slate-400' : isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">{formatDate(item.last_updated)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                updatePrice(item.id, editingItem.price);
                                updateStock(item.id, editingItem.stock);
                                setEditingItem(null);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded mr-2"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="px-3 py-1 bg-slate-200 text-xs rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingItem({ ...item })}
                            className="p-2 hover:bg-slate-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No items found</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;