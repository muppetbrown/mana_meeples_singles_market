import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  User,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye
} from 'lucide-react';
import { API_URL } from '../config/api';
import { logError } from '../services/errorHandler';

const getAdminHeaders = () => ({
  'Content-Type': 'application/json'
});

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/orders?limit=100`, {
        credentials: 'include',
        headers: getAdminHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      logError(err, { operation: 'fetchOrders', context: 'AdminOrders' });
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Toggle order expansion
  const toggleOrderExpansion = useCallback((orderId) => {
    setExpandedOrders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(orderId)) {
        newExpanded.delete(orderId);
      } else {
        newExpanded.add(orderId);
      }
      return newExpanded;
    });
  }, []);

  // Business logic validation for order status changes
  const validateStatusChange = (currentStatus, newStatus) => {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [], // No transitions from completed
      'cancelled': [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        valid: false,
        message: `Cannot change order from ${currentStatus} to ${newStatus}`
      };
    }

    return { valid: true };
  };

  // Update order status with validation
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      window.alert('Order not found');
      return;
    }

    // Validate the status transition
    const validation = validateStatusChange(order.status, newStatus);
    if (!validation.valid) {
      window.alert(validation.message);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Refresh orders
      fetchOrders();
    } catch (error) {
      logError(error, { operation: 'updateOrderStatus', orderId, newStatus });
      window.alert('Failed to update order status');
    }
  }, [orders, fetchOrders]);

  // Show order details in modal
  const showOrderDetails = useCallback(async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
        credentials: 'include',
        headers: getAdminHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const orderData = await response.json();
      setSelectedOrder(orderData);
      setShowOrderModal(true);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching order details:', error);
      }
      window.alert('Failed to load order details');
    }
  }, []);

  // Status badge component with AAA contrast ratios
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-50 text-yellow-900 border border-yellow-200', icon: Clock },
      confirmed: { color: 'bg-blue-50 text-blue-900 border border-blue-200', icon: CheckCircle },
      completed: { color: 'bg-green-50 text-green-900 border border-green-200', icon: CheckCircle },
      cancelled: { color: 'bg-red-50 text-red-900 border border-red-200', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Parse customer data from payment_intent_id field
  const parseCustomerData = (paymentIntentId) => {
    try {
      return JSON.parse(paymentIntentId);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Order Management</h2>
          <p className="text-slate-600 text-sm">{filteredOrders.length} orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">No orders found</p>
            <p className="text-slate-400 text-sm mt-2">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredOrders.map(order => {
              const isExpanded = expandedOrders.has(order.id);
              const customerData = parseCustomerData(order.payment_intent_id);

              return (
                <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleOrderExpansion(order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">Order #{order.id}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {order.customer_name} • {order.customer_email}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-slate-900">
                        ${parseFloat(order.total).toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 ml-8 space-y-4">
                      {/* Customer Details */}
                      {customerData && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Customer Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">Name:</span>
                              <span className="ml-2 font-medium">{customerData.firstName} {customerData.lastName}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Email:</span>
                              <span className="ml-2 font-medium">
                                <a href={`mailto:${customerData.email}`} className="text-blue-600 hover:underline">
                                  {customerData.email}
                                </a>
                              </span>
                            </div>
                            {customerData.phone && (
                              <div>
                                <span className="text-slate-600">Phone:</span>
                                <span className="ml-2 font-medium">
                                  <a href={`tel:${customerData.phone}`} className="text-blue-600 hover:underline">
                                    {customerData.phone}
                                  </a>
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-600">Country:</span>
                              <span className="ml-2 font-medium">{customerData.country}</span>
                            </div>
                          </div>

                          {/* Shipping Address */}
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-700">Shipping Address</span>
                            </div>
                            <div className="text-sm text-slate-600 leading-relaxed">
                              {customerData.address}<br />
                              {customerData.suburb && `${customerData.suburb}, `}
                              {customerData.city}, {customerData.region} {customerData.postalCode}<br />
                              {customerData.country}
                            </div>
                          </div>

                          {customerData.notes && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <span className="font-medium text-slate-700">Order Notes:</span>
                              <p className="text-sm text-slate-600 mt-1 italic">"{customerData.notes}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showOrderDetails(order.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>

                        {order.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'confirmed');
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirm
                          </button>
                        )}

                        {order.status === 'confirmed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'completed');
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Package className="w-4 h-4" />
                            Mark Completed
                          </button>
                        )}

                        {order.status !== 'cancelled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to cancel this order? This will restore inventory.')) {
                                updateOrderStatus(order.id, 'cancelled');
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`mailto:${order.customer_email}?subject=Order Update #${order.id}`);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Email Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Order #{selectedOrder.id} Details
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h3>
                <div className="bg-slate-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Item</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Unit Price</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-slate-900">{item.card_name}</div>
                              <div className="text-sm text-slate-600">{item.quality}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">${parseFloat(item.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-slate-100 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900">Order Total:</span>
                      <span className="text-xl font-bold text-slate-900">
                        ${parseFloat(selectedOrder.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Status and Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Order Status</h4>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Timestamps</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-slate-600">Created:</span>
                      <span className="ml-2">{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    {selectedOrder.updated_at !== selectedOrder.created_at && (
                      <div>
                        <span className="text-slate-600">Updated:</span>
                        <span className="ml-2">{formatDate(selectedOrder.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;