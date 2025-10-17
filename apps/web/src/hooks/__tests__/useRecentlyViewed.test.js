import { renderHook, act } from '@testing-library/react';
import { useRecentlyViewed } from '../useRecentlyViewed';

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  test('should initialize with empty list', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed).toEqual([]);
  });

  test('should add card to recently viewed', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const testCard = {
      id: 'card-1',
      name: 'Test Card',
      image_url: 'test.jpg',
      set_name: 'Test Set',
      card_number: '001',
      game_name: 'Test Game'
    };

    act(() => {
      result.current.addToRecentlyViewed(testCard);
    });

    expect(result.current.recentlyViewed).toHaveLength(1);
    expect(result.current.recentlyViewed[0]).toEqual(expect.objectContaining({
      id: 'card-1',
      name: 'Test Card',
      image_url: 'test.jpg',
      set_name: 'Test Set'
    }));
    expect(result.current.recentlyViewed[0].viewedAt).toBeDefined();
  });

  test('should move existing card to front when viewed again', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const card1 = { id: 'card-1', name: 'Card 1', image_url: 'test1.jpg', set_name: 'Set 1' };
    const card2 = { id: 'card-2', name: 'Card 2', image_url: 'test2.jpg', set_name: 'Set 2' };

    act(() => {
      result.current.addToRecentlyViewed(card1);
      result.current.addToRecentlyViewed(card2);
      result.current.addToRecentlyViewed(card1); // View card1 again
    });

    expect(result.current.recentlyViewed).toHaveLength(2);
    expect(result.current.recentlyViewed[0].id).toBe('card-1');
    expect(result.current.recentlyViewed[1].id).toBe('card-2');
  });

  test('should limit to maximum 10 items', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    // Add 12 cards
    const cards = Array.from({ length: 12 }, (_, i) => ({
      id: `card-${i}`,
      name: `Card ${i}`,
      image_url: `test${i}.jpg`,
      set_name: 'Test Set'
    }));

    act(() => {
      cards.forEach(card => result.current.addToRecentlyViewed(card));
    });

    expect(result.current.recentlyViewed).toHaveLength(10);
    // Should have the last 10 cards (newest first)
    expect(result.current.recentlyViewed[0].id).toBe('card-11');
    expect(result.current.recentlyViewed[9].id).toBe('card-2');
  });

  test('should remove specific card from recently viewed', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const cards = [
      { id: 'card-1', name: 'Card 1', image_url: 'test1.jpg', set_name: 'Set 1' },
      { id: 'card-2', name: 'Card 2', image_url: 'test2.jpg', set_name: 'Set 2' }
    ];

    act(() => {
      cards.forEach(card => result.current.addToRecentlyViewed(card));
      result.current.removeFromRecentlyViewed('card-1');
    });

    expect(result.current.recentlyViewed).toHaveLength(1);
    expect(result.current.recentlyViewed[0].id).toBe('card-2');
  });

  test('should clear all recently viewed cards', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const cards = [
      { id: 'card-1', name: 'Card 1', image_url: 'test1.jpg', set_name: 'Set 1' },
      { id: 'card-2', name: 'Card 2', image_url: 'test2.jpg', set_name: 'Set 2' }
    ];

    act(() => {
      cards.forEach(card => result.current.addToRecentlyViewed(card));
      result.current.clearRecentlyViewed();
    });

    expect(result.current.recentlyViewed).toHaveLength(0);
  });

  test('should save to sessionStorage when adding cards', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const testCard = {
      id: 'card-1',
      name: 'Test Card',
      image_url: 'test.jpg',
      set_name: 'Test Set'
    };

    act(() => {
      result.current.addToRecentlyViewed(testCard);
    });

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'tcg_recently_viewed',
      expect.stringContaining('card-1')
    );
  });

  test('should load from sessionStorage on initialization', () => {
    const savedData = [{
      id: 'saved-card',
      name: 'Saved Card',
      image_url: 'saved.jpg',
      set_name: 'Saved Set',
      viewedAt: '2023-01-01T00:00:00.000Z'
    }];

    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed).toEqual(savedData);
  });

  test('should handle corrupted sessionStorage data gracefully', () => {
    sessionStorageMock.getItem.mockReturnValue('invalid-json');

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed).toEqual([]);
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('tcg_recently_viewed');
  });

  test('should handle invalid card data gracefully', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      // Try to add invalid cards
      result.current.addToRecentlyViewed(null);
      result.current.addToRecentlyViewed({ name: 'No ID' });
      result.current.addToRecentlyViewed({});
    });

    expect(result.current.recentlyViewed).toHaveLength(0);
  });

  test('should handle non-array data in sessionStorage', () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify({ notAnArray: true }));

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed).toEqual([]);
  });
});