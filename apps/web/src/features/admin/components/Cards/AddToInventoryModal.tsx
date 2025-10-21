// apps/web/src/components/admin/AddToInventoryModal.tsx
import React from 'react';
import { X, Package, DollarSign } from 'lucide-react';
import type { Card, CardVariation } from '@/types';

// ---------- Types ----------
type AddFormData = {
  quality: string;
  foil_type: string;
  price: string;
  stock_quantity: number;
  language: string;
};

interface AddToInventoryModalProps {
  card: Card;
  variation: CardVariation;
  formData: AddFormData;
  onFormChange: (data: AddFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

// ---------- Constants ----------
const QUALITY_OPTIONS = [
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged'
];

const FOIL_OPTIONS = ['Regular', 'Foil'];

const LANGUAGE_OPTIONS = [
  'English',
  'Japanese',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian'
];

// ---------- Component ----------
const AddToInventoryModal: React.FC<AddToInventoryModalProps> = ({
  card,
  variation,
  formData,
  onFormChange,
  onSave,
  onClose,
  saving,
}) => {
  // Prevent modal close when clicking inside
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle form field changes
  const handleChange = (field: keyof AddFormData, value: string | number) => {
    onFormChange({
      ...formData,
      [field]: value,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-slate-900">
                Add to Inventory
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {card.name} • {card.set_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Card Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Variation:</span>
              <span className="font-medium text-slate-900">{variation.variation_label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Treatment:</span>
              <span className="font-medium text-slate-900">{variation.treatment}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Finish:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                variation.finish === 'foil' 
                  ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {variation.finish}
              </span>
            </div>
          </div>

          {/* Quality */}
          <div>
            <label htmlFor="quality" className="block text-sm font-medium text-slate-700 mb-2">
              Quality <span className="text-red-500">*</span>
            </label>
            <select
              id="quality"
              value={formData.quality}
              onChange={(e) => handleChange('quality', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {QUALITY_OPTIONS.map((quality) => (
                <option key={quality} value={quality}>
                  {quality}
                </option>
              ))}
            </select>
          </div>

          {/* Foil Type */}
          <div>
            <label htmlFor="foil_type" className="block text-sm font-medium text-slate-700 mb-2">
              Foil Type <span className="text-red-500">*</span>
            </label>
            <select
              id="foil_type"
              value={formData.foil_type}
              onChange={(e) => handleChange('foil_type', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {FOIL_OPTIONS.map((foilType) => (
                <option key={foilType} value={foilType}>
                  {foilType}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-2">
              Language <span className="text-red-500">*</span>
            </label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>

          {/* Price and Stock Quantity (Side by Side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Price (NZD) <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label htmlFor="stock_quantity" className="block text-sm font-medium text-slate-700 mb-2">
                <Package className="w-4 h-4 inline mr-1" />
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.price || formData.stock_quantity < 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Add to Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToInventoryModal;