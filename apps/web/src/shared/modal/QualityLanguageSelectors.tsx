// apps/web/src/shared/modal/QualityLanguageSelectors.tsx
/**
 * QualityLanguageSelectors - Shared component for quality and language selection
 *
 * Used in both AddToCartModal and AddToInventoryModal
 * Provides cascading dropdowns for selecting card quality and language
 */

import * as React from 'react';

export type QualityLanguageSelectorsProps = {
  // Quality props
  qualities: string[];
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
  qualityLabel?: string;
  qualityHelpText?: string;

  // Language props
  languages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  languageLabel?: string;
  languageHelpText?: string;
  languageDisabled?: boolean;

  // Options
  required?: boolean;
  formatQuality?: (quality: string) => string;
  formatLanguage?: (language: string) => string;
};

export function QualityLanguageSelectors({
  qualities,
  selectedQuality,
  onQualityChange,
  qualityLabel = 'Quality',
  qualityHelpText = 'Condition of the physical card',

  languages,
  selectedLanguage,
  onLanguageChange,
  languageLabel = 'Language',
  languageHelpText = 'Language printed on the card',
  languageDisabled = false,

  required = true,
  formatQuality = (q) => q,
  formatLanguage = (l) => l,
}: QualityLanguageSelectorsProps) {
  return (
    <div className="space-y-4">
      {/* Quality Selection */}
      <div>
        <label htmlFor="quality" className="block text-sm font-medium text-slate-700 mb-2">
          {qualityLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="quality"
          value={selectedQuality}
          onChange={(e) => onQualityChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required={required}
        >
          <option value="" className="text-slate-500">Select quality...</option>
          {qualities.map((quality) => (
            <option key={quality} value={quality} className="text-slate-900">
              {formatQuality(quality)}
            </option>
          ))}
        </select>
        {qualityHelpText && (
          <p className="text-xs text-slate-500 mt-1">
            {qualityHelpText}
          </p>
        )}
      </div>

      {/* Language Selection */}
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-2">
          {languageLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="language"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={languageDisabled}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
          required={required}
        >
          <option value="" className="text-slate-500">Select language...</option>
          {languages.map((language) => (
            <option key={language} value={language} className="text-slate-900">
              {formatLanguage(language)}
            </option>
          ))}
        </select>
        {languageHelpText && (
          <p className="text-xs text-slate-500 mt-1">
            {languageHelpText}
          </p>
        )}
      </div>
    </div>
  );
}
