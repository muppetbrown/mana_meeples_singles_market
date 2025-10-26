// ----------------------------------------------------------------------------
// File: apps/web/src/features/shop/components/CardDisplay/CardList.tsx
// Purpose: Redesigned CardList with non-expandable rows, clickable images,
//          and popup modals for add to cart/inventory actions.

import React, { useState } from 'react';
import OptimizedImage from '@/shared/components/media/OptimizedImage';
import VariationBadge from '@/shared/components/ui/VariationBadge';
import { PlusIcon, ShoppingCartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { groupCardsForBrowse } from '@/lib/utils/index';
import {
  Card,
  CardVariation,
  formatTreatment,
  formatFinish,
  isFoilCard,
  hasSpecialTreatment,
  BrowseBaseCard,
  BrowseVariation
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

type Currency = {
  symbol: string;
  rate: number;
};

export type CardListProps = {
  cards: Card[]; // catalog rows only (no inventory quality/language here)
  currency: Currency;
  isAdminMode?: boolean;
  onAddToCart?: (card: BrowseBaseCard, variation: BrowseVariation) => void; // shop only - receives grouped base card
  onAddToInventory?: (card: BrowseBaseCard) => void;                        // admin only - receives grouped base card
  className?: string;
};

// Modal state types
type ImageModalState = {
  isOpen: boolean;
  card: BrowseBaseCard | null;
};

type AddToCartModalState = {
  isOpen: boolean;
  card: BrowseBaseCard | null;
};

// Available options for dropdowns (filtered by admin mode and availability)
type AvailableOptions = {
  treatments: Array<{ value: string; label: string; count: number }>;
  qualities: Array<{ value: string; label: string; count: number }>;
  languages: Array<{ value: string; label: string; count: number }>;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper to get common variations across all card variations
const getCommonVariations = (variations: BrowseVariation[]): BrowseVariation[] => {
  if (!variations.length) return [];

  // For now, just return the first variation as "common"
  // This could be enhanced to find actual common attributes
  return variations.slice(0, 1);
};

// Helper to get different/unique variations
const getDifferentVariations = (variations: BrowseVariation[]): BrowseVariation[] => {
  if (variations.length <= 1) return [];

  // Return all variations except the first one (which is shown as "common")
  return variations.slice(1, 4); // Limit to first 3 different variations
};

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

// Image Modal Component
type ImageModalProps = {
  card: BrowseBaseCard;
  onClose: () => void;
};

const ImageModal: React.FC<ImageModalProps> = ({ card, onClose }) => {
  const imageUrl = card.image_url || '/images/card-back-placeholder.jpg';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-mm-darkForest truncate">
            {card.name}
          </h3>
          <button
            onClick={onClose}
            className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded p-1"
            aria-label="Close image modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4">
          <OptimizedImage
            src={imageUrl}
            alt={`${card.name} (${card.set_name} #${card.card_number})`}
            width={400}
            height={560}
            className="w-full max-w-sm mx-auto object-contain bg-gradient-to-br from-mm-warmAccent to-mm-tealLight rounded-lg"
            placeholder="blur"
            sizes="400px"
          />
        </div>
      </div>
    </div>
  );
};

// Add to Cart/Inventory Modal Component
type AddToCartModalProps = {
  card: BrowseBaseCard;
  currency: Currency;
  isAdminMode: boolean;
  onClose: () => void;
  onAddToCart?: (card: BrowseBaseCard, variation: BrowseVariation) => void;
  onAddToInventory?: (card: BrowseBaseCard) => void;
};

const AddToCartModal: React.FC<AddToCartModalProps> = ({
  card,
  currency,
  isAdminMode,
  onClose,
  onAddToCart,
  onAddToInventory
}) => {
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const imageUrl = card.image_url || '/images/card-back-placeholder.jpg';

  // Get available options based on admin mode and inventory
  const availableOptions = React.useMemo(() => {
    const treatments = new Map<string, number>();
    const qualities = new Map<string, number>();
    const languages = new Map<string, number>();

    card.variations.forEach(v => {
      const inStock = v.in_stock || 0;

      if (isAdminMode || inStock > 0) {
        // Count treatments
        const treatmentKey = v.treatment || 'STANDARD';
        treatments.set(treatmentKey, (treatments.get(treatmentKey) || 0) + inStock);

        // For qualities and languages, we'd need inventory data
        // For now, we'll mock some common options
        qualities.set('Near Mint', inStock);
        languages.set('English', inStock);
      }
    });

    return {
      treatments: Array.from(treatments.entries()).map(([value, count]) => ({
        value,
        label: formatTreatment(value),
        count
      })),
      qualities: Array.from(qualities.entries()).map(([value, count]) => ({
        value,
        label: value,
        count
      })),
      languages: Array.from(languages.entries()).map(([value, count]) => ({
        value,
        label: value,
        count
      }))
    };
  }, [card.variations, isAdminMode]);

  // Set default selections
  React.useEffect(() => {
    if (availableOptions.treatments.length > 0 && !selectedTreatment) {
      setSelectedTreatment(availableOptions.treatments[0].value);
    }
    if (availableOptions.qualities.length > 0 && !selectedQuality) {
      setSelectedQuality(availableOptions.qualities[0].value);
    }
    if (availableOptions.languages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(availableOptions.languages[0].value);
    }
  }, [availableOptions, selectedTreatment, selectedQuality, selectedLanguage]);

  // Calculate price based on selections
  const calculatedPrice = React.useMemo(() => {
    if (!selectedTreatment) return 0;

    const matchingVariation = card.variations.find(v =>
      (v.treatment || 'STANDARD') === selectedTreatment
    );

    return matchingVariation?.price || card.lowest_price || 0;
  }, [card, selectedTreatment]);

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return 'N/A';
    return (price * currency.rate).toFixed(2);
  };

  const handleSubmit = () => {
    if (isAdminMode && onAddToInventory) {
      onAddToInventory(card);
    } else if (!isAdminMode && onAddToCart && selectedTreatment) {
      const matchingVariation = card.variations.find(v =>
        (v.treatment || 'STANDARD') === selectedTreatment
      );

      if (matchingVariation) {
        onAddToCart(card, matchingVariation);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-mm-darkForest">
            {isAdminMode ? 'Add to Inventory' : 'Add to Cart'}
          </h3>
          <button
            onClick={onClose}
            className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded p-1"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Image and Card Info */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-20 h-28">
              <OptimizedImage
                src={imageUrl}
                alt={`${card.name}`}
                width={80}
                height={112}
                className="w-full h-full object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight rounded-lg"
                placeholder="blur"
                sizes="80px"
              />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-mm-darkForest">{card.name}</h4>
              <p className="text-sm text-mm-teal">{card.game_name}</p>
              <p className="text-sm text-mm-teal">{card.set_name}</p>
              <p className="text-sm text-mm-teal">#{card.card_number}</p>
              {card.rarity && <p className="text-sm text-mm-teal">{card.rarity}</p>}
            </div>
          </div>

          {/* Common variations info */}
          <div>
            <p className="text-sm font-medium text-mm-darkForest mb-2">Common variations:</p>
            <div className="flex gap-1 flex-wrap">
              {getCommonVariations(card.variations).map((variation, index) => (
                <VariationBadge
                  key={index}
                  treatment={variation.treatment}
                  finish={variation.finish}
                  promoType={variation.promo_type ?? undefined}
                />
              ))}
            </div>
          </div>

          {/* Treatment Dropdown */}
          {availableOptions.treatments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-mm-darkForest mb-2">
                Treatment:
              </label>
              <select
                value={selectedTreatment}
                onChange={(e) => setSelectedTreatment(e.target.value)}
                className="w-full p-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
              >
                {availableOptions.treatments.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {!isAdminMode && `(${option.count} in stock)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quality Dropdown */}
          {availableOptions.qualities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-mm-darkForest mb-2">
                Quality:
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full p-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
              >
                {availableOptions.qualities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {!isAdminMode && `(${option.count} in stock)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language Dropdown */}
          {availableOptions.languages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-mm-darkForest mb-2">
                Language:
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
              >
                {availableOptions.languages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {!isAdminMode && `(${option.count} in stock)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price and Quantity */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-semibold text-mm-darkForest">
                {currency.symbol}{formatPrice(calculatedPrice)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-mm-darkForest mb-1">
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 p-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none text-center"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={!selectedTreatment}
            >
              {isAdminMode ? 'Add to Inventory' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

const CardList = React.memo<CardListProps>(({ cards, currency, isAdminMode = false, onAddToCart, onAddToInventory, className = '' }) => {
const baseCards: BrowseBaseCard[] = React.useMemo(() => groupCardsForBrowse(cards), [cards]);

  // Filter based on mode
const displayCards = React.useMemo(() => {
    if (isAdminMode)
    return baseCards; // show everything to admins
    // Shop mode: show only base cards with any stock > 0 across variations
    return baseCards.filter((card) => card.total_stock > 0 || card.variations.some(v => v.in_stock > 0));
  }, [baseCards, isAdminMode]);

  // Modal states
  const [imageModal, setImageModal] = useState<ImageModalState>({ isOpen: false, card: null });
  const [addToCartModal, setAddToCartModal] = useState<AddToCartModalState>({ isOpen: false, card: null });

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return 'N/A';
    return (price * currency.rate).toFixed(2);
  };

  // Open image modal
  const openImageModal = (card: BrowseBaseCard) => {
    setImageModal({ isOpen: true, card });
  };

  // Close image modal
  const closeImageModal = () => {
    setImageModal({ isOpen: false, card: null });
  };

  // Open add to cart/inventory modal
  const openAddToCartModal = (card: BrowseBaseCard) => {
    setAddToCartModal({ isOpen: true, card });
  };

  // Close add to cart/inventory modal
  const closeAddToCartModal = () => {
    setAddToCartModal({ isOpen: false, card: null });
  };

if (displayCards.length === 0) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <p className="text-mm-teal">
        {isAdminMode ? 'No cards found.' : 'No cards with stock available.'}
      </p>
    </div>
  );
}

return (
    <>
      <ul className={`space-y-2 ${className}`} role="list" aria-label="Card results">
        {displayCards.map((card) => {
          const groupKey = `sid:${card.set_id}|num:${card.card_number}`;
          const imageUrl = card.image_url || '/images/card-back-placeholder.jpg';

          // Get common and different variations for display
          const commonVariations = getCommonVariations(card.variations);
          const differentVariations = getDifferentVariations(card.variations);

          return (
            <li key={groupKey} className="card-mm bg-white border border-mm-warmAccent hover:border-mm-teal transition-colors rounded-mm-sm">
              <div className="flex items-stretch p-4 gap-4">
                {/* Left: Clickable Image */}
                <div className="relative flex-shrink-0 w-20 h-28">
                  <button
                    onClick={() => openImageModal(card)}
                    className="w-full h-full focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded-mm-sm overflow-hidden hover:opacity-90 transition-opacity"
                    aria-label={`View larger image of ${card.name}`}
                  >
                    <OptimizedImage
                      src={imageUrl}
                      alt={`${card.name} (${card.set_name} #${card.card_number})`}
                      width={80}
                      height={112}
                      className="w-full h-full object-cover bg-gradient-to-br from-mm-warmAccent to-mm-tealLight"
                      placeholder="blur"
                      sizes="80px"
                    />
                  </button>
                </div>

                {/* Middle: Two rows of information */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* First row: card name, game name, set name, card_number, rarity */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-base sm:text-lg text-mm-darkForest truncate">
                      {card.name}
                    </h3>
                    <span className="text-sm text-mm-teal truncate">
                      {card.game_name}
                    </span>
                    <span className="text-sm text-mm-teal truncate">
                      {card.set_name}
                    </span>
                    <span className="text-sm text-mm-teal whitespace-nowrap">
                      #{card.card_number}
                    </span>
                    {card.rarity && (
                      <span className="text-sm text-mm-teal whitespace-nowrap">
                        {card.rarity}
                      </span>
                    )}
                  </div>

                  {/* Second row: common variations, then different variations */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Common variations */}
                    {commonVariations.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-mm-teal">Common:</span>
                        {commonVariations.map((variation, index) => (
                          <VariationBadge
                            key={index}
                            treatment={variation.treatment}
                            finish={variation.finish}
                            promoType={variation.promo_type ?? undefined}
                          />
                        ))}
                      </div>
                    )}

                    {/* Different variations */}
                    {differentVariations.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-mm-teal">Variations:</span>
                        {differentVariations.map((variation, index) => (
                          <VariationBadge
                            key={index}
                            treatment={variation.treatment}
                            finish={variation.finish}
                            promoType={variation.promo_type ?? undefined}
                          />
                        ))}
                      </div>
                    )}

                    {/* Stock info for non-admin */}
                    {!isAdminMode && (
                      <>
                        <span className="text-xs text-mm-darkForest">
                          {card.total_stock || 0} in stock
                        </span>
                        {card.lowest_price != null && (
                          <span className="text-xs font-semibold text-mm-darkForest">
                            from {currency.symbol}{formatPrice(card.lowest_price)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Add to inventory/cart button */}
                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => openAddToCartModal(card)}
                    className={`btn-primary px-4 py-2 text-sm ${
                      isAdminMode ? 'btn-secondary' : ''
                    }`}
                    title={isAdminMode ? 'Add to inventory' : 'Add to cart'}
                  >
                    {isAdminMode ? (
                      <>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add to Inventory
                      </>
                    ) : (
                      <>
                        <ShoppingCartIcon className="w-4 h-4 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Image Modal */}
      {imageModal.isOpen && imageModal.card && (
        <ImageModal card={imageModal.card} onClose={closeImageModal} />
      )}

      {/* Add to Cart/Inventory Modal */}
      {addToCartModal.isOpen && addToCartModal.card && (
        <AddToCartModal
          card={addToCartModal.card}
          currency={currency}
          isAdminMode={isAdminMode}
          onClose={closeAddToCartModal}
          onAddToCart={onAddToCart}
          onAddToInventory={onAddToInventory}
        />
      )}
    </>
  );
});

CardList.displayName = 'CardList';

export default CardList;