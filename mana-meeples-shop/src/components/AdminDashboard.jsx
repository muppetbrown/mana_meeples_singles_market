import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Plus,
  ShoppingCart
} from 'lucide-react';

import CurrencySelector from './CurrencySelector';
import AdminOrders from './AdminOrders';
import AllCardsView from './AllCardsView';
import ErrorBoundary from './ErrorBoundary';
import { useToast } from './Toast';
import { API_URL } from '../config/api';

const getAdminHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          quality: parsed.quality || 'all',
          foilType: parsed.foilType || 'all',
          cardType: parsed.cardType || 'all',
          stockLevel: parsed.stockLevel || 'all',
          minPrice: parsed.minPrice || '',
          maxPrice: parsed.maxPrice || '',
          sortBy: parsed.sortBy || 'name',
          priceSource: parsed.priceSource || 'all',
          viewMode: parsed.viewMode || 'table'
        };
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    return {
      quality: 'all',
      foilType: 'all',
      cardType: 'all',
      stockLevel: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'name',
      priceSource: 'all',
      viewMode: 'table'
    };
  });
  const [availableSets, setAvailableSets] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    foilTypes: [],
    cardTypes: [],
    qualities: [],
    rarities: []
  });
  const [showAllCards, setShowAllCards] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [editingItems, setEditingItems] = useState(new Map());
  const [currency, setCurrency] = useState({ symbol: 'NZ$', rate: 1.0, code: 'NZD' });
  const [showFoilModal, setShowFoilModal] = useState(false);
  const [foilModalCard, setFoilModalCard] = useState(null);
  const [foilFormData, setFoilFormData] = useState({
    foilType: 'Foil',
    quality: 'Near Mint',
    price: '',
    initialStock: 0
  });
  const [foilModalLoading, setFoilModalLoading] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults, setCsvResults] = useState(null);
  const [csvStep, setCsvStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkOperation, setBulkOperation] = useState(null);
  const [quickActionState, setQuickActionState] = useState('idle'); // idle, loading, success, error
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // References for keyboard shortcuts
  const searchInputRef = React.useRef(null);


  // ✅ FIXED: Authentication and inventory fetch in single useEffect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/admin/auth/check`, {
          credentials: 'include',
          headers: getAdminHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated) {
            setIsAuthenticated(true);
            
            try {
              setLoading(true);
              
              const inventoryResponse = await fetch(`${API_URL}/admin/inventory?limit=5000`, {
                credentials: 'include',
                headers: getAdminHeaders()
              });

              if (!inventoryResponse.ok) {
                throw new Error(`HTTP ${inventoryResponse.status}: ${inventoryResponse.statusText}`);
              }

              const inventoryData = await inventoryResponse.json();
              const inventoryArray = Array.isArray(inventoryData) ? inventoryData : (inventoryData.inventory || []);
              
              const formatted = inventoryArray.map(card => ({
                id: card.inventory_id || card.id,
                sku: `${card.game_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.set_code || card.set_name?.substring(0,3).toUpperCase() || 'UNK'}-${card.card_number || '000'}-${card.quality?.substring(0,2).toUpperCase() || 'NM'}-${card.foil_type === 'Regular' || card.foil_type === 'Non-foil' ? 'NF' : 'F'}`,
                card_name: card.name || card.card_name,
                card_type: card.card_type,
                game: card.game_name,
                set: card.set_name,
                set_code: card.set_code,
                number: card.card_number,
                quality: card.quality,
                foil_type: card.foil_type || 'Regular',
                language: card.language || 'English',
                price: parseFloat(card.price || 0),
                stock: card.stock_quantity || 0,
                image_url: card.image_url,
                low_stock_threshold: 3,
                price_source: card.price_source || 'api_scryfall',
                last_updated: card.updated_at || card.last_updated,
                card_id: card.card_id || card.id
              }));
              
              setInventory(formatted);
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Loaded inventory:', formatted.length, 'items');
              }

            } catch (err) {
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ Error loading inventory:', err);
              }
            } finally {
              setLoading(false);
            }
          } else {
            navigate('/admin/login');
          }
        } else {
          navigate('/admin/login');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Auth check failed:', error);
        }
        navigate('/admin/login');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Fetch available sets and filter options when game changes
  useEffect(() => {
    const fetchGameData = async () => {
      if (filterGame === 'all') {
        setAvailableSets([]);
        setFilterOptions({ foilTypes: [], cardTypes: [], qualities: [], rarities: [] });
        return;
      }

      try {
        const gameId = getGameIdFromName(filterGame);
        if (!gameId) return;

        // Fetch sets and filter options in parallel
        const [setsResponse, filterOptionsResponse] = await Promise.all([
          fetch(`${API_URL}/sets?game_id=${gameId}`, {
            headers: getAdminHeaders()
          }),
          fetch(`${API_URL}/filter-options?game_id=${gameId}`, {
            headers: getAdminHeaders()
          })
        ]);

        // Handle sets response
        if (setsResponse.ok) {
          const sets = await setsResponse.json();
          setAvailableSets(sets);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch sets');
          }
          setAvailableSets([]);
        }

        // Handle filter options response
        if (filterOptionsResponse.ok) {
          const options = await filterOptionsResponse.json();
          setFilterOptions({
            foilTypes: options.foilTypes || [],
            cardTypes: options.cardTypes || [],
            qualities: options.qualities || [],
            rarities: options.rarities || []
          });
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch filter options');
          }
          setFilterOptions({ foilTypes: [], cardTypes: [], qualities: [], rarities: [] });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching game data:', error);
        }
        setAvailableSets([]);
        setFilterOptions({ foilTypes: [], cardTypes: [], qualities: [], rarities: [] });
      }
    };

    fetchGameData();
    setFilterSet('all'); // Reset set filter when game changes
    setFilters(prev => ({ ...prev, cardType: 'all', foilType: 'all' })); // Reset type filters
  }, [filterGame]);

  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('admin_filters', JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [filters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle shortcuts when not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'f': // Ctrl/Cmd + F: Focus search
            e.preventDefault();
            searchInputRef.current?.focus();
            toast.info('Search focused');
            break;
          case 'e': // Ctrl/Cmd + E: Export
            e.preventDefault();
            exportFilteredResults();
            break;
          case 'r': // Ctrl/Cmd + R: Refresh
            e.preventDefault();
            window.location.reload();
            break;
          default:
            break;
        }
      }

      // ESC key to clear search
      if (e.key === 'Escape' && searchTerm) {
        e.preventDefault();
        setSearchTerm('');
        toast.info('Search cleared');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchTerm, toast]);

  // Helper function to get game ID from name
  const getGameIdFromName = (gameName) => {
    const gameMap = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    return gameMap[gameName] || null;
  };

  const groupedInventory = useMemo(() => {
    const groups = inventory.reduce((acc, item) => {
      const key = `${item.game}-${item.set}-${item.number}-${item.card_name}`;
      if (!acc[key]) {
        acc[key] = {
          card_name: item.card_name,
          card_type: item.card_type,
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

      if (item.last_updated && (!acc[key].lastUpdated || new Date(item.last_updated) > new Date(acc[key].lastUpdated))) {
        acc[key].lastUpdated = item.last_updated;
      }

      return acc;
    }, {});

    return Object.entries(groups).map(([key, group]) => {
      const allQualities = group.qualities.sort((a, b) => {
        const qualityOrder = { 'Near Mint': 1, 'Lightly Played': 2, 'Moderately Played': 3, 'Heavily Played': 4, 'Damaged': 5 };
        return (qualityOrder[a.quality] || 999) - (qualityOrder[b.quality] || 999);
      });

      const filteredQualities = showAllCards
        ? allQualities
        : allQualities.filter(quality => quality.stock > 0);

      // Always calculate totals from ALL qualities to show true stock
      const totalValue = group.qualities.reduce((sum, quality) => sum + (quality.price * quality.stock), 0);
      const totalStock = group.qualities.reduce((sum, quality) => sum + quality.stock, 0);
      const hasLowStock = group.qualities.some(quality => quality.stock > 0 && quality.stock <= quality.low_stock_threshold);

      return {
        ...group,
        key,
        qualities: allQualities, // Keep all qualities for expanded view
        visibleQualities: filteredQualities, // Only for badge display
        totalValue,
        totalStock,
        hasLowStock
      };
    }); // Always show cards, even with zero stock
  }, [inventory, showAllCards]);

  const filteredInventory = useMemo(() => {
    let filtered = groupedInventory.filter(group => {
      // Enhanced search - includes rarity and more fields
      const matchesSearch =
        group.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.qualities.some(q =>
          q.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.quality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.foil_type?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        group.set?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.game?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGame = filterGame === 'all' || group.game === filterGame;
      const matchesSet = filterSet === 'all' || group.set === filterSet;

      // Quality filter
      const matchesQuality = filters.quality === 'all' ||
        group.qualities.some(q => q.quality === filters.quality);

      // Foil type filter
      const matchesFoilType = filters.foilType === 'all' ||
        group.qualities.some(q => {
          const foilType = q.foil_type || 'Regular';
          return foilType === filters.foilType;
        });

      // Card type filter
      const matchesCardType = filters.cardType === 'all' ||
        (group.card_type && group.card_type === filters.cardType);

      // Stock level filter
      const matchesStockLevel = filters.stockLevel === 'all' || (() => {
        switch (filters.stockLevel) {
          case 'instock': return group.totalStock > 0;
          case 'lowstock': return group.totalStock > 0 && group.totalStock <= 3;
          case 'outofstock': return group.totalStock === 0;
          case 'overstock': return group.totalStock > 20;
          default: return true;
        }
      })();

      // Price range filter
      const matchesPriceRange = (() => {
        const minPrice = parseFloat(filters.minPrice) || 0;
        const maxPrice = parseFloat(filters.maxPrice) || Infinity;
        return group.qualities.some(q => {
          const price = q.price || 0;
          return price >= minPrice && price <= maxPrice;
        });
      })();

      // Price source filter
      const matchesPriceSource = filters.priceSource === 'all' ||
        group.qualities.some(q => {
          if (filters.priceSource === 'manual') return q.price_source === 'manual';
          if (filters.priceSource === 'api_scryfall') return q.price_source?.includes('scryfall');
          if (filters.priceSource === 'api') return q.price_source && !q.price_source.includes('scryfall') && q.price_source !== 'manual';
          return true;
        });

      // Show only cards with inventory by default, unless "show all cards" is enabled
      const matchesInventory = showAllCards || group.totalStock > 0;

      return matchesSearch && matchesGame && matchesSet && matchesQuality &&
             matchesFoilType && matchesCardType && matchesStockLevel && matchesPriceRange &&
             matchesPriceSource && matchesInventory;
    });

    // Apply sorting
    const sortBy = filters.sortBy || 'name';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.card_name?.localeCompare(b.card_name || '') || 0;
        case 'game':
          return a.game?.localeCompare(b.game || '') || 0;
        case 'set':
          return a.set?.localeCompare(b.set || '') || 0;
        case 'price_asc':
          return (a.qualities[0]?.price || 0) - (b.qualities[0]?.price || 0);
        case 'price_desc':
          return (b.qualities[0]?.price || 0) - (a.qualities[0]?.price || 0);
        case 'stock_asc':
          return a.totalStock - b.totalStock;
        case 'stock_desc':
          return b.totalStock - a.totalStock;
        case 'quality':
          const qualityOrder = { 'Near Mint': 1, 'Lightly Played': 2, 'Moderately Played': 3, 'Heavily Played': 4, 'Damaged': 5 };
          return (qualityOrder[a.qualities[0]?.quality] || 999) - (qualityOrder[b.qualities[0]?.quality] || 999);
        case 'updated':
          return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
        case 'value_desc':
          return b.totalValue - a.totalValue;
        default:
          return a.card_name?.localeCompare(b.card_name || '') || 0;
      }
    });

    return filtered;
  }, [groupedInventory, searchTerm, filterGame, filterSet, filters, showAllCards]);

  const totalValue = useMemo(() => 
    inventory.reduce((sum, item) => sum + (item.price * item.stock), 0),
    [inventory]
  );
  
  const lowStockCount = useMemo(() => 
    inventory.filter(item => item.stock <= item.low_stock_threshold && item.stock > 0).length,
    [inventory]
  );
  
  const totalItems = inventory.length;
  const inStockItems = useMemo(() => 
    inventory.filter(item => item.stock > 0).length,
    [inventory]
  );

  const updateItem = useCallback(async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/admin/inventory/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAdminHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      setInventory(prev => prev.map(item =>
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update item:', err);
      }
      return false;
    }
  }, []);

  const createInventoryVariation = async () => {
    if (!foilModalCard || !foilFormData.price || foilFormData.price <= 0) return;

    setFoilModalLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/create-foil`, {
        method: 'POST',
        credentials: 'include',
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
        throw new Error(error || 'Failed to create inventory variation');
      }

      alert(`Success! Created ${foilFormData.quality} ${foilFormData.foilType} version of ${foilModalCard.card_name}`);

      setShowFoilModal(false);
      setFoilModalCard(null);
      setFoilFormData({
        foilType: 'Regular',
        quality: 'Near Mint',
        price: '',
        initialStock: 1
      });

      window.location.reload();

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating inventory variation:', error);
      }
      alert(`Error: ${error.message}`);
    } finally {
      setFoilModalLoading(false);
    }
  };

  const toggleCardExpansion = useCallback((key) => {
    setExpandedCards(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  }, []);

  const startEditing = useCallback((item) => {
    setEditingItems(prev => {
      const newEditing = new Map(prev);
      newEditing.set(item.id, { ...item });
      return newEditing;
    });
  }, []);

  const cancelEditing = useCallback((id) => {
    setEditingItems(prev => {
      const newEditing = new Map(prev);
      newEditing.delete(id);
      return newEditing;
    });
  }, []);

  const saveEditing = useCallback(async (id) => {
    const editedItem = editingItems.get(id);
    const originalItem = inventory.find(i => i.id === id);
    const updates = {};

    if (editedItem.price !== originalItem.price) {
      updates.price = editedItem.price;
    }
    if (editedItem.stock !== originalItem.stock) {
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
  }, [editingItems, inventory, updateItem, cancelEditing]);

  const updateEditingItem = useCallback((id, field, value) => {
    setEditingItems(prev => {
      const newEditing = new Map(prev);
      const item = newEditing.get(id);
      if (item) {
        item[field] = value;
        newEditing.set(id, item);
      }
      return newEditing;
    });
  }, []);

  const refreshPrices = async () => {
    setLoading(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Starting price refresh...');
      }
      const response = await fetch(`${API_URL}/admin/refresh-prices`, {
        method: 'POST',
        credentials: 'include',
        headers: getAdminHeaders()
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Price refresh response status:', response.status);
      }

      if (response.ok) {
        const result = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Price refresh completed:', result);
        }

        const errorDetails = result.errors?.length > 0
          ? `\n\nErrors (${result.errors.length}):\n${result.errors.slice(0, 3).join('\n')}${result.errors.length > 3 ? '\n...' : ''}`
          : '\n\nNo errors occurred.';

        alert(`Price refresh completed!\n\nUpdated: ${result.updated} items\nTotal processed: ${result.total} MTG cards${errorDetails}`);
        window.location.reload();
      } else {
        const error = await response.json().catch(() => ({ details: `HTTP ${response.status}: ${response.statusText}` }));
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Price refresh API error:', error);
        }
        throw new Error(error.details || error.error || 'Failed to refresh prices');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Price refresh error:', error);
      }

      // Provide more helpful error messages
      let errorMessage = 'Price refresh failed: ';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Network connection failed. Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage += 'Authentication failed. Please try logging in again.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }

      alert(errorMessage);
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
    window.URL.revokeObjectURL(url);
  };

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

  const importCSV = async () => {
    if (!csvMapping.sku || !csvMapping.card_name || !csvMapping.price || !csvMapping.stock_quantity) {
      alert('Please map all required fields');
      return;
    }

    setCsvImporting(true);

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      formData.append('mapping', JSON.stringify(csvMapping));

      const response = await fetch(`${API_URL}/admin/csv-import`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      setCsvResults(result);
      setCsvStep(3);

      if (result.success_count > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('CSV import error:', error);
      }
      alert(`CSV import failed: ${error.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const template = [
      ['SKU', 'Card Name', 'Game', 'Set Name', 'Quality', 'Price', 'Stock Quantity', 'Foil Type', 'Language'].join(','),
      ['MTG-LTR-001-NM', 'Lightning Bolt', 'Magic: The Gathering', 'The Lord of the Rings', 'Near Mint', '2.50', '10', 'Non-foil', 'English'].join(',')
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Bulk Operations Functions
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      const allIds = new Set();
      filteredInventory.forEach(group => {
        group.qualities.forEach(item => {
          allIds.add(item.id);
        });
      });
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredInventory]);

  const handleItemSelect = useCallback((itemId, checked) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  const executeBulkOperation = async (operation, data = {}) => {
    if (selectedItems.size === 0) return;

    setQuickActionState('loading');
    try {
      const selectedItemsArray = Array.from(selectedItems);

      const response = await fetch(`${API_URL}/admin/bulk-operation`, {
        method: 'POST',
        credentials: 'include',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          operation,
          itemIds: selectedItemsArray,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`Bulk operation failed: ${response.statusText}`);
      }

      const result = await response.json();
      setQuickActionState('success');

      // Refresh inventory after bulk operation
      window.location.reload();

      // Clear selections
      setSelectedItems(new Set());
      setBulkOperation(null);

      alert(`Bulk operation completed! Updated ${result.updated} items.`);
    } catch (error) {
      setQuickActionState('error');
      console.error('Bulk operation error:', error);
      alert(`Bulk operation failed: ${error.message}`);
    } finally {
      setTimeout(() => setQuickActionState('idle'), 3000);
    }
  };

  // Export filtered results
  const exportFilteredResults = () => {
    const currentResults = [];

    filteredInventory.forEach(group => {
      group.qualities.forEach(item => {
        currentResults.push([
          item.sku,
          `"${group.card_name}"`,
          group.game,
          group.set,
          item.set_code || '',
          item.number || '',
          item.quality,
          item.foil_type || 'Regular',
          item.language || 'English',
          item.price,
          item.stock,
          item.price_source || '',
          item.last_updated || ''
        ].join(','));
      });
    });

    const csv = [
      ['SKU', 'Name', 'Game', 'Set', 'Set Code', 'Number', 'Quality', 'Foil Type', 'Language', 'Price', 'Stock', 'Price Source', 'Last Updated'].join(','),
      ...currentResults
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Quick analytics calculation
  const analyticsData = useMemo(() => {
    const analytics = {
      totalUniqueCards: filteredInventory.length,
      totalVariations: filteredInventory.reduce((sum, group) => sum + group.qualities.length, 0),
      totalValue: filteredInventory.reduce((sum, group) => sum + group.totalValue, 0),
      totalStock: filteredInventory.reduce((sum, group) => sum + group.totalStock, 0),
      lowStockItems: filteredInventory.filter(group => group.hasLowStock).length,
      outOfStockItems: filteredInventory.filter(group => group.totalStock === 0).length,
      gameBreakdown: {},
      qualityBreakdown: {},
      foilBreakdown: {},
      priceSourceBreakdown: {}
    };

    filteredInventory.forEach(group => {
      // Game breakdown
      analytics.gameBreakdown[group.game] = (analytics.gameBreakdown[group.game] || 0) + 1;

      group.qualities.forEach(item => {
        // Quality breakdown
        analytics.qualityBreakdown[item.quality] = (analytics.qualityBreakdown[item.quality] || 0) + 1;

        // Foil breakdown
        const foilType = item.foil_type || 'Regular';
        analytics.foilBreakdown[foilType] = (analytics.foilBreakdown[foilType] || 0) + 1;

        // Price source breakdown
        const source = item.price_source === 'manual' ? 'Manual' :
                       item.price_source?.includes('scryfall') ? 'Scryfall' : 'API';
        analytics.priceSourceBreakdown[source] = (analytics.priceSourceBreakdown[source] || 0) + 1;
      });
    });

    return analytics;
  }, [filteredInventory]);

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
  };

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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-12 w-12 text-blue-600" />
          <p className="mt-4 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-12 w-12 text-blue-600" />
          <p className="mt-4 text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {filteredInventory.length} cards ({inventory.length} total)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CurrencySelector
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                className="flex-shrink-0"
              />

              <button
                onClick={refreshPrices}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Refresh prices from API"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={() => setShowCSVModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Import CSV"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                aria-label="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } transition-colors`}
            >
              <Package className="w-4 h-4" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } transition-colors`}
            >
              <ShoppingCart className="w-4 h-4" />
              Orders
            </button>
            <button
              onClick={() => setActiveTab('all-cards')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all-cards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } transition-colors`}
            >
              <Package className="w-4 h-4" />
              All Cards
            </button>
          </nav>
        </div>
      </div>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <>
            {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Inventory Value</span>
              <DollarSign className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {currency.symbol}{(totalValue * currency.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {inStockItems} items in stock
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Low Stock Alerts</span>
              <AlertCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {lowStockCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Items need restocking
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Unique Cards</span>
              <Package className="w-5 h-5 text-purple-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {groupedInventory.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalItems} total variations
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Filtered View</span>
              <Package className="w-5 h-5 text-green-600" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {filteredInventory.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Matching filters
            </p>
          </div>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {selectedItems.size > 0 && `${selectedItems.size} items selected`}
                  </span>
                  {quickActionState === 'loading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                  {quickActionState === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {quickActionState === 'error' && (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={exportFilteredResults}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <Download className="w-4 h-4" />
                  Export Filtered
                </button>

                <button
                  onClick={refreshPrices}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Prices
                </button>

                {selectedItems.size > 0 && (
                  <>
                    <div className="w-px h-6 bg-slate-300"></div>
                    <span className="text-sm font-medium text-slate-700">Bulk Actions:</span>

                    <button
                      onClick={() => setBulkOperation('updatePrices')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                      <DollarSign className="w-4 h-4" />
                      Update Prices
                    </button>

                    <button
                      onClick={() => setBulkOperation('updateStock')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    >
                      <Package className="w-4 h-4" />
                      Update Stock
                    </button>

                    <button
                      onClick={() => setBulkOperation('changeQuality')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <Edit className="w-4 h-4" />
                      Change Quality
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedItems.size} selected items? This cannot be undone.`)) {
                          executeBulkOperation('delete');
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                      Delete Selected
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-600 space-y-1">
                <div>Viewing: <span className="font-medium text-slate-800">{analyticsData.totalUniqueCards}</span> cards</div>
                <div>Total Value: <span className="font-medium text-slate-800">{currency.symbol}{(analyticsData.totalValue * currency.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {Object.keys(analyticsData.gameBreakdown).length > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-6 mb-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Analytics Overview</h3>
              <span className="text-sm text-slate-500">Based on current filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm text-slate-600">Total Cards</div>
                <div className="text-2xl font-bold text-slate-900">{analyticsData.totalUniqueCards}</div>
                <div className="text-xs text-slate-500">{analyticsData.totalVariations} variations</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-700">Total Stock</div>
                <div className="text-2xl font-bold text-green-900">{analyticsData.totalStock}</div>
                <div className="text-xs text-green-600">units available</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-sm text-amber-700">Low Stock</div>
                <div className="text-2xl font-bold text-amber-900">{analyticsData.lowStockItems}</div>
                <div className="text-xs text-amber-600">items need restocking</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm text-red-700">Out of Stock</div>
                <div className="text-2xl font-bold text-red-900">{analyticsData.outOfStockItems}</div>
                <div className="text-xs text-red-600">items unavailable</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Game Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">By Game</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.gameBreakdown).map(([game, count]) => (
                    <div key={game} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">{game}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">By Quality</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.qualityBreakdown).map(([quality, count]) => (
                    <div key={quality} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">{quality}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Source Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">By Price Source</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.priceSourceBreakdown).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">{source}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Operation Modals */}
        {bulkOperation && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {bulkOperation === 'updatePrices' && 'Bulk Update Prices'}
                {bulkOperation === 'updateStock' && 'Bulk Update Stock'}
                {bulkOperation === 'changeQuality' && 'Bulk Change Quality'}
              </h3>

              {bulkOperation === 'updatePrices' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Update prices for {selectedItems.size} selected items</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Price Adjustment</label>
                    <div className="flex gap-2">
                      <select
                        id="price-operation"
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        defaultValue="multiply"
                      >
                        <option value="set">Set to</option>
                        <option value="multiply">Multiply by</option>
                        <option value="add">Add</option>
                        <option value="subtract">Subtract</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="1.0"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        id="price-value"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const operation = document.getElementById('price-operation').value;
                        const value = parseFloat(document.getElementById('price-value').value);
                        if (value && value > 0) {
                          executeBulkOperation('updatePrices', { operation, value });
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                    >
                      Update Prices
                    </button>
                    <button
                      onClick={() => setBulkOperation(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {bulkOperation === 'updateStock' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Update stock for {selectedItems.size} selected items</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Stock Adjustment</label>
                    <div className="flex gap-2">
                      <select
                        id="stock-operation"
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                        defaultValue="set"
                      >
                        <option value="set">Set to</option>
                        <option value="add">Add</option>
                        <option value="subtract">Subtract</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        id="stock-value"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const operation = document.getElementById('stock-operation').value;
                        const value = parseInt(document.getElementById('stock-value').value);
                        if (value >= 0) {
                          executeBulkOperation('updateStock', { operation, value });
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                    >
                      Update Stock
                    </button>
                    <button
                      onClick={() => setBulkOperation(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {bulkOperation === 'changeQuality' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Change quality for {selectedItems.size} selected items</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Quality</label>
                    <select
                      id="quality-value"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Near Mint">Near Mint</option>
                      <option value="Lightly Played">Lightly Played</option>
                      <option value="Moderately Played">Moderately Played</option>
                      <option value="Heavily Played">Heavily Played</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const quality = document.getElementById('quality-value').value;
                        executeBulkOperation('changeQuality', { quality });
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                    >
                      Change Quality
                    </button>
                    <button
                      onClick={() => setBulkOperation(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Filters & Search - Positioned at Top */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-6 border border-slate-200 shadow-sm">
          {/* Search Bar - Full Width at Top */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden="true" />
                <label htmlFor="search-inventory" className="sr-only">Search inventory</label>
                <input
                  id="search-inventory"
                  type="search"
                  placeholder="Search by card name, SKU, set, or rarity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-base"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllCards(prev => !prev)}
                  className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
                    showAllCards
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {showAllCards ? 'All Cards' : 'In Stock Only'}
                  </span>
                </button>
                <select
                  value={filters.viewMode || 'table'}
                  onChange={(e) => setFilters(prev => ({ ...prev, viewMode: e.target.value }))}
                  className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  aria-label="Change view mode"
                >
                  <option value="table">Table View</option>
                  <option value="grid">Grid View</option>
                  <option value="compact">Compact List</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-6">
            <div>
              <label htmlFor="filter-game" className="block text-sm font-medium text-slate-700 mb-2">
                Game
              </label>
              <select
                id="filter-game"
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Games</option>
                <option value="Magic: The Gathering">Magic: The Gathering</option>
                <option value="Pokemon">Pokemon</option>
                <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-set" className="block text-sm font-medium text-slate-700 mb-2">
                Set
              </label>
              <select
                id="filter-set"
                value={filterSet}
                onChange={(e) => setFilterSet(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                disabled={filterGame === 'all'}
              >
                <option value="all">All Sets</option>
                {availableSets.map(set => (
                  <option key={set.id} value={set.name}>{set.name}</option>
                ))}
              </select>
              {filterGame === 'all' && (
                <p className="text-xs text-slate-500 mt-1">Select a game first</p>
              )}
            </div>

            <div>
              <label htmlFor="filter-quality" className="block text-sm font-medium text-slate-700 mb-2">
                Quality/Condition
              </label>
              <select
                id="filter-quality"
                value={filters.quality || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, quality: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Conditions</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Lightly Played">Lightly Played</option>
                <option value="Moderately Played">Moderately Played</option>
                <option value="Heavily Played">Heavily Played</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-foil" className="block text-sm font-medium text-slate-700 mb-2">
                Foil Type
              </label>
              <select
                id="filter-foil"
                value={filters.foilType || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, foilType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                disabled={filterGame === 'all'}
              >
                <option value="all">All Types</option>
                {filterOptions.foilTypes.map(foilType => (
                  <option key={foilType} value={foilType}>{foilType}</option>
                ))}
              </select>
              {filterGame === 'all' && (
                <p className="text-xs text-slate-500 mt-1">Select a game first</p>
              )}
            </div>

            <div>
              <label htmlFor="filter-card-type" className="block text-sm font-medium text-slate-700 mb-2">
                Card Type
              </label>
              <select
                id="filter-card-type"
                value={filters.cardType || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, cardType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                disabled={filterGame === 'all'}
              >
                <option value="all">All Types</option>
                {filterOptions.cardTypes.map(cardType => (
                  <option key={cardType} value={cardType}>{cardType}</option>
                ))}
              </select>
              {filterGame === 'all' && (
                <p className="text-xs text-slate-500 mt-1">Select a game first</p>
              )}
            </div>

            <div>
              <label htmlFor="filter-stock" className="block text-sm font-medium text-slate-700 mb-2">
                Stock Level
              </label>
              <select
                id="filter-stock"
                value={filters.stockLevel || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, stockLevel: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Stock Levels</option>
                <option value="instock">In Stock (>0)</option>
                <option value="lowstock">Low Stock (≤3)</option>
                <option value="outofstock">Out of Stock (0)</option>
                <option value="overstock">High Stock (>20)</option>
              </select>
            </div>
          </div>

          {/* Price Range and Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Price Range ({currency.symbol})
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-slate-700 mb-2">
                Sort By
              </label>
              <select
                id="sort-by"
                value={filters.sortBy || 'name'}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="name">Card Name</option>
                <option value="game">Game</option>
                <option value="set">Set Name</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="stock_asc">Stock: Low to High</option>
                <option value="stock_desc">Stock: High to Low</option>
                <option value="quality">Quality</option>
                <option value="updated">Recently Updated</option>
                <option value="value_desc">Total Value: High to Low</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-source" className="block text-sm font-medium text-slate-700 mb-2">
                Price Source
              </label>
              <select
                id="filter-source"
                value={filters.priceSource || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, priceSource: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual Pricing</option>
                <option value="api_scryfall">Scryfall API</option>
                <option value="api">Other APIs</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterGame('all');
                  setFilterSet('all');
                  setFilters({
                    quality: 'all',
                    foilType: 'all',
                    cardType: 'all',
                    stockLevel: 'all',
                    minPrice: '',
                    maxPrice: '',
                    sortBy: 'name',
                    priceSource: 'all',
                    viewMode: 'table'
                  });
                }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || filterGame !== 'all' || filterSet !== 'all' ||
            (filters.quality && filters.quality !== 'all') ||
            (filters.foilType && filters.foilType !== 'all') ||
            (filters.cardType && filters.cardType !== 'all') ||
            (filters.stockLevel && filters.stockLevel !== 'all') ||
            filters.minPrice || filters.maxPrice ||
            (filters.priceSource && filters.priceSource !== 'all')) && (
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-600 font-medium">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:bg-blue-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterGame !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  Game: {filterGame}
                  <button
                    onClick={() => setFilterGame('all')}
                    className="hover:bg-green-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterSet !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  Set: {filterSet}
                  <button
                    onClick={() => setFilterSet('all')}
                    className="hover:bg-purple-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.quality && filters.quality !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                  Quality: {filters.quality}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, quality: 'all' }))}
                    className="hover:bg-orange-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.foilType && filters.foilType !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                  Foil: {filters.foilType}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, foilType: 'all' }))}
                    className="hover:bg-yellow-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.cardType && filters.cardType !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  Type: {filters.cardType}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, cardType: 'all' }))}
                    className="hover:bg-purple-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stockLevel && filters.stockLevel !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                  Stock: {filters.stockLevel}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, stockLevel: 'all' }))}
                    className="hover:bg-red-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                  Price: {filters.minPrice || '0'} - {filters.maxPrice || '∞'}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))}
                    className="hover:bg-indigo-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.priceSource && filters.priceSource !== 'all' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm">
                  Source: {filters.priceSource === 'manual' ? 'Manual' : filters.priceSource === 'api_scryfall' ? 'Scryfall' : 'API'}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, priceSource: 'all' }))}
                    className="hover:bg-pink-100 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      checked={selectedItems.size > 0 && selectedItems.size === filteredInventory.reduce((total, group) => total + group.qualities.length, 0)}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all items"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-10">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Image</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Card</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Value</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Stock</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Qualities</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Update</th>
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
                        className={`hover:bg-slate-50 transition-colors ${
                          hasLowStock ? 'bg-amber-50' : isZeroStock ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            checked={group.qualities.every(q => selectedItems.has(q.id))}
                            onChange={(e) => {
                              group.qualities.forEach(q => {
                                handleItemSelect(q.id, e.target.checked);
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select all qualities for ${group.card_name}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleCardExpansion(group.key)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            aria-label={isExpanded ? `Collapse ${group.card_name}` : `Expand ${group.card_name}`}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <img
                            src={group.image_url}
                            alt={group.card_name}
                            className="w-12 h-16 object-contain rounded border border-slate-200"
                            loading="lazy"
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
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-1 flex-wrap">
                              {group.visibleQualities.map(quality => (
                                <span
                                  key={quality.id}
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    quality.stock <= quality.low_stock_threshold
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-green-100 text-green-900'
                                  }`}
                                >
                                  {quality.quality.substring(0, 2).toUpperCase()} ({quality.stock})
                                  {quality.foil_type && quality.foil_type !== 'Regular' && quality.foil_type !== 'Non-foil' && (
                                  <span className="ml-1 text-xs opacity-75" title="Foil Variation">✨</span>
                                  )}
                                  {quality.price_source && (
                                    <span className="ml-1 text-xs opacity-60">
                                      {quality.price_source === 'manual' ? '✋' :
                                       quality.price_source?.includes('scryfall') ? '🔮' : '🔗'}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const representative = group.qualities[0];
                                setFoilModalCard({
                                  ...representative,
                                  card_name: group.card_name
                                });
                                setFoilFormData({
                                  foilType: 'Regular',
                                  quality: 'Near Mint',
                                  price: representative.price?.toFixed(2) || '0.00',
                                  initialStock: 1
                                });
                                setShowFoilModal(true);
                              }}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none self-start ${
                                group.totalStock === 0
                                  ? 'text-blue-800 bg-blue-100 border border-blue-300 font-medium hover:bg-blue-200'
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                              }`}
                              aria-label={`Add card variation for ${group.card_name}`}
                            >
                              <Plus className="w-3 h-3" />
                              Add Card
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{formatDate(group.lastUpdated)}</span>
                        </td>
                      </tr>

                      {/* Expanded quality rows */}
                      {isExpanded && group.qualities.filter(item => item.stock > 0).map(item => {
                        const isLowStock = item.stock <= item.low_stock_threshold && item.stock > 0;
                        const isEditing = editingItems.has(item.id);
                        const editedItem = editingItems.get(item.id);

                        return (
                          <tr key={item.id} className="bg-slate-50 border-l-4 border-l-blue-300">
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                checked={selectedItems.has(item.id)}
                                onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                                aria-label={`Select ${item.card_name} ${item.quality}`}
                              />
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <div className="w-8 h-10 bg-slate-200 rounded border border-slate-300 flex items-center justify-center">
                                <span className="text-xs text-slate-600 font-mono font-medium">
                                  {item.quality.substring(0,2).toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700 font-medium">{item.quality}</span>
                                <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editedItem.price}
                                  onChange={(e) => updateEditingItem(item.id, 'price', parseFloat(e.target.value))}
                                  className="w-24 px-2 py-1 text-sm border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  aria-label="Edit price"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-slate-900">
                                  {currency.symbol}{(item.price * currency.rate).toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editedItem.stock}
                                  onChange={(e) => updateEditingItem(item.id, 'stock', parseInt(e.target.value))}
                                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  aria-label="Edit stock quantity"
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
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-yellow-100 text-yellow-900'
                                  }`}>
                                    {item.foil_type || 'Regular'}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    item.price_source === 'manual'
                                      ? 'bg-blue-100 text-blue-900'
                                      : item.price_source?.includes('scryfall')
                                        ? 'bg-purple-100 text-purple-900'
                                        : 'bg-gray-100 text-gray-700'
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
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left focus:ring-2 focus:ring-blue-500 focus:outline-none rounded px-1"
                                    aria-label={`Add foil version of ${item.card_name}`}
                                  >
                                    + Add Foil
                                  </button>
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
                                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                    aria-label="Save changes"
                                  >
                                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelEditing(item.id);
                                    }}
                                    className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 focus:ring-2 focus:ring-slate-500 focus:outline-none transition-colors"
                                    aria-label="Cancel editing"
                                  >
                                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(item);
                                  }}
                                  className="p-1.5 hover:bg-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                                  aria-label={`Edit ${item.card_name} ${item.quality}`}
                                >
                                  <Edit className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
              <p className="text-slate-500 text-lg font-medium">No cards found</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Expanded Cards Panel */}
        {expandedCards.size > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-4 z-20">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium">
                {expandedCards.size} card{expandedCards.size !== 1 ? 's' : ''} expanded
              </span>
            </div>
            <button
              onClick={() => setExpandedCards(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded px-1"
            >
              <EyeOff className="w-4 h-4" aria-hidden="true" />
              Collapse All
            </button>
          </div>
        )}

        {/* Add Inventory Modal */}
        {showFoilModal && foilModalCard && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
          >
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 id="inventory-modal-title" className="text-lg font-bold text-slate-900">Add Inventory Variation</h2>
                <button
                  onClick={() => {
                    setShowFoilModal(false);
                    setFoilModalCard(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
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
                  <label htmlFor="foil-type" className="block text-sm font-medium text-slate-700 mb-2">
                    Foil Type
                  </label>
                  <select
                    id="foil-type"
                    value={foilFormData.foilType}
                    onChange={(e) => setFoilFormData({ ...foilFormData, foilType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {filterOptions.foilTypes.length > 0 ? (
                      filterOptions.foilTypes.map(foilType => (
                        <option key={foilType} value={foilType}>{foilType}</option>
                      ))
                    ) : (
                      // Fallback options if no game is selected or API fails
                      <>
                        <option value="Regular">Regular</option>
                        <option value="Foil">Regular Foil</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="foil-quality" className="block text-sm font-medium text-slate-700 mb-2">
                    Quality
                  </label>
                  <select
                    id="foil-quality"
                    value={foilFormData.quality}
                    onChange={(e) => setFoilFormData({ ...foilFormData, quality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Near Mint">Near Mint</option>
                    <option value="Lightly Played">Lightly Played</option>
                    <option value="Moderately Played">Moderately Played</option>
                    <option value="Heavily Played">Heavily Played</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="foil-price" className="block text-sm font-medium text-slate-700 mb-2">
                    Price ({currency.symbol})
                  </label>
                  <input
                    id="foil-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={foilFormData.price}
                    onChange={(e) => setFoilFormData({ ...foilFormData, price: e.target.value })}
                    placeholder={(foilModalCard.price * 2.5).toFixed(2)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {foilFormData.foilType === 'Regular'
                      ? `Base price: ${currency.symbol}${foilModalCard.price?.toFixed(2) || '0.00'}`
                      : `Suggested: ${currency.symbol}${(foilModalCard.price * (foilFormData.foilType.includes('Foil') ? 2.5 : 1.5)).toFixed(2)} (${foilFormData.foilType.includes('Foil') ? '2.5x' : '1.5x'} base price)`
                    }
                  </p>
                </div>

                <div>
                  <label htmlFor="foil-stock" className="block text-sm font-medium text-slate-700 mb-2">
                    Initial Stock
                  </label>
                  <input
                    id="foil-stock"
                    type="number"
                    min="0"
                    value={foilFormData.initialStock}
                    onChange={(e) => setFoilFormData({ ...foilFormData, initialStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={createInventoryVariation}
                    disabled={foilModalLoading || !foilFormData.price || foilFormData.price <= 0}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  >
                    {foilModalLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
                        Creating...
                      </>
                    ) : (
                      'Add Inventory'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowFoilModal(false);
                      setFoilModalCard(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none"
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
          <div 
            className="fixed inset-0 bg-slate-900/75 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-modal-title"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h2 id="csv-modal-title" className="text-xl font-semibold text-slate-900">
                    CSV Import - Step {csvStep} of 3
                  </h2>
                  <button
                    onClick={() => {
                      setShowCSVModal(false);
                      resetCSVModal();
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    aria-label="Close CSV import modal"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: File Upload */}
                {csvStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Upload CSV File</h3>
                      <p className="text-slate-600">
                        Upload a CSV file containing your inventory data. Make sure your file includes columns for SKU, Card Name, Price, and Stock Quantity.
                      </p>
                    </div>

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
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" aria-hidden="true" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-slate-700">
                          Drop your CSV file here, or{' '}
                          <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline focus-within:ring-2 focus-within:ring-blue-500 focus-within:outline-none rounded">
                            browse
                            <input
                              type="file"
                              accept=".csv"
                              onChange={(e) => handleCSVUpload(e.target.files[0])}
                              className="sr-only"
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {Object.keys(csvPreview[0] || {}).map(csvColumn => (
                        <div key={csvColumn} className="space-y-2">
                          <label htmlFor={`mapping-${csvColumn}`} className="block text-sm font-medium text-slate-700">
                            CSV Column: <span className="font-semibold">{csvColumn}</span>
                          </label>
                          <select
                            id={`mapping-${csvColumn}`}
                            value={Object.keys(csvMapping).find(key => csvMapping[key] === csvColumn) || ''}
                            onChange={(e) => {
                              const newMapping = { ...csvMapping };
                              Object.keys(newMapping).forEach(key => {
                                if (newMapping[key] === csvColumn) delete newMapping[key];
                              });
                              if (e.target.value) newMapping[e.target.value] = csvColumn;
                              setCsvMapping(newMapping);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                    <div>
                      <h4 className="text-md font-medium text-slate-900 mb-3">Data Preview</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              {Object.keys(csvPreview[0] || {}).map(column => (
                                <th key={column} scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
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
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none"
                      >
                        Back
                      </button>
                      <button
                        onClick={importCSV}
                        disabled={csvImporting || !csvMapping.sku || !csvMapping.card_name || !csvMapping.price || !csvMapping.stock_quantity}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                      >
                        {csvImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" aria-hidden="true" />
                          <span className="text-sm font-medium text-green-800">Successfully Imported</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900 mt-1">
                          {csvResults.success_count || 0}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" aria-hidden="true" />
                          <span className="text-sm font-medium text-yellow-800">Warnings</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-900 mt-1">
                          {csvResults.warning_count || 0}
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <XCircle className="w-5 h-5 text-red-600 mr-2" aria-hidden="true" />
                          <span className="text-sm font-medium text-red-800">Errors</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900 mt-1">
                          {csvResults.error_count || 0}
                        </div>
                      </div>
                    </div>

                    {(csvResults.errors?.length > 0 || csvResults.warnings?.length > 0) && (
                      <div className="space-y-4">
                        {csvResults.errors?.length > 0 && (
                          <div>
                            <h4 className="text-md font-medium text-red-900 mb-2">Errors</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                              <ul className="space-y-1">
                                {csvResults.errors.map((error, index) => (
                                  <li key={index} className="text-sm text-red-700">
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {csvResults.warnings?.length > 0 && (
                          <div>
                            <h4 className="text-md font-medium text-yellow-900 mb-2">Warnings</h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                              <ul className="space-y-1">
                                {csvResults.warnings.map((warning, index) => (
                                  <li key={index} className="text-sm text-yellow-700">
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {csvResults.success_count > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-2" aria-hidden="true" />
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
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
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
          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'all-cards' && <AllCardsView />}
        {activeTab === 'orders' && (
          <AdminOrders />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;