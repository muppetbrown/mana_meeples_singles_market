// apps/web/src/components/Checkout.tsx
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, User, AlertCircle } from 'lucide-react';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeAddress, sanitizeHTML, formatCurrencySimple } from '@/lib/utils';
import type { Cart, CartItem, Currency } from '@/types';

type CheckoutForm = {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Shipping Address
  address: string;
  suburb: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;

  // Optional
  notes: string;
};

// 2) Errors map to form keys + an optional submit-level error
type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>> & {
  submit?: string;
};

interface CheckoutProps {
  isOpen: boolean;
  cart: Cart;
  currency?: Currency;
  onBack?: () => void;
  onClose?: () => void;
  onOrderSubmit?: (orderData: CheckoutForm) => Promise<void>;
  onOrderComplete?: () => void;
  total?: number;
}

const Checkout = ({
  isOpen,
  cart,
  currency,
  onBack,
  onClose,
  onOrderSubmit,
  onOrderComplete,
  total: providedTotal
}: CheckoutProps) => {
  const [formData, setFormData] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    suburb: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'New Zealand',
    notes: '',
  });

 const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cartTotal = providedTotal ?? cart.items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  const effectiveCurrency = currency || { code: 'NZD', symbol: '$', rate: 1 };

  // Note: Using robust sanitization functions from library instead of inline implementation

  const validateForm = () => {
    const newErrors: CheckoutErrors = {};

    // Sanitize and validate names
    const sanitizedFirstName = sanitizeText(formData.firstName);
    const sanitizedLastName = sanitizeText(formData.lastName);

    if (!sanitizedFirstName) {

      newErrors.firstName = 'First name is required';
    } else if (sanitizedFirstName.length > 50) {

      newErrors.firstName = 'First name is too long (max 50 characters)';
    } else if (!/^[a-zA-Z\u00C0-\u017F\s\-'.]+$/.test(sanitizedFirstName)) {

      newErrors.firstName = 'First name contains invalid characters';
    }

    if (!sanitizedLastName) {

      newErrors.lastName = 'Last name is required';
    } else if (sanitizedLastName.length > 50) {

      newErrors.lastName = 'Last name is too long (max 50 characters)';
    } else if (!/^[a-zA-Z\u00C0-\u017F\s\-'.]+$/.test(sanitizedLastName)) {

      newErrors.lastName = 'Last name contains invalid characters';
    }

    // Email validation with sanitization
    const sanitizedEmail = sanitizeEmail(formData.email);
    if (!sanitizedEmail) {

      newErrors.email = 'Email is required';
    } else if (sanitizedEmail.length > 254) {

      newErrors.email = 'Email address is too long';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {

      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but validated if provided)
    const sanitizedPhone = sanitizePhone(formData.phone);
    if (sanitizedPhone && !/^[+]?[\d\s\-()]{7,20}$/.test(sanitizedPhone)) {

      newErrors.phone = 'Please enter a valid phone number';
    }

    // Address validation
    const sanitizedAddress = sanitizeAddress(formData.address);
    if (!sanitizedAddress) {

      newErrors.address = 'Address is required';
    } else if (sanitizedAddress.length > 200) {

      newErrors.address = 'Address is too long (max 200 characters)';
    }

    // City validation
    const sanitizedCity = sanitizeText(formData.city);
    if (!sanitizedCity) {

      newErrors.city = 'City is required';
    } else if (sanitizedCity.length > 100) {

      newErrors.city = 'City name is too long (max 100 characters)';
    }

    // Postal code validation
    const sanitizedPostalCode = sanitizeText(formData.postalCode);
    if (!sanitizedPostalCode) {

      newErrors.postalCode = 'Postal code is required';
    } else if (!/^[A-Z0-9\s-]{3,10}$/i.test(sanitizedPostalCode)) {

      newErrors.postalCode = 'Please enter a valid postal code';
    }

    // Notes validation (optional)
    const sanitizedNotes = sanitizeHTML(formData.notes);
    if (sanitizedNotes.length > 500) {

      newErrors.notes = 'Notes are too long (max 500 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => {
    // Use library sanitization functions
    let sanitizedValue: CheckoutForm[K] = value;

    if (typeof value === 'string') {
      switch (field) {
        case 'firstName':
        case 'lastName':
        case 'city':
        case 'country':
        case 'region':
        case 'postalCode':
          sanitizedValue = sanitizeText(value) as CheckoutForm[K];
          break;
        case 'email':
          sanitizedValue = sanitizeEmail(value) as CheckoutForm[K];
          break;
        case 'phone':
          sanitizedValue = sanitizePhone(value) as CheckoutForm[K];
          break;
        case 'address':
        case 'suburb':
          sanitizedValue = sanitizeAddress(value) as CheckoutForm[K];
          break;
        case 'notes':
          sanitizedValue = sanitizeHTML(value) as CheckoutForm[K];
          break;
        default:
          sanitizedValue = sanitizeText(value) as CheckoutForm[K];
      }
    }

    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));

    // Clear the error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create sanitized customer data for submission using library function
      const sanitizedCustomer = {
        firstName: sanitizeText(formData.firstName),
        lastName: sanitizeText(formData.lastName),
        email: sanitizeEmail(formData.email),
        phone: sanitizePhone(formData.phone),
        address: sanitizeAddress(formData.address),
        suburb: sanitizeAddress(formData.suburb),
        city: sanitizeText(formData.city),
        region: sanitizeText(formData.region),
        postalCode: sanitizeText(formData.postalCode),
        country: sanitizeText(formData.country),
        notes: sanitizeHTML(formData.notes)
      };

      const orderData = {
        customer: sanitizedCustomer,
        items: cart.items.map((item: CartItem) => ({
          inventory_id: item.inventory_id,

          // Sanitize quantity
          quantity: Math.max(1, Math.min(50, Number.parseInt(String(item.quantity), 10) || 1)),

          // Sanitize price
          price: Math.max(0, Number.parseFloat(String(item.price)) || 0)
        })),
        total: Math.max(0, Number.parseFloat(String(cartTotal)) || 0), // Sanitize total
        currency: effectiveCurrency.code || 'NZD',
        timestamp: new Date().toISOString(),
      };

      // Call the parent handler to process the order
      if (onOrderSubmit) {
        await onOrderSubmit(orderData);
      } else if (onOrderComplete) {
        // If no custom submit handler, just call completion
        onOrderComplete();
      }

      setSubmitted(true);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Order submission failed:', error);
      }
      setErrors(prev => ({ ...prev, submit: 'Failed to submit order. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for your order! We've sent a confirmation email to{' '}
            <span className="font-medium">{formData.email}</span> and will be in touch shortly
            to confirm your order and provide payment details.
          </p>
          <button
            onClick={onBack || onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={onBack || onClose}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Cart
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Customer Details Form */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Customer Details</h2>

            {errors.submit && (
              <div
                className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span>{errors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                        errors.firstName ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                        errors.lastName ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Smith"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                          errors.email ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                      Phone Number (optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                          errors.phone ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="+64 21 123 4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                        errors.address ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="123 Main Street"
                    />
                    {errors.address && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="suburb" className="block text-sm font-medium text-slate-700 mb-1">
                        Suburb (optional)
                      </label>
                      <input
                        type="text"
                        id="suburb"
                        value={formData.suburb}
                        onChange={(e) => handleInputChange('suburb', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Ponsonby"
                      />
                    </div>

                    <div>
                      <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">
                        Region (optional)
                      </label>
                      <input
                        type="text"
                        id="region"
                        value={formData.region}
                        onChange={(e) => handleInputChange('region', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Auckland Region"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                          errors.city ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Auckland"
                      />
                      {errors.city && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-slate-700 mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${

                          errors.postalCode ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="1010"
                      />
                      {errors.postalCode && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
                      Country
                    </label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="New Zealand">New Zealand</option>
                      <option value="Australia">Australia</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="pt-4 border-t border-slate-200">
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                  Order Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Any special instructions or notes..."
                />
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Submit Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 h-fit">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              {cart.items.map((item: CartItem) => <div key={`${item.card_id}-${item.quality}`} className="flex gap-4">
                <img
                  src={item.image_url}
                  alt={item.card_name}
                  className="w-16 h-20 object-contain rounded bg-slate-100"

                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-slate-900 line-clamp-2">
                    {item.card_name}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1 space-y-1">
                    <div className="font-medium text-slate-800">{item.game_name}</div>
                    <div>{item.set_name} #{item.card_number}</div>
                    {item.rarity && <div className="text-slate-500">{item.rarity}</div>}
                    <div>{item.quality}</div>
                    {item.foil_type && item.foil_type !== 'Regular' && (
                      <div className="flex items-center gap-1">
                        <span>✨</span>
                        <span className="font-medium text-yellow-600">{item.foil_type}</span>
                      </div>
                    )}
                    {item.language && item.language !== 'English' && (
                      <div className="font-medium text-slate-700">{item.language}</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-600">Qty: {item.quantity}</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrencySimple(item.price * item.quantity, effectiveCurrency)}
                    </span>
                  </div>
                </div>
              </div>)}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-green-600">
                  {formatCurrencySimple(cartTotal, effectiveCurrency)}
                </span>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Payment Process</h4>
                <p className="text-sm text-blue-800">
                  After submitting your order, we'll send you an email with bank account details
                  for fund transfer{formData.country !== 'New Zealand' ? ' or alternative payment methods for overseas customers' : ''}.
                  Your cards will be reserved and shipped once payment is received.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;