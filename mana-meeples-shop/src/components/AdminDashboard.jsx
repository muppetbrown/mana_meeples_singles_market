import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  DollarSign,
  AlertCircle,
  Edit,
  Download,
  Upload,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  EyeOff,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

// Use environment variable for API URL, fallback for development
const API_URL = process.env.REACT_APP_API_URL || 'https://mana-meeples-singles-market.onrender.com/api';

// Helper function to get admin authentication headers
const getAdminHeaders = () => {
  const username = process.env.REACT_APP_ADMIN_USERNAME || 'admin';
  const password = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';
  const credentials = btoa(`${username}:${password}`);

  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
};

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
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currency, setCurrency] = useState({ symbol: '$', rate: 1.0, code: 'USD' });
  const [showFoilModal, setShowFoilModal] = useState(false);
  const [foilModalCard, setFoilModalCard] = useState(null);
  const [foilFormData, setFoilFormData] = useState({
    foilType: 'Foil',
    quality: 'Near Mint',
    price: '',
    initialStock: 0
  });
  const [foilModalLoading, setFoilModalLoading] = useState(false);

  // CSV Import Modal State
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults, setCsvResults] = useState(null);
  const [csvStep, setCsvStep] = useState(1); // 1: Upload, 2: Preview/Map, 3: Results
  const [dragActive, setDragActive] = useState(false);

  // Fetch inventory from API with authentication
  useEffect(() => {
    fetch(`${API_URL}/admin/inventory?limit=5000`, {
      headers: getAdminHeaders()
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        const formatted = data.inventory.map(card => ({
          id: card.inventory_id,
          sku: `${card.game_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.set_code || card.set_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.card_number}-${card.quality?.substring(0,2).toUpperCase() || 'NM'}-${card.foil_type === 'Regular' || card.foil_type === 'Non-foil' ? 'NF' : 'F'}`,
          card_name: card.name,
          game: card.game_name,
          set: card.set_name,
          set_code: card.set_code,
          number: card.card_number,
          quality: card.quality,
          foil_type: card.foil_type || 'Regular',
          language: card.language || 'English',
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
        headers: getAdminHeaders(),
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

  const createFoil = async () => {
    if (!foilModalCard || !foilFormData.price || foilFormData.price <= 0) return;

    setFoilModalLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/create-foil`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          card_id: foilModalCard.card_id,
          quality: foilFormData.quality,
          foil_type: foilFormData.foilType,
          price: parseFloat(foilFormData.price),
          stock_quantity: parseInt(foilFormData.initialStock),
          language: 'English'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create foil');
      }

      const result = await response.json();

      // Show success message
      alert(`Success! Created ${foilFormData.foilType} version of ${foilModalCard.card_name}`);

      // Close modal and reset form
      setShowFoilModal(false);
      setFoilModalCard(null);
      setFoilFormData({
        foilType: 'Foil',
        quality: 'Near Mint',
        price: '',
        initialStock: 0
      });

      // Refresh inventory
      window.location.reload();

    } catch (error) {
      console.error('Error creating foil:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setFoilModalLoading(false);
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

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    const allVisibleIds = filteredInventory.map(item => item.id);
    setSelectedItems(new Set(allVisibleIds));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
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
      const response = await fetch(`${API_URL}/admin/refresh-prices`, {
        method: 'POST',
        headers: getAdminHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Price refresh completed!\n\nUpdated: ${result.updated} items\nTotal processed: ${result.total} MTG cards\n\n${result.errors?.length > 0 ? 'Errors: ' + result.errors.length : 'No errors'}`);

        // Reload inventory data
        window.location.reload();
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Failed to refresh prices');
      }
    } catch (error) {
      console.error('Price refresh error:', error);
      alert(`Price refresh failed: ${error.message}\n\nPlease check that you have MTG cards with Scryfall IDs in your inventory.`);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Set Code', 'Number', 'Quality', 'Foil Type', 'Language', 'Price', 'Stock', 'Price Source', 'Last Updated'].join(','),
      ...inventory.map(item => [
        item.sku,
        `"${item.card_name}"`,
        item.game,
        item.set,
        item.set_code || '',
        item.number || '',
        item.quality,
        item.foil_type || 'Regular',
        item.language || 'English',
        item.price,
        item.stock,
        item.price_source || '',
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

  // CSV Import Functions
  const resetCSVModal = () => {
    setCsvFile(null);
    setCsvPreview([]);
    setCsvMapping({});
    setCsvResults(null);
    setCsvStep(1);
    setCsvImporting(false);
    setDragActive(false);
  };

  const handleCSVUpload = (file) => {
    if (!file || file.type !== 'text/csv') {
      alert('Please select a valid CSV file.');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      });

      setCsvPreview(preview);

      // Auto-map common columns
      const defaultMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('sku')) defaultMapping.sku = header;
        else if (lowerHeader.includes('name')) defaultMapping.card_name = header;
        else if (lowerHeader.includes('price')) defaultMapping.price = header;
        else if (lowerHeader.includes('stock') || lowerHeader.includes('quantity')) defaultMapping.stock_quantity = header;
        else if (lowerHeader.includes('quality') || lowerHeader.includes('condition')) defaultMapping.quality = header;
        else if (lowerHeader.includes('foil')) defaultMapping.foil_type = header;
        else if (lowerHeader.includes('game')) defaultMapping.game = header;
        else if (lowerHeader.includes('set')) defaultMapping.set_name = header;
      });
      setCsvMapping(defaultMapping);
      setCsvStep(2);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleCSVUpload(files[0]);
    }
  };

  const validateCSVData = () => {
    const errors = [];
    const warnings = [];

    // Check required mappings
    if (!csvMapping.sku) errors.push('SKU column mapping is required');
    if (!csvMapping.card_name) errors.push('Card Name column mapping is required');
    if (!csvMapping.price) errors.push('Price column mapping is required');
    if (!csvMapping.stock_quantity) errors.push('Stock Quantity column mapping is required');

    // Validate data
    csvPreview.forEach((row, index) => {
      if (!row[csvMapping.sku]) errors.push(`Row ${index + 2}: SKU is missing`);
      if (!row[csvMapping.card_name]) errors.push(`Row ${index + 2}: Card name is missing`);

      const price = parseFloat(row[csvMapping.price]);
      if (isNaN(price) || price < 0) errors.push(`Row ${index + 2}: Invalid price`);

      const stock = parseInt(row[csvMapping.stock_quantity]);
      if (isNaN(stock) || stock < 0) warnings.push(`Row ${index + 2}: Invalid stock quantity`);
    });

    return { errors, warnings };
  };

  const importCSV = async () => {
    const validation = validateCSVData();
    if (validation.errors.length > 0) {
      alert('Please fix the following errors:\n' + validation.errors.join('\n'));
      return;
    }

    setCsvImporting(true);

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      formData.append('mapping', JSON.stringify(csvMapping));

      const response = await fetch(`${API_URL}/admin/csv-import`, {
        method: 'POST',
        headers: {
          'Authorization': getAdminHeaders()['Authorization']
          // Note: Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      setCsvResults(result);
      setCsvStep(3);

      // Refresh inventory after successful import
      if (result.success_count > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert(`CSV import failed: ${error.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const template = [
      ['SKU', 'Card Name', 'Game', 'Set Name', 'Quality', 'Price', 'Stock Quantity', 'Foil Type', 'Language'].join(','),
      ['MTG-LTR-001-NM', 'Lightning Bolt', 'Magic: The Gathering', 'The Lord of the Rings', 'Near Mint', '2.50', '10', 'Non-foil', 'English'].join(','),
      ['PKM-SVP-025-LP', 'Pikachu', 'Pokemon', 'Scarlet & Violet Promos', 'Lightly Played', '5.00', '3', 'Holo', 'English'].join(',')
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-import-template.csv';
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
          <div className="inline-block animate-spin motion-reduce:animate-none rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="text-sm text-slate-700">
                {filteredInventory.length} cards ({inventory.length} total items)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Toggle */}
              <button
                onClick={toggleCurrency}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none text-sm font-medium"
                aria-label={`Switch currency from ${currency.code} to ${currency.code === 'USD' ? 'NZD' : 'USD'}`}
              >
                <span className="text-slate-700">{currency.code}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-700">{currency.code === 'USD' ? 'NZD' : 'USD'}</span>
              </button>

              <button
                onClick={() => setBulkEditMode(!bulkEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-offset-2 focus:outline-none ${
                  bulkEditMode
                    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
                }`}
                aria-label={bulkEditMode ? 'Exit bulk edit mode' : 'Enter bulk edit mode'}
              >
                {bulkEditMode ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                <span className="hidden sm:inline">{bulkEditMode ? 'Exit Bulk' : 'Bulk Edit'}</span>
              </button>
              <button
                onClick={refreshPrices}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Refresh prices from API"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh Prices</span>
              </button>
              <button
                onClick={() => setShowCSVModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Import inventory data from CSV"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors motion-reduce:transition-none focus:ring-4 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Export inventory data to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <p className="text-xs text-slate-600 mt-1">
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
            <p className="text-xs text-slate-600 mt-1">
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
            <p className="text-xs text-slate-600 mt-1">
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
                                      ? 'bg-amber-50 text-amber-900'
                                      : 'bg-green-50 text-green-900'
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
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    item.foil_type === 'Regular' || item.foil_type === 'Non-foil'
                                      ? 'bg-slate-50 text-slate-900'
                                      : 'bg-yellow-50 text-yellow-900'
                                  }`}>
                                    {item.foil_type || 'Regular'}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    item.price_source === 'manual'
                                      ? 'bg-blue-50 text-blue-900'
                                      : item.price_source?.includes('scryfall')
                                        ? 'bg-purple-50 text-purple-900'
                                        : 'bg-gray-50 text-gray-900'
                                  }`}>
                                    {item.price_source === 'manual' ? 'Manual' :
                                     item.price_source?.includes('scryfall') ? 'Scryfall' : 'API'}
                                  </span>
                                </div>
                                {(item.foil_type === 'Regular' || item.foil_type === 'Non-foil') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFoilModalCard(item);
                                      setFoilFormData({
                                        foilType: 'Foil',
                                        quality: 'Near Mint',
                                        price: (item.price * 2.5).toFixed(2),
                                        initialStock: 0
                                      });
                                      setShowFoilModal(true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline text-left"
                                    title="Create foil version of this card"
                                  >
                                    + Add Foil
                                  </button>
                                )}
                                {item.language && item.language !== 'English' && (
                                  <span className="text-xs text-slate-500">
                                    {item.language}
                                  </span>
                                )}
                              </div>
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

        {/* Foil Creation Modal */}
        {showFoilModal && foilModalCard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Create Foil Version</h2>
                <button
                  onClick={() => {
                    setShowFoilModal(false);
                    setFoilModalCard(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <img
                    src={foilModalCard.image_url}
                    alt={foilModalCard.card_name}
                    className="w-12 h-16 object-contain rounded"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect fill="%23cbd5e1" width="48" height="64"/%3E%3C/svg%3E';
                    }}
                  />
                  <div>
                    <div className="font-medium text-slate-900">{foilModalCard.card_name}</div>
                    <div className="text-sm text-slate-500">{foilModalCard.game} • {foilModalCard.set}</div>
                    <div className="text-xs text-slate-400">Current: {foilModalCard.quality}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Foil Type
                  </label>
                  <select
                    value={foilFormData.foilType}
                    onChange={(e) => setFoilFormData({ ...foilFormData, foilType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    aria-describedby="foil-type-help"
                  >
                    <option value="Foil">Regular Foil</option>
                    <option value="Etched">Etched Foil</option>
                    <option value="Showcase">Showcase Foil</option>
                    <option value="Extended Art">Extended Art Foil</option>
                  </select>
                  <div id="foil-type-help" className="text-xs text-slate-500 mt-1">
                    Select the type of foil treatment for this card
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quality
                  </label>
                  <select
                    value={foilFormData.quality}
                    onChange={(e) => setFoilFormData({ ...foilFormData, quality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    aria-describedby="quality-help"
                  >
                    <option value="Near Mint">Near Mint</option>
                    <option value="Lightly Played">Lightly Played</option>
                    <option value="Moderately Played">Moderately Played</option>
                    <option value="Heavily Played">Heavily Played</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                  <div id="quality-help" className="text-xs text-slate-500 mt-1">
                    Select the condition of the foil card
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={foilFormData.price}
                    onChange={(e) => setFoilFormData({ ...foilFormData, price: e.target.value })}
                    placeholder={(foilModalCard.price * 2.5).toFixed(2)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    aria-describedby="price-help"
                    required
                  />
                  <div id="price-help" className="text-xs text-slate-500 mt-1">
                    Suggested: {currency.symbol}{(foilModalCard.price * 2.5).toFixed(2)} (2.5x regular price)
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={foilFormData.initialStock}
                    onChange={(e) => setFoilFormData({ ...foilFormData, initialStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    aria-describedby="stock-help"
                  />
                  <div id="stock-help" className="text-xs text-slate-500 mt-1">
                    Number of foil cards to add to inventory
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={createFoil}
                    disabled={foilModalLoading || !foilFormData.price || foilFormData.price <= 0}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    aria-label={`Create ${foilFormData.foilType} version of ${foilModalCard?.card_name} for $${foilFormData.price}`}
                  >
                    {foilModalLoading ? 'Creating...' : 'Create Foil Version'}
                  </button>
                  <button
                    onClick={() => {
                      setShowFoilModal(false);
                      setFoilModalCard(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showCSVModal && (
          <div className="fixed inset-0 bg-slate-500/75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    CSV Import - Step {csvStep} of 3
                  </h2>
                  <button
                    onClick={() => {
                      setShowCSVModal(false);
                      resetCSVModal();
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label="Close CSV import modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: File Upload */}
                {csvStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Upload CSV File</h3>
                      <p className="text-slate-600 mb-4">
                        Upload a CSV file containing your inventory data. Make sure your file includes columns for SKU, Card Name, Price, and Stock Quantity.
                      </p>
                    </div>

                    {/* Drag and Drop Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-slate-700">
                          Drop your CSV file here, or{' '}
                          <label className="text-blue-600 hover:text-blue-500 cursor-pointer underline">
                            browse
                            <input
                              type="file"
                              accept=".csv"
                              onChange={(e) => handleCSVUpload(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-sm text-slate-500">
                          Maximum file size: 10MB. Supported format: CSV only.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={downloadCSVTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </button>
                      <p className="text-sm text-slate-600">
                        Need help formatting your CSV? Download our template with example data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Preview and Column Mapping */}
                {csvStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Map CSV Columns</h3>
                      <p className="text-slate-600 mb-4">
                        Map your CSV columns to our database fields. Preview shows first 5 rows.
                      </p>
                    </div>

                    {/* Column Mapping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {Object.keys(csvPreview[0] || {}).map(csvColumn => (
                        <div key={csvColumn} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            CSV Column: <span className="font-semibold">{csvColumn}</span>
                          </label>
                          <select
                            value={Object.keys(csvMapping).find(key => csvMapping[key] === csvColumn) || ''}
                            onChange={(e) => {
                              const newMapping = { ...csvMapping };
                              // Remove old mapping if exists
                              Object.keys(newMapping).forEach(key => {
                                if (newMapping[key] === csvColumn) delete newMapping[key];
                              });
                              // Add new mapping if selected
                              if (e.target.value) newMapping[e.target.value] = csvColumn;
                              setCsvMapping(newMapping);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Don't import</option>
                            <option value="sku">SKU (Required)</option>
                            <option value="card_name">Card Name (Required)</option>
                            <option value="game">Game</option>
                            <option value="set_name">Set Name</option>
                            <option value="quality">Quality/Condition</option>
                            <option value="price">Price (Required)</option>
                            <option value="stock_quantity">Stock Quantity (Required)</option>
                            <option value="foil_type">Foil Type</option>
                            <option value="language">Language</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Data Preview */}
                    <div>
                      <h4 className="text-md font-medium text-slate-900 mb-3">Data Preview</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              {Object.keys(csvPreview[0] || {}).map(column => (
                                <th key={column} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {csvPreview.map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, colIndex) => (
                                  <td key={colIndex} className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                                    {value || <span className="text-slate-400 italic">empty</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCsvStep(1)}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={importCSV}
                        disabled={csvImporting || !csvMapping.sku || !csvMapping.card_name || !csvMapping.price || !csvMapping.stock_quantity}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                      >
                        {csvImporting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                            Importing...
                          </>
                        ) : (
                          'Import Data'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Results */}
                {csvStep === 3 && csvResults && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Import Results</h3>
                    </div>

                    {/* Success/Error Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-800">Successfully Imported</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900 mt-1">
                          {csvResults.success_count || 0}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                          <span className="text-sm font-medium text-yellow-800">Warnings</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-900 mt-1">
                          {csvResults.warning_count || 0}
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <XCircle className="w-5 h-5 text-red-600 mr-2" />
                          <span className="text-sm font-medium text-red-800">Errors</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900 mt-1">
                          {csvResults.error_count || 0}
                        </div>
                      </div>
                    </div>

                    {/* Error/Warning Details */}
                    {(csvResults.errors?.length > 0 || csvResults.warnings?.length > 0) && (
                      <div className="space-y-4">
                        {csvResults.errors?.length > 0 && (
                          <div>
                            <h4 className="text-md font-medium text-red-900 mb-2">Errors</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                              {csvResults.errors.map((error, index) => (
                                <div key={index} className="text-sm text-red-700">
                                  {error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {csvResults.warnings?.length > 0 && (
                          <div>
                            <h4 className="text-md font-medium text-yellow-900 mb-2">Warnings</h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                              {csvResults.warnings.map((warning, index) => (
                                <div key={index} className="text-sm text-yellow-700">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {csvResults.success_count > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm text-blue-800">
                            Import completed successfully! The inventory will refresh automatically in a few seconds.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowCSVModal(false);
                          resetCSVModal();
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;