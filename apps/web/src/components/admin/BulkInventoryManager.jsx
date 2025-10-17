import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Upload, Download, FileText, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { downloadCSV, csvToArray, validateInventoryCSV, formatInventoryForExport, generateInventoryTemplate } from '../../utils/csvUtils';
import { API_URL } from '../../config/api';

/**
 * Bulk Inventory Manager Component
 * Provides CSV import/export functionality for inventory management
 */
const BulkInventoryManager = ({ onInventoryUpdate, currentUser }) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);

  // Handle file upload and validation
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      window.alert('Please upload a CSV file.');
      return;
    }

    try {
      const text = await file.text();
      const data = csvToArray(text, { hasHeader: true });
      const validation = validateInventoryCSV(data);

      setUploadedData(data);
      setValidationResults(validation);
      setImportResults(null);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      window.alert('Failed to parse CSV file. Please check the format.');
    }

    // Clear file input
    event.target.value = '';
  };

  // Import validated data to the system
  const handleImportData = async () => {
    if (!uploadedData || !validationResults?.valid) {
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`${API_URL}/admin/inventory/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          data: uploadedData,
          user_id: currentUser?.id
        })
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const results = await response.json();
      setImportResults(results);

      // Clear upload data after successful import
      setUploadedData(null);
      setValidationResults(null);

      // Notify parent component
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
    } catch (error) {
      console.error('Import error:', error);
      window.alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Export current inventory
  const handleExportInventory = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/admin/inventory/export`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const inventoryData = await response.json();
      const formattedData = formatInventoryForExport(inventoryData.inventory || []);

      const filename = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(formattedData, filename);
    } catch (error) {
      console.error('Export error:', error);
      window.alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateInventoryTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-template.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Bulk Inventory Management</h3>
        <p className="text-sm text-slate-600">
          Import and export inventory data in CSV format for bulk operations.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Import Section */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Inventory
          </h4>
          <p className="text-xs text-slate-600 mb-3">
            Upload a CSV file to add or update inventory items.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
          />
          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Download CSV template
          </button>
        </div>

        {/* Export Section */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Inventory
          </h4>
          <p className="text-xs text-slate-600 mb-3">
            Download current inventory as CSV file.
          </p>
          <button
            onClick={handleExportInventory}
            disabled={exporting}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Template Section */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Template & Help
          </h4>
          <p className="text-xs text-slate-600 mb-3">
            Download a template with example data and column headers.
          </p>
          <button
            onClick={handleDownloadTemplate}
            className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Download Template
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="mb-6">
          <div className={`rounded-lg p-4 border ${
            validationResults.valid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {validationResults.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium mb-2 ${
                  validationResults.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  Validation {validationResults.valid ? 'Passed' : 'Failed'}
                </h4>

                <div className="text-sm mb-3">
                  <p>Total rows: {validationResults.totalRows}</p>
                  {!validationResults.valid && (
                    <p>Valid rows: {validationResults.validRows}</p>
                  )}
                </div>

                {/* Errors */}
                {validationResults.errors.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-red-900 mb-1">Errors:</h5>
                    <ul className="text-sm text-red-800 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                      {validationResults.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {validationResults.warnings.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-yellow-900 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings:
                    </h5>
                    <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                      {validationResults.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Import Button */}
                {validationResults.valid && (
                  <button
                    onClick={handleImportData}
                    disabled={importing}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium rounded-md transition-colors"
                  >
                    {importing ? 'Importing...' : `Import ${validationResults.totalRows} Items`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Import Completed</h4>
                <div className="text-sm text-blue-800">
                  <p>Successfully imported: {importResults.imported || 0} items</p>
                  <p>Updated: {importResults.updated || 0} items</p>
                  <p>Skipped: {importResults.skipped || 0} items</p>
                  {importResults.errors > 0 && (
                    <p className="text-red-600">Errors: {importResults.errors}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-medium text-slate-900 mb-2">CSV Format Requirements</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <p><strong>Required columns:</strong> name, set_name, quality, price, stock_quantity</p>
          <p><strong>Optional columns:</strong> card_number, rarity, foil_type, language, game_name</p>
          <p><strong>Quality values:</strong> NM, LP, MP, HP, DMG</p>
          <p><strong>Foil types:</strong> Regular, Foil, Etched, Showcase</p>
        </div>
      </div>
    </div>
  );
};

BulkInventoryManager.propTypes = {
  onInventoryUpdate: PropTypes.func,
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
  }),
};

export default BulkInventoryManager;