#!/usr/bin/env node

/**
 * Unused Code Analyzer for Mana & Meeples
 * 
 * Analyzes the codebase to identify:
 * - Unused constants from config/constants.ts
 * - Unused API endpoints
 * - Unused utility functions
 * - Unused imports
 * 
 * Usage: node analyze-unused-code.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  rootDir: __dirname,
  srcDir: path.join(__dirname, 'apps', 'web', 'src'),
  apiDir: path.join(__dirname, 'apps', 'api', 'src'),
  excludeDirs: ['node_modules', 'dist', 'build', '.git', 'coverage'],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx']
};

// Known constants from constants.ts
const KNOWN_CONSTANTS = {
  API_CONFIG: ['TIMEOUT', 'RETRY_ATTEMPTS', 'RETRY_DELAY'],
  FILTER_CONFIG: ['DEBOUNCE_DELAY', 'CACHE_DURATION', 'MIN_SEARCH_LENGTH', 'MAX_SUGGESTIONS'],
  VIRTUAL_SCROLL_CONFIG: ['CARD_HEIGHT', 'CONTAINER_HEIGHT', 'OVERSCAN_COUNT', 'BATCH_SIZE', 'INITIAL_BATCH_SIZE'],
  BREAKPOINTS: ['SM', 'MD', 'LG', 'XL', '2XL'],
  GRID_CONFIG: ['COLUMNS', 'GAP', 'PADDING'],
  ACCESSIBILITY_CONFIG: ['MIN_TOUCH_TARGET', 'MIN_TOUCH_TARGET_MATERIAL', 'FOCUS_RING_WIDTH', 'SCREEN_READER_DELAY'],
  ANIMATION_CONFIG: ['DURATION', 'EASING'],
  CART_CONFIG: ['MAX_QUANTITY_PER_ITEM', 'NOTIFICATION_DURATION'],
  IMAGE_CONFIG: ['LAZY_LOAD_THRESHOLD', 'PLACEHOLDER_COLOR', 'ERROR_IMAGE'],
  CURRENCY_CONFIG: ['DEFAULT_CURRENCY', 'SUPPORTED_CURRENCIES'],
  VALIDATION_CONFIG: ['MAX_SEARCH_LENGTH', 'MIN_PRICE', 'MAX_PRICE'],
  ERROR_CONFIG: ['RETRY_ATTEMPTS', 'TIMEOUT', 'HTTP_STATUS'],
  ADMIN_CONFIG: ['ORDERS_LIMIT', 'ORDER_STATUS', 'ORDER_STATUS_TRANSITIONS'],
  FEATURES: ['VIRTUAL_SCROLLING', 'ADVANCED_FILTERS', 'KEYBOARD_SHORTCUTS'],
  UI_TEXT: ['LOADING', 'ERROR_GENERIC', 'ERROR_NETWORK', 'NO_RESULTS'],
  KEYBOARD_SHORTCUTS: ['SEARCH', 'TOGGLE_CART', 'TOGGLE_VIEW', 'CLEAR_FILTERS'],
  PERFORMANCE_CONFIG: ['SLOW_RENDER_THRESHOLD', 'MEMORY_WARNING_THRESHOLD', 'BUNDLE_SIZE_WARNING']
};

// Known API endpoints
const KNOWN_API_ENDPOINTS = [
  '/cards',
  '/games',
  '/sets',
  '/admin/login',
  '/admin/logout',
  '/admin/orders',
  '/admin/cards',
  '/admin/import-card-data',
  '/admin/refresh-prices',
  '/admin/bulk-create-foils',
  '/admin/bulk-create-variations',
  '/admin/variations/:card_id',
  '/admin/analytics'
];

// Results storage
const results = {
  unusedConstants: [],
  unusedEndpoints: [],
  unusedImports: [],
  unusedUtilities: [],
  summary: {
    filesScanned: 0,
    totalConstants: 0,
    totalEndpoints: 0,
    unusedConstantsCount: 0,
    unusedEndpointsCount: 0
  }
};

/**
 * Recursively get all files in directory
 */
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (CONFIG.fileExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Read file content safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return '';
  }
}

/**
 * Check if constant is used in codebase
 */
function isConstantUsed(constantName, files) {
  for (const file of files) {
    const content = readFile(file);
    // Check for direct usage or destructured usage
    if (content.includes(constantName)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if API endpoint is used in codebase
 */
function isEndpointUsed(endpoint, files) {
  // Remove parameter placeholders for search
  const searchEndpoint = endpoint.replace(/:\w+/g, '');
  
  for (const file of files) {
    const content = readFile(file);
    // Check for endpoint usage in various formats
    if (content.includes(`'${searchEndpoint}'`) || 
        content.includes(`"${searchEndpoint}"`) ||
        content.includes(`\`${searchEndpoint}\``)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyze constants usage
 */
function analyzeConstants(files) {
  console.log('\n🔍 Analyzing constants usage...\n');

  Object.entries(KNOWN_CONSTANTS).forEach(([category, constants]) => {
    constants.forEach(constant => {
      const fullName = `${category}.${constant}`;
      const used = isConstantUsed(constant, files);
      
      results.summary.totalConstants++;
      
      if (!used) {
        results.unusedConstants.push({
          category,
          constant,
          fullName
        });
        results.summary.unusedConstantsCount++;
      }
    });
  });

  // Sort by category
  results.unusedConstants.sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Analyze API endpoints usage
 */
function analyzeEndpoints(files) {
  console.log('🔍 Analyzing API endpoints usage...\n');

  KNOWN_API_ENDPOINTS.forEach(endpoint => {
    const used = isEndpointUsed(endpoint, files);
    
    results.summary.totalEndpoints++;
    
    if (!used) {
      results.unusedEndpoints.push(endpoint);
      results.summary.unusedEndpointsCount++;
    }
  });

  results.unusedEndpoints.sort();
}

/**
 * Find unused imports in a file
 */
function findUnusedImports(filePath) {
  const content = readFile(filePath);
  const unusedInFile = [];

  // Match import statements
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const source = match[3];

    // Check named imports
    if (namedImports) {
      namedImports.split(',').forEach(imp => {
        const importName = imp.trim();
        // Check if import is used elsewhere in file
        const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
        const matches = content.match(usageRegex) || [];
        // If only appears once (the import statement itself), it's unused
        if (matches.length <= 1) {
          unusedInFile.push({
            import: importName,
            source,
            type: 'named'
          });
        }
      });
    }

    // Check default import
    if (defaultImport) {
      const usageRegex = new RegExp(`\\b${defaultImport}\\b`, 'g');
      const matches = content.match(usageRegex) || [];
      if (matches.length <= 1) {
        unusedInFile.push({
          import: defaultImport,
          source,
          type: 'default'
        });
      }
    }
  }

  return unusedInFile;
}

/**
 * Analyze unused imports across codebase
 */
function analyzeImports(files) {
  console.log('🔍 Analyzing unused imports...\n');

  files.forEach(file => {
    const unused = findUnusedImports(file);
    if (unused.length > 0) {
      results.unusedImports.push({
        file: path.relative(CONFIG.rootDir, file),
        imports: unused
      });
    }
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 UNUSED CODE ANALYSIS REPORT');
  console.log('='.repeat(80));

  console.log('\n📈 Summary:');
  console.log(`   Files scanned: ${results.summary.filesScanned}`);
  console.log(`   Total constants checked: ${results.summary.totalConstants}`);
  console.log(`   Unused constants: ${results.summary.unusedConstantsCount}`);
  console.log(`   Total endpoints checked: ${results.summary.totalEndpoints}`);
  console.log(`   Unused endpoints: ${results.summary.unusedEndpointsCount}`);
  console.log(`   Files with unused imports: ${results.unusedImports.length}`);

  if (results.unusedConstants.length > 0) {
    console.log('\n❌ Unused Constants:');
    console.log('─'.repeat(80));
    
    let currentCategory = '';
    results.unusedConstants.forEach(({ category, constant, fullName }) => {
      if (category !== currentCategory) {
        console.log(`\n  ${category}:`);
        currentCategory = category;
      }
      console.log(`    • ${constant}`);
    });
  } else {
    console.log('\n✅ All constants are being used!');
  }

  if (results.unusedEndpoints.length > 0) {
    console.log('\n❌ Unused API Endpoints:');
    console.log('─'.repeat(80));
    results.unusedEndpoints.forEach(endpoint => {
      console.log(`    • ${endpoint}`);
    });
  } else {
    console.log('\n✅ All API endpoints are being used!');
  }

  if (results.unusedImports.length > 0) {
    console.log('\n❌ Files with Unused Imports:');
    console.log('─'.repeat(80));
    results.unusedImports.slice(0, 10).forEach(({ file, imports }) => {
      console.log(`\n  ${file}:`);
      imports.forEach(({ import: imp, source }) => {
        console.log(`    • ${imp} from '${source}'`);
      });
    });
    
    if (results.unusedImports.length > 10) {
      console.log(`\n  ... and ${results.unusedImports.length - 10} more files`);
    }
  } else {
    console.log('\n✅ No unused imports found!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 Recommendations:');
  console.log('─'.repeat(80));
  
  if (results.summary.unusedConstantsCount > 0) {
    console.log('\n1. Remove unused constants to reduce bundle size');
    console.log('   Review each unused constant before removing');
  }
  
  if (results.summary.unusedEndpointsCount > 0) {
    console.log('\n2. Remove unused API endpoints or mark as deprecated');
    console.log('   Check if endpoints are used by external clients');
  }
  
  if (results.unusedImports.length > 0) {
    console.log('\n3. Remove unused imports to improve build times');
    console.log('   Use ESLint with unused-imports rule for automated detection');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Save report to file
 */
function saveReport() {
  const reportPath = path.join(CONFIG.rootDir, 'unused-code-report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    ...results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting unused code analysis...\n');

  // Get all source files
  const webFiles = getAllFiles(CONFIG.srcDir);
  const apiFiles = getAllFiles(CONFIG.apiDir);
  const allFiles = [...webFiles, ...apiFiles];

  results.summary.filesScanned = allFiles.length;

  console.log(`📁 Found ${allFiles.length} files to analyze`);

  // Run analyses
  analyzeConstants(allFiles);
  analyzeEndpoints(allFiles);
  analyzeImports(webFiles); // Only check web files for unused imports

  // Generate and save report
  generateReport();
  saveReport();

  console.log('\n✨ Analysis complete!\n');
}

// Run the analyzer
main();