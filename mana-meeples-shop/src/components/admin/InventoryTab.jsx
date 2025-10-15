import React, { useState, useEffect, useCallback } from 'react';
import { Package, Edit, Save, X, RefreshCw, Search, Download } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * InventoryTab - Manage items IN STOCK
 * Shows only cards with stock_quantity > 0
 */
const InventoryTab = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [games, setGames] = useState([]);
  const [sets, setSets] = useState([]);
  const [editingItems, setEditingItems] = useState(new Map());
  const [selectedItems, setSelectedItems] = useState(new Set());

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGame !== 'all') params.append('game_id', filterGame);
      if (filterSet !== 'all') params.append('set_id', filterSet);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/admin/inventory?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch inventory');

      const data = await response.json();
      
      // CRITICAL: Filter to only show items WITH stock
      const inStock = (data.inventory || []).filter(item => item.stock_quantity > 0);
      setInventory(inStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [filterGame, filterSet, searchTerm]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch(`${API_URL}/games`);
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || data || []);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  useEffect(() => {
    if (filterGame !== 'all') {
      fetchSets(filterGame);
    } else {
      setSets([]);
    }
  }, [filterGame]);

  const fetchSets = async (gameId) => {
    try {
      const response = await fetch(`${API_URL}/games/${gameId}/sets`);
      if (response.ok) {
        const data = await response.json();
        setSets(data.sets || data || []);
      }
    } catch (error) {
      console.error('Error fetching sets:', error);
    }
  };

  const startEditing = (item) => {
    setEditingItems(prev => new Map(prev).set(item.id, {
      price: item.price,
      stock_quantity: item.stock_quantity
    }));
  };

  const cancelEditing = (itemId) => {
    setEditingItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  const saveItem = async (item) => {
    const editData = editingItems.get(item.id);
    if (!editData) return;

    try {
      const response = await fetch(`${API_URL}/admin/inventory/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (!response.ok) throw new Error('Failed to update');

      // Update local state
      setInventory(prev => prev.map(i => 
        i.id === item.id ? { ...i, ...editData } : i
      ).filter(i => i.stock_quantity > 0)); // Remove if stock becomes 0

      cancelEditing(item.id);
      console.log('✅ Updated successfully');
    } catch (error) {
      console.error('❌ Error updating:', error);
      alert('Failed to update item');
    }
  };

  const exportInventory = () => {
    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Quality', 'Foil', 'Stock', 'Price', 'Total Value'].join(','),
      ...inventory.map(item => [
        item.sku || '',
        `"${item.name || item.card_name}"`,
        item.game_name,
        item.set_name,
        item.quality,
        item.foil_type || 'Regular',
        item.stock_quantity,
        item.price,
        (item.stock_quantity * item.price).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalValue = inventory.reduce((sum, item) => 
    sum + (item.stock_quantity * item.price), 0
  );

  const totalStock = inventory.reduce((sum, item) => 
    sum + item.stock_quantity, 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-slate-600 mt-1">Managing {inventory.length} items in stock</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportInventory}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600">Items in Stock</div>
          <div className="text-2xl font-bold text-slate-900">{inventory.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600">Total Units</div>
          <div className="text-2xl font-bold text-slate-900">{totalStock}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600">Total Value</div>
          <div className="text-2xl font-bold text-slate-900">NZ${totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Games</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>

          <select
            value={filterSet}
            onChange={(e) => setFilterSet(e.target.value)}
            disabled={filterGame === 'all'}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          >
            <option value="all">All Sets</option>
            {sets.map(set => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Card</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Game/Set</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Quality</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Value</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inventory.map(item => {
                const isEditing = editingItems.has(item.id);
                const editData = editingItems.get(item.id);

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.name || item.card_name}</div>
                      <div className="text-sm text-slate-500">#{item.card_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{item.game_name}</div>
                      <div className="text-xs text-slate-500">{item.set_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{item.quality}</div>
                      <div className="text-xs text-slate-500">{item.foil_type || 'Regular'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.stock_quantity}
                          onChange={(e) => setEditingItems(prev => new Map(prev).set(item.id, {
                            ...editData,
                            stock_quantity: parseInt(e.target.value) || 0
                          }))}
                          className="w-20 px-2 py-1 border rounded text-right"
                        />
                      ) : (
                        <span className={`font-medium ${item.stock_quantity <= 3 ? 'text-orange-600' : 'text-slate-900'}`}>
                          {item.stock_quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editData.price}
                          onChange={(e) => setEditingItems(prev => new Map(prev).set(item.id, {
                            ...editData,
                            price: parseFloat(e.target.value) || 0
                          }))}
                          className="w-24 px-2 py-1 border rounded text-right"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">
                          NZ${item.price.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-900">
                        NZ${(item.stock_quantity * item.price).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveItem(item)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelEditing(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {inventory.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">No items in inventory</p>
          <p className="text-slate-400 text-sm mt-2">
            Go to "All Cards" tab to add items to inventory
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;