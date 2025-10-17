import { renderHook, act } from '@testing-library/react';
import { useEnhancedCart } from '../useEnhancedCart';

// Mock localStorage
const localStorageMock = {

  getItem: jest.fn(),

  setItem: jest.fn(),

  removeItem: jest.fn(),

  clear: jest.fn(),
};

global.localStorage = localStorageMock;

// Mock API URL
const mockApiUrl = 'http://localhost:3001/api';


describe('useEnhancedCart', () => {

  beforeEach(() => {

    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });


  test('should initialize with empty cart', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));


    expect(result.current.cart).toEqual([]);

    expect(result.current.cartNotifications).toEqual([]);
  });


  test('should add item to cart', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      image_url: 'test.jpg',
      quality: 'NM',
      price: 10.50,
      stock: 5,
      foil_type: 'Regular',
      language: 'English',
      game_name: 'Test Game',
      set_name: 'Test Set',
      card_number: '001',
      rarity: 'Rare'
    };

    act(() => {
      result.current.addToCart(testCard);
    });


    expect(result.current.cart).toHaveLength(1);

    expect(result.current.cart[0]).toEqual(expect.objectContaining({
      id: 'test-card-1',
      name: 'Test Card',
      price: 10.50,
      quantity: 1
    }));
  });


  test('should update quantity when adding same item', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 5
    };

    act(() => {
      result.current.addToCart(testCard);
      result.current.addToCart(testCard);
    });


    expect(result.current.cart).toHaveLength(1);

    expect(result.current.cart[0].quantity).toBe(2);
  });


  test('should not exceed stock limit', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 2
    };

    act(() => {
      result.current.addToCart(testCard);
      result.current.addToCart(testCard);
      result.current.addToCart(testCard); // This should be ignored
    });


    expect(result.current.cart[0].quantity).toBe(2);

    expect(result.current.cartNotifications).toHaveLength(1);

    expect(result.current.cartNotifications[0].type).toBe('warning');
  });


  test('should update item quantity', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 5
    };

    act(() => {
      result.current.addToCart(testCard);
      result.current.updateQuantity('test-card-1', 'NM', 3);
    });


    expect(result.current.cart[0].quantity).toBe(3);
  });


  test('should remove item when quantity is 0', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 5
    };

    act(() => {
      result.current.addToCart(testCard);
      result.current.updateQuantity('test-card-1', 'NM', 0);
    });


    expect(result.current.cart).toHaveLength(0);
  });


  test('should remove item from cart', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 5
    };

    act(() => {
      result.current.addToCart(testCard);
      result.current.removeFromCart('test-card-1', 'NM');
    });


    expect(result.current.cart).toHaveLength(0);
  });


  test('should clear entire cart', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCards = [
      { id: 'card-1', quality: 'NM', price: 10, stock: 5 },
      { id: 'card-2', quality: 'LP', price: 8, stock: 3 }
    ];

    act(() => {
      testCards.forEach(card => result.current.addToCart(card));
      result.current.clearCart();
    });


    expect(result.current.cart).toHaveLength(0);
  });


  test('should handle different card conditions as separate items', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const cardNM = {
      id: 'test-card-1',
      inventory_id: 'inv-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50,
      stock: 5
    };

    const cardLP = {
      id: 'test-card-1',
      inventory_id: 'inv-2',
      name: 'Test Card',
      quality: 'LP',
      price: 8.50,
      stock: 3
    };

    act(() => {
      result.current.addToCart(cardNM);
      result.current.addToCart(cardLP);
    });


    expect(result.current.cart).toHaveLength(2);

    expect(result.current.cart[0].quality).toBe('NM');

    expect(result.current.cart[1].quality).toBe('LP');
  });


  test('should persist cart to localStorage', () => {
    renderHook(() => useEnhancedCart(mockApiUrl));


    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tcg_cart',
      JSON.stringify([])
    );
  });


  test('should load cart from localStorage on initialization', () => {
    const savedCart = [{
      id: 'saved-card',
      quality: 'NM',
      name: 'Saved Card',
      price: 5.00,
      quantity: 2
    }];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));


    expect(result.current.cart).toEqual(savedCart);
  });


  test('should add notification when adding item to cart', () => {
    const { result } = renderHook(() => useEnhancedCart(mockApiUrl));

    const testCard = {
      id: 'test-card-1',
      name: 'Test Card',
      quality: 'NM',
      price: 10.50
    };

    act(() => {
      result.current.addToCart(testCard);
    });


    expect(result.current.cartNotifications).toHaveLength(1);

    expect(result.current.cartNotifications[0]).toEqual(expect.objectContaining({
      type: 'success',

      message: expect.stringContaining('Test Card added to cart')
    }));
  });
});