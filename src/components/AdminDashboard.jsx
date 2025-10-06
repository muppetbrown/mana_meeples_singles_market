import React, { useState, useMemo } from 'react';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  X
} from 'lucide-react';

// Mock admin data
const MOCK_INVENTORY = [
  {
    id: 1,
    sku: 'MTG-BLB-215-NM',
    card_name: 'Ral, Monsoon Mage',
    game: 'Magic: The Gathering',
    set: 'Bloomburrow',
    number: '215',
    variation: 'Borderless',
    quality: 'Near Mint',
    cost: 18.50,
    price: 24.99,
    stock: 8,
    low_stock_threshold: 3,
    price_source: 'api_tcgplayer',
    last_updated: '2024-10-01T08:30:00',
    total_sold: 24
  },
  {
    id: 2,
    sku: 'POK-OBF-125-NM',
    card_name: 'Charizard ex',
    game: 'Pokemon',
    set: 'Obsidian Flames',
    number: '125',
    variation: 'Full Art',
    quality: 'Near Mint',
    cost: 65.00,
    price: 89.99,
    stock: 3,
    low_stock_threshold: 2,
    price_source: 'manual',
    last_updated: '2024-09-28T14:20:00',
    total_sold: 12
  },
  {
    id: 3,
    sku: 'YGO-PHNI-001-NM',
    card_name: 'Blue-Eyes White Dragon',
    game: 'Yu-Gi-Oh!',
    set: 'Phantom Nightmare',
    number: 'PHNI-EN001',
    variation: 'Ultra Rare',
    quality: 'Near Mint',
    cost: 10.50,
    price: 15.50,
    stock: 12,
    low_stock_threshold: 5,
    price_source: 'api_tcgplayer',
    last_updated: '2024-10-01T09:15:00',
    total_sold: 45
  }
];

const MOCK_STATS = {
  totalInventoryValue: 12450.50,
  lowStockItems: 8,
  totalItems: 1247,
  avgProfit: 28.5,
  weeklyRevenue: 3456.78,
  weeklyOrders: 89
};

const AdminDashboard = () => {
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterPriceSource, setFilterPriceSource] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.card_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGame = filterGame === 'all' || item.game === filterGame;
      const matchesPriceSource = filterPriceSource === 'all' || item.price_source === filterPriceSource;
      const matchesLowStock = !showLowStock || item.stock <= item.low_stock_threshold;

      return matchesSearch && matchesGame && matchesPriceSource && matchesLowStock;
    });
  }, [inventory, searchTerm, filterGame, filterPriceSource, showLowStock]);

  // Calculate metrics
  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockCount = filteredInventory.filter(item => item.stock <= item.low_stock_threshold).length;

  const updatePrice = (id, newPrice) => {
    setInventory(inventory.map(item => 
      item.id === id 
        ? { ...item, price: parseFloat(newPrice), price_source: 'manual' }
        : item
    ));
  };

  const updateStock = (id, newStock) => {
    setInventory(inventory.map(item => 
      item.id === id 
        ? { ...item, stock: parseInt(newStock) }
        : item
    ));
  };

  const deleteItem = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setInventory(inventory.filter(item => item.id !== id));
    }
  };

  const refreshPrices = async () => {
    // Simulate API call
    alert('Refreshing prices from TCGPlayer API...');
  };

  const exportCSV = () => {
    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Quality', 'Cost', 'Price', 'Stock', 'Profit Margin'].join(','),
      ...filteredInventory.map(item => [
        item.sku,
        item.card_name,
        item.game,
        item.set,
        item.quality,
        item.cost,
        item.price,
        item.stock,
        ((item.price - item.cost) / item.cost * 100).toFixed(1) + '%'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

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
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Card</span>
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
              ${MOCK_STATS.totalInventoryValue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {MOCK_STATS.totalItems} total items
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Low Stock Alerts</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {MOCK_STATS.lowStockItems}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Items need restocking
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Weekly Revenue</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ${MOCK_STATS.weeklyRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {MOCK_STATS.weeklyOrders} orders this week
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Avg Profit Margin</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {MOCK_STATS.avgProfit}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Across all inventory
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
                aria-label="Search inventory"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filter-game" className="block text-sm font-medium text-slate-700 mb-2">
                Game
              </label>
              <select
                id="filter-game"
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Games</option>
                <option value="Magic: The Gathering">Magic: The Gathering</option>
                <option value="Pokemon">Pokemon</option>
                <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
                <option value="Flesh and Blood">Flesh and Blood</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-source" className="block text-sm font-medium text-slate-700 mb-2">
                Price Source
              </label>
              <select
                id="filter-source"
                value={filterPriceSource}
                onChange={(e) => setFilterPriceSource(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="api_tcgplayer">TCGPlayer API</option>
                <option value="api_cardmarket">Card Market API</option>
              </select>
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
                  Show Low Stock Only
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing <strong>{filteredInventory.length}</strong> items
            </span>
            <span>
              Total Value: <strong className="text-blue-600">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Card Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInventory.map(item => {
                  const margin = ((item.price - item.cost) / item.cost * 100).toFixed(1);
                  const isLowStock = item.stock <= item.low_stock_threshold;
                  const isEditing = editingItem?.id === item.id;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-slate-900">{item.sku}</span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {item.price_source === 'manual' ? '🔧 Manual' : '🔄 API'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">{item.card_name}</span>
                          <span className="text-xs text-slate-500">
                            {item.game} • {item.set} #{item.number}
                          </span>
                          {item.variation && (
                            <span className="text-xs text-slate-400 mt-0.5">{item.variation}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{item.quality}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-slate-600">
                          ${item.cost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editingItem.price}
                            onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                            className="w-24 px-2 py-1 text-sm border border-slate-300 rounded text-right"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-900">
                            ${item.price.toFixed(2)}
                          </span>
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
                          <span className={`text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.stock}
                            {isLowStock && (
                              <AlertCircle className="inline-block w-4 h-4 ml-1" />
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${parseFloat(margin) >= 30 ? 'text-green-600' : parseFloat(margin) >= 15 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => {
                                  updatePrice(item.id, editingItem.price);
                                  updateStock(item.id, editingItem.stock);
                                  setEditingItem(null);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingItem({ ...item })}
                                className="p-2 hover:bg-slate-100 rounded transition-colors"
                                title="Edit item"
                              >
                                <Edit className="w-4 h-4 text-slate-600" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-2 hover:bg-red-50 rounded transition-colors"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Add Card Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-900">Add New Card</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SKU *
                    </label>
                    <input
                      type="text"
                      placeholder="MTG-BLB-001-NM"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Card Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Ral, Monsoon Mage"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Game *
                    </label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                      <option value="">Select a game</option>
                      <option value="Magic: The Gathering">Magic: The Gathering</option>
                      <option value="Pokemon">Pokemon</option>
                      <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
                      <option value="Flesh and Blood">Flesh and Blood</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Set *
                    </label>
                    <input
                      type="text"
                      placeholder="Bloomburrow"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="215"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Variation
                    </label>
                    <input
                      type="text"
                      placeholder="Borderless, Full Art, etc."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quality *
                    </label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                      <option value="Near Mint">Near Mint</option>
                      <option value="Lightly Played">Lightly Played</option>
                      <option value="Moderately Played">Moderately Played</option>
                      <option value="Heavily Played">Heavily Played</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cost *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="18.50"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="24.99"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      placeholder="3"
                      defaultValue="3"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Price Source
                    </label>
                    <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                      <option value="manual">Manual</option>
                      <option value="api_tcgplayer">TCGPlayer API</option>
                      <option value="api_cardmarket">Card Market API</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/card-image.jpg"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Add Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;