/**
 * FormInput Component
 * Reusable input field with consistent styling and accessibility
 */

import React, { ReactNode } from 'react';

export interface FormInputProps {
  /** Unique ID for the input element */
  id: string;

  /** Label text */
  label: string;

  /** Input type */
  type?: 'text' | 'number' | 'email' | 'password' | 'tel';

  /** Current value */
  value: string | number;

  /** Change handler */
  onChange: (value: string) => void;

  /** Whether the field is required */
  required?: boolean;

  /** Whether the input is disabled */
  disabled?: boolean;

  /** Optional help text below the input */
  helpText?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Custom CSS classes */
  className?: string;

  /** Minimum value (for number inputs) */
  min?: number;

  /** Maximum value (for number inputs) */
  max?: number;

  /** Step value (for number inputs) */
  step?: number | string;

  /** Optional icon to display before the label */
  icon?: ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  disabled = false,
  helpText,
  placeholder,
  className = '',
  min,
  max,
  step,
  icon,
}) => {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
      >
        {icon && <span className="inline-block mr-1 align-middle">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-mm-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          disabled ? 'bg-zinc-100 dark:bg-zinc-700' : ''
        }`}
      />
      {helpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormInput;
