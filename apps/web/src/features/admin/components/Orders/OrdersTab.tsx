// apps/web/src/components/admin/OrdersTab.tsx
import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react';
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
import { api, ENDPOINTS } from '@/lib/api';
import { formatOrderTotal } from '@/lib/utils';
import { UI_TEXT } from '@/lib/constants';

// -------------------- Types --------------------
interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  address: string;
  suburb?: string;
  city: string;
  region: string;
  postalCode: string;
  notes?: string;
}

type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface OrderItem {
  card_name: string;
  quality: string;
  quantity: number;
  unit_price: string; // string from API; we format with parseFloat
  total_price: string;
}

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  total: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_intent_id: string; // JSON string we parse for shipping info
  items?: OrderItem[];
}

const nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

const OrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- API calls (using shared api client) ---
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Expect { orders: Order[] } from backend
      console.log('Fetching orders from', ENDPOINTS.ADMIN.ORDERS);
      const data = await api.get<{ orders?: Order[] }>(ENDPOINTS.ADMIN.ORDERS);
      console.log('Orders API response:', data);
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderDetails = useCallback(async (orderId: number) => {
    // Expect full order object with items
    return api.get<Order>(ENDPOINTS.ADMIN.ORDER_DETAIL(orderId));
  }, []);

  const patchOrderStatus = useCallback(async (orderId: number, newStatus: OrderStatus) => {
    // Backend: PATCH /admin/orders/:id/status with { status }
    return api.patch(ENDPOINTS.ADMIN.UPDATE_ORDER_STATUS(orderId), { status: newStatus });
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders (memoized)
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter(order => {
      const matchesSearch =
        term === '' ||
        order.customer_email?.toLowerCase().includes(term) ||
        order.customer_name?.toLowerCase().includes(term) ||
        order.id.toString().includes(term);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Toggle order expansion
  const toggleOrderExpansion = useCallback((orderId: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  // Business logic validation for order status changes
  const validateStatusChange = (currentStatus: OrderStatus, newStatus: OrderStatus) => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        valid: false as const,
        message: `Cannot change order from ${currentStatus} to ${newStatus}`
      };
    }
    return { valid: true as const };
  };

  // Update order status with validation
  const updateOrderStatus = useCallback(async (orderId: number, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      window.alert('Order not found');
      return;
    }

    const validation = validateStatusChange(order.status, newStatus);
    if (!validation.valid) {
      window.alert(validation.message);
      return;
    }

    try {
      await patchOrderStatus(orderId, newStatus);
      // Refresh orders after update
      fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
      window.alert('Failed to update order status');
    }
  }, [orders, patchOrderStatus, fetchOrders]);

  // Show order details in modal
  const showOrderDetails = useCallback(async (orderId: number) => {
    try {
      const data = await fetchOrderDetails(orderId);
      setSelectedOrder(data as unknown as Order);
      setShowOrderModal(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      window.alert('Failed to load order details');
    }
  }, [fetchOrderDetails]);

  // Status badge with explicit icon component type
  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const statusConfig: Record<OrderStatus, { color: string; icon: ComponentType<{ className?: string }> }> = {
      pending: { color: 'bg-yellow-50 text-yellow-900 border border-yellow-200', icon: Clock },
      confirmed: { color: 'bg-blue-50 text-blue-900 border border-blue-200', icon: CheckCircle },
      completed: { color: 'bg-green-50 text-green-900 border border-green-200', icon: CheckCircle },
      cancelled: { color: 'bg-red-50 text-red-900 border border-red-200', icon: XCircle }
    };

    const { color, icon: StatusIcon } = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (s: string) => new Date(s).toLocaleString();

  // Parse customer data from payment_intent_id field
  const parseCustomerData = (paymentIntentId: string): CustomerData | null => {
    try {
      return JSON.parse(paymentIntentId);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-600">{UI_TEXT.LOADING_ORDERS}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" aria-hidden="true" />
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
          aria-label="Refresh orders"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search orders"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <label className="sr-only" htmlFor="order-status">Filter by status</label>
            <select
              id="order-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
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
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
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
                    role="button"
                    aria-expanded={isExpanded}
                    aria-controls={`order-${order.id}-details`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="p-1 hover:bg-slate-200 rounded transition-colors" aria-hidden="true">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </span>

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
                        {formatOrderTotal(parseFloat(order.total))}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div id={`order-${order.id}-details`} className="mt-4 ml-8 space-y-4">
                      {/* Customer Details */}
                      {customerData && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" aria-hidden="true" />
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
                              <MapPin className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                          View Details
                        </button>

                        {order.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'confirmed');
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
                          >
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            Confirm
                          </button>
                        )}

                        {order.status === 'confirmed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'completed');
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
                          >
                            <Package className="w-4 h-4" aria-hidden="true" />
                            Mark Completed
                          </button>
                        )}

                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to cancel this order? This will restore inventory.')) {
                                updateOrderStatus(order.id, 'cancelled');
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
                          >
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`mailto:${order.customer_email}?subject=Order Update #${order.id}`);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-600"
                        >
                          <Mail className="w-4 h-4" aria-hidden="true" />
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Order ${selectedOrder.id} details`}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Order #{selectedOrder.id} Details
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-600"
                  aria-label="Close order details"
                >
                  <XCircle className="w-5 h-5" aria-hidden="true" />
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
                          <td className="px-4 py-3 text-right">{formatOrderTotal(parseFloat(item.unit_price))}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatOrderTotal(parseFloat(item.total_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-slate-100 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900">Order Total:</span>
                      <span className="text-xl font-bold text-slate-900">
                        {formatOrderTotal(parseFloat(selectedOrder.total))}
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
