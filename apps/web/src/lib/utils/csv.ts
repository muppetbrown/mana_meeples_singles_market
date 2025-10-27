/**
 * CSV Import/Export Utilities for Bulk Inventory Operations
 * Provides functionality to import and export inventory data in CSV format
 */

// Type definitions
export interface InventoryItem {
  inventory_id?: number;
  id?: number;
  name: string;
  set_name: string;
  card_number?: string;
  rarity?: string;
  quality: string;
  foil_type?: string;
  language?: string;
  price: string | number;
  stock_quantity: number;
  game_name?: string;
  updated_at?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of headers (keys to include)
 * @returns {string} CSV formatted string
 */
export const arrayToCSV = (data: Record<string, unknown>[], headers: string[] | null = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(header => `"${header}"`).join(',');

  // Create data rows
  const dataRows = data.map((row: Record<string, unknown>) => {
    return csvHeaders.map(header => {
      const value = row[header];
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '""';
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Parse CSV string to array of objects
 * @param {string} csvString - CSV formatted string
 * @param {Object} options - Parsing options
 * @returns {Array} Array of objects
 */
export const csvToArray = (csvString: string, options: Record<string, unknown> = {}) => {

  type CsvOptions = { delimiter?: string; hasHeader?: boolean };
  const { delimiter = ',', hasHeader = true } = (options ?? {}) as CsvOptions;

  if (!csvString || typeof csvString !== 'string') {
    throw new Error('Invalid CSV string provided');
  }

  const lines = csvString.trim().split('\n');

  if (lines.length === 0) {
    return [];
  }

  // Parse a single CSV line, handling quoted values
  const parseLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  // Parse header row
  let headers;
  let startIndex = 0;

  if (hasHeader) {
    headers = parseLine(lines[0]);
    startIndex = 1;
  } else {
    // Generate generic headers
    const firstRow = parseLine(lines[0]);
    headers = firstRow.map((_, index) => `column_${index}`);
  }

  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = startIndex; i < lines.length; i++) {

    const line = lines[i].trim();
    if (line) {
      const values = parseLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {

        row[header] = values[index] || '';
      });

      data.push(row);
    }
  }

  return data;
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects to download
 * @param {string} filename - Filename for the download
 * @param {Array} headers - Optional headers to include
 */
export const downloadCSV = (data: Record<string, unknown>[], filename = 'export.csv', headers: string[] | null = null) => {
  try {
    const csvContent = arrayToCSV(data, headers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to download CSV: ${errorMessage}`);
  }
};

/**
 * Validate inventory CSV data
 * @param {Array} data - Parsed CSV data to validate
 * @returns {Object} Validation result with errors and warnings
 */
export const validateInventoryCSV = (data: Record<string, unknown>[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields = ['name', 'set_name', 'quality', 'price', 'stock_quantity'];
  const optionalFields = ['card_number', 'rarity', 'foil_type', 'language', 'game_name'];
  const validQualities = ['NM', 'LP', 'MP', 'HP', 'DMG'];
  const validFoilTypes = ['Regular', 'Foil', 'Etched', 'Showcase'];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('No valid data found in CSV');
    return { valid: false, errors, warnings };
  }

  // Check headers
  const headers = Object.keys(data[0]);
  const missingRequired = requiredFields.filter(field => !headers.includes(field));

  if (missingRequired.length > 0) {
    errors.push(`Missing required columns: ${missingRequired.join(', ')}`);
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header and 0-based index

    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push(`Row ${rowNumber}: Missing required field '${field}'`);
      }
    });

    // Validate price
    if (row.price) {
      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNumber}: Invalid price '${row.price}'`);
      } else if (price > 1000) {
        warnings.push(`Row ${rowNumber}: High price detected '${row.price}'`);
      }
    }

    // Validate stock quantity
    if (row.stock_quantity) {
      const stock = parseInt(row.stock_quantity, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push(`Row ${rowNumber}: Invalid stock quantity '${row.stock_quantity}'`);
      }
    }

    // Validate quality
    if (row.quality && !validQualities.includes(row.quality)) {
      errors.push(`Row ${rowNumber}: Invalid quality '${row.quality}'. Must be one of: ${validQualities.join(', ')}`);
    }

    // Validate foil type
    if (row.foil_type && !validFoilTypes.includes(row.foil_type)) {
      warnings.push(`Row ${rowNumber}: Unusual foil type '${row.foil_type}'. Expected: ${validFoilTypes.join(', ')}`);
    }

    // Check for suspicious duplicates
    const duplicates = data.filter((otherRow, otherIndex) =>
      otherIndex !== index &&
      otherRow.name === row.name &&
      otherRow.set_name === row.set_name &&
      otherRow.card_number === row.card_number &&
      otherRow.quality === row.quality &&
      otherRow.foil_type === row.foil_type
    );

    if (duplicates.length > 0) {
      warnings.push(`Row ${rowNumber}: Potential duplicate card detected`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length,
    validRows: data.length - errors.filter(error => error.includes('Row')).length
  };
};

/**
 * Transform inventory data for export
 * @param {Array} inventoryData - Raw inventory data from API
 * @returns {Array} Formatted data ready for CSV export
 */
export const formatInventoryForExport = (inventoryData: InventoryItem[]) => {
  return inventoryData.map((item: InventoryItem) => ({
    id: item.inventory_id || item.id,
    name: item.name,
    set_name: item.set_name,
    card_number: item.card_number || '',
    rarity: item.rarity || '',
    quality: item.quality,
    foil_type: item.foil_type || 'Regular',
    language: item.language || 'English',
    price: parseFloat(item.price).toFixed(2),
    stock_quantity: item.stock_quantity,
    game_name: item.game_name || '',
    last_updated: item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : ''
  }));
};

/**
 * Generate CSV template for inventory import
 * @returns {string} CSV template with headers and example row
 */
export const generateInventoryTemplate = () => {
  const templateData = [
    {
      name: 'Lightning Bolt',
      set_name: 'Alpha',
      card_number: '161',
      rarity: 'Common',
      quality: 'NM',
      foil_type: 'Regular',
      language: 'English',
      price: '45.00',
      stock_quantity: '1',
      game_name: 'Magic: The Gathering'
    }
  ];

  return arrayToCSV(templateData);
};

export default {
  arrayToCSV,
  csvToArray,
  downloadCSV,
  validateInventoryCSV,
  formatInventoryForExport,
  generateInventoryTemplate
};