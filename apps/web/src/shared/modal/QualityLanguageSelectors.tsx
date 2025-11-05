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
        <label htmlFor="quality" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 text-slate-700 mb-2">
          {qualityLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="quality"
          value={selectedQuality}
          onChange={(e) => onQualityChange(e.target.value)}
          className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 border-slate-300 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-mm-teal focus:ring-blue-500 focus:border-transparent"
          required={required}
        >
          <option value="">Select quality...</option>
          {qualities.map((quality) => (
            <option key={quality} value={quality}>
              {formatQuality(quality)}
            </option>
          ))}
        </select>
        {qualityHelpText && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-slate-500 mt-1">
            {qualityHelpText}
          </p>
        )}
      </div>

      {/* Language Selection */}
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 text-slate-700 mb-2">
          {languageLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="language"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={languageDisabled}
          className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 border-slate-300 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-mm-teal focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          required={required}
        >
          <option value="">Select language...</option>
          {languages.map((language) => (
            <option key={language} value={language}>
              {formatLanguage(language)}
            </option>
          ))}
        </select>
        {languageHelpText && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-slate-500 mt-1">
            {languageHelpText}
          </p>
        )}
      </div>
    </div>
  );
}
