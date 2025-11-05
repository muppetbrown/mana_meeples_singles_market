/**
 * FormSelect Component
 * Reusable select dropdown with consistent styling and accessibility
 * Eliminates duplication across modals and forms
 */

import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  /** Unique ID for the select element */
  id: string;

  /** Label text */
  label: string;

  /** Current selected value */
  value: string | number;

  /** Change handler */
  onChange: (value: string) => void;

  /** Available options */
  options: SelectOption[];

  /** Whether the field is required */
  required?: boolean;

  /** Whether the select is disabled */
  disabled?: boolean;

  /** Optional help text below the select */
  helpText?: string;

  /** Optional placeholder for empty state */
  placeholder?: string;

  /** Custom CSS classes */
  className?: string;

  /** Show as static text when only one option */
  showStaticWhenSingle?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  helpText,
  placeholder = 'Select...',
  className = '',
  showStaticWhenSingle = false,
}) => {
  // If only one option and showStaticWhenSingle is true, render as static text
  if (showStaticWhenSingle && options.length === 1) {
    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="text-sm text-zinc-700 dark:text-zinc-200 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-600">
          {options[0].label}
        </div>
        {helpText && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {helpText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-mm-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          disabled ? 'bg-zinc-100 dark:bg-zinc-700 cursor-not-allowed' : ''
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {helpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormSelect;
