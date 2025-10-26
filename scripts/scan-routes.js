#!/usr/bin/env node

/**
 * Express Route Scanner & Endpoint Mapper
 * 
 * Scans actual Express route files to extract real API endpoints
 * and compares them with documented endpoints to find discrepancies.
 * 
 * Usage: node scan-routes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  rootDir: __dirname,
  apiRoutesDir: path.join(__dirname, 'apps', 'api', 'src', 'routes'),
  webComponentsDir: path.join(__dirname, 'apps', 'web', 'src', 'components'),
  docsDir: path.join(__dirname, 'docs')
};

// Expected endpoints from documentation
const DOCUMENTED_ENDPOINTS = [
  '/cards',
  '/games',
  '/sets',
  '/orders',
  '/admin/login',
  '/admin/logout',
  '/admin/auth/check',
  '/admin/orders',
  '/admin/cards',
  '/admin/all-cards',
  '/admin/analytics',
  '/admin/import-card-data',
  '/admin/refresh-prices',
  '/admin/bulk-create-foils',
  '/admin/bulk-create-variations',
  '/admin/variations/:card_id',
  '/variations/:card_id',
  '/filters',
  '/health'
];

// Results storage
const results = {
  actualEndpoints: [],
  documentedEndpoints: DOCUMENTED_ENDPOINTS,
  frontendCalls: [],
  discrepancies: {
    notImplemented: [],
    notDocumented: [],
    pathMismatches: []
  }
};

/**
 * Extract route definitions from Express router file
 */
function extractRoutesFromFile(filePath) {
  const routes = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    // Match Express route definitions: router.METHOD('path', ...)
    const routeRegex = /router\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const route = match[2];
      
      routes.push({
        method,
        path: route,
        file: filename,
        fullPath: filePath
      });
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  
  return routes;
}

/**
 * Scan all route files in the API directory
 */
function scanRouteFiles() {
  console.log('🔍 Scanning Express route files...\n');
  
const routeFiles = [
  'api.ts',
  'auth.ts',
  'cards.ts',
  'filters.ts',
  'variations.ts',
  'orders.ts',     
  'inventory.ts',   
  'additional.ts',  
  'index.ts'
];
  
  // Track route prefixes from index.ts
  const routePrefixes = new Map();
  
  routeFiles.forEach(filename => {
    const filePath = path.join(CONFIG.apiRoutesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}`);
      return;
    }
    
    const routes = extractRoutesFromFile(filePath);
    
    // Check index.ts for route mounting
    if (filename === 'index.ts') {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract route mounting: router.use('/prefix', importedRouter)
      const mountRegex = /router\.use\(['"`]([^'"`]+)['"`],\s*(\w+)/g;
      let match;
      
      while ((match = mountRegex.exec(content)) !== null) {
        const prefix = match[1];
        const routerName = match[2];
        
        // Map imported router names to their files
        if (routerName === 'authRoutes') routePrefixes.set('auth.ts', '/auth');
        if (routerName === 'filtersRoutes') routePrefixes.set('filters.ts', '/filters');
        if (routerName === 'variationsRoutes') routePrefixes.set('variations.ts', '/variations');
        if (routerName === 'apiRoutes') routePrefixes.set('api.ts', '');
      }
    }
    
    // Store routes with their prefixes
    routes.forEach(route => {
      const prefix = routePrefixes.get(filename) || '';
      const fullPath = prefix + route.path;
      
      results.actualEndpoints.push({
        ...route,
        fullPath: fullPath.replace(/\/+/g, '/'), // Normalize slashes
        prefix
      });
    });
  });
  
  console.log(`✅ Found ${results.actualEndpoints.length} route definitions\n`);
}

/**
 * Recursively find all TypeScript/JavaScript files
 */
function findAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findAllSourceFiles(filePath, fileList);
      }
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extract API calls from frontend code
 */
function scanFrontendApiCalls() {
  console.log('🔍 Scanning frontend API calls...\n');
  
  const allFiles = findAllSourceFiles(CONFIG.webComponentsDir);
  
  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.relative(CONFIG.webComponentsDir, filePath);
      
      // Multiple patterns to catch different API call styles
      const patterns = [
        // api.get('/endpoint')
        /api\.(get|post|put|patch|del|delete)\s*[<(]\s*['"`]([^'"`]+)['"`]/g,
        // fetch(`${API_URL}/endpoint`)
        /fetch\s*\(\s*[`'"](?:\$\{[^}]*\})?([^`'"]+)[`'"]/g,
        // await fetch(API_URL + '/endpoint')
        /fetch\s*\([^)]*\+\s*['"`]([^'"`]+)['"`]/g,
        // throttledFetch(`${API_URL}/endpoint`)
        /throttledFetch\s*\(\s*[`'"](?:\$\{[^}]*\})?([^`'"]+)[`'"]/g,
        // API_URL}/cards?
        /\$\{API_URL\}([^`'"]+)/g,
        // Direct paths in template literals
        /['"`]\/api\/([^'"`]+)['"`]/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          let endpoint = match[2] || match[1];
          
          // Skip if it's not a path
          if (!endpoint || !endpoint.includes('/')) continue;
          
          // Clean up the endpoint
          endpoint = endpoint
            .replace(/\$\{[^}]*\}/g, '') // Remove template variables
            .replace(/\?.*$/, '') // Remove query strings
            .split(/[?&]/)[0] // Take only the path part
            .trim();
          
          if (endpoint && endpoint.startsWith('/')) {
            const method = match[0].match(/\.(get|post|put|patch|del)/i)?.[1] || 'GET';
            
            results.frontendCalls.push({
              method: method === 'del' ? 'DELETE' : method.toUpperCase(),
              endpoint,
              file: filename
            });
          }
        }
      });
    } catch (error) {
      // Silently skip files that can't be read
    }
  });
  
  // Remove duplicates and sort
  const uniqueCalls = new Map();
  results.frontendCalls.forEach(call => {
    const key = `${call.method}:${call.endpoint}`;
    if (!uniqueCalls.has(key)) {
      uniqueCalls.set(key, call);
    }
  });
  
  results.frontendCalls = Array.from(uniqueCalls.values()).sort((a, b) => 
    a.endpoint.localeCompare(b.endpoint)
  );
  
  console.log(`✅ Found ${results.frontendCalls.length} unique frontend API calls\n`);
}

/**
 * Normalize endpoint path for comparison
 */
function normalizeEndpoint(endpoint) {
  return endpoint
    .replace(/^\/api/, '') // Remove /api prefix
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/:\w+/g, ':id'); // Normalize parameters
}

/**
 * Compare documented vs actual endpoints
 */
function analyzeDiscrepancies() {
  console.log('🔍 Analyzing endpoint discrepancies...\n');
  
  const actualPaths = new Set(
    results.actualEndpoints.map(e => normalizeEndpoint(e.fullPath))
  );
  
  const frontendPaths = new Set(
    results.frontendCalls.map(c => normalizeEndpoint(c.endpoint))
  );
  
  // Find documented but not implemented
  DOCUMENTED_ENDPOINTS.forEach(endpoint => {
    const normalized = normalizeEndpoint(endpoint);
    const normalizedWithApi = normalizeEndpoint('/api' + endpoint);
    
    if (!actualPaths.has(normalized) && !actualPaths.has(normalizedWithApi)) {
      // Check if frontend uses it
      const usedByFrontend = frontendPaths.has(normalized) || frontendPaths.has(normalizedWithApi);
      
      results.discrepancies.notImplemented.push({
        endpoint,
        usedByFrontend
      });
    }
  });
  
  // Find implemented but not documented
  results.actualEndpoints.forEach(route => {
    const normalized = normalizeEndpoint(route.fullPath);
    
    if (!DOCUMENTED_ENDPOINTS.some(e => normalizeEndpoint(e) === normalized)) {
      results.discrepancies.notDocumented.push({
        path: route.fullPath,
        method: route.method,
        file: route.file
      });
    }
  });
  
  // Find path mismatches (similar but not exact)
  results.discrepancies.notImplemented.forEach(doc => {
    const normalized = normalizeEndpoint(doc.endpoint);
    
    results.actualEndpoints.forEach(actual => {
      const actualNorm = normalizeEndpoint(actual.fullPath);
      
      // Check for similar paths (Levenshtein distance < 3)
      if (levenshteinDistance(normalized, actualNorm) <= 3 && normalized !== actualNorm) {
        results.discrepancies.pathMismatches.push({
          documented: doc.endpoint,
          actual: actual.fullPath,
          file: actual.file
        });
      }
    });
  });
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXPRESS ROUTE ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  // Summary
  console.log('\n📈 Summary:');
  console.log(`   Total routes found: ${results.actualEndpoints.length}`);
  console.log(`   Frontend API calls: ${results.frontendCalls.length}`);
  console.log(`   Documented endpoints: ${DOCUMENTED_ENDPOINTS.length}`);
  console.log(`   Not implemented: ${results.discrepancies.notImplemented.length}`);
  console.log(`   Not documented: ${results.discrepancies.notDocumented.length}`);
  console.log(`   Path mismatches: ${results.discrepancies.pathMismatches.length}`);
  
  // Actual endpoints grouped by file
  console.log('\n✅ Actual Implemented Routes:');
  console.log('─'.repeat(80));
  
  const byFile = {};
  results.actualEndpoints.forEach(route => {
    if (!byFile[route.file]) byFile[route.file] = [];
    byFile[route.file].push(route);
  });
  
  Object.entries(byFile).forEach(([file, routes]) => {
    console.log(`\n  ${file}:`);
    routes.forEach(route => {
      console.log(`    ${route.method.padEnd(7)} ${route.fullPath}`);
    });
  });
  
  // Frontend calls
  console.log('\n🌐 Frontend API Calls:');
  console.log('─'.repeat(80));
  results.frontendCalls.slice(0, 15).forEach(call => {
    console.log(`    ${call.method.padEnd(7)} ${call.endpoint}`);
  });
  if (results.frontendCalls.length > 15) {
    console.log(`    ... and ${results.frontendCalls.length - 15} more`);
  }
  
  // Not implemented
  if (results.discrepancies.notImplemented.length > 0) {
    console.log('\n❌ Documented but NOT Implemented:');
    console.log('─'.repeat(80));
    results.discrepancies.notImplemented.forEach(item => {
      const usedTag = item.usedByFrontend ? ' [USED BY FRONTEND!]' : '';
      console.log(`    • ${item.endpoint}${usedTag}`);
    });
  }
  
  // Not documented
  if (results.discrepancies.notDocumented.length > 0) {
    console.log('\n⚠️  Implemented but NOT Documented:');
    console.log('─'.repeat(80));
    results.discrepancies.notDocumented.forEach(item => {
      console.log(`    • ${item.method.padEnd(7)} ${item.path} (${item.file})`);
    });
  }
  
  // Path mismatches
  if (results.discrepancies.pathMismatches.length > 0) {
    console.log('\n🔄 Possible Path Mismatches:');
    console.log('─'.repeat(80));
    results.discrepancies.pathMismatches.forEach(item => {
      console.log(`    Documented: ${item.documented}`);
      console.log(`    Actual:     ${item.actual} (${item.file})`);
      console.log('');
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 Recommendations:');
  console.log('─'.repeat(80));
  
  if (results.discrepancies.notImplemented.some(i => i.usedByFrontend)) {
    console.log('\n⚠️  CRITICAL: Some documented endpoints are used by frontend but NOT implemented!');
    console.log('   This will cause runtime errors. Implement these endpoints immediately.');
  }
  
  if (results.discrepancies.pathMismatches.length > 0) {
    console.log('\n⚠️  Path mismatches detected. These might be:');
    console.log('   - Typos in documentation');
    console.log('   - Renamed endpoints');
    console.log('   - Endpoints moved to different paths');
  }
  
  if (results.discrepancies.notDocumented.length > 0) {
    console.log('\n📝 Update documentation to include newly implemented endpoints');
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Save detailed JSON report
 */
function saveReport() {
  const reportPath = path.join(CONFIG.rootDir, 'route-analysis-report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRoutes: results.actualEndpoints.length,
      frontendCalls: results.frontendCalls.length,
      documentedEndpoints: DOCUMENTED_ENDPOINTS.length,
      notImplemented: results.discrepancies.notImplemented.length,
      notDocumented: results.discrepancies.notDocumented.length,
      pathMismatches: results.discrepancies.pathMismatches.length
    },
    ...results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Express route analysis...\n');
  
  scanRouteFiles();
  scanFrontendApiCalls();
  analyzeDiscrepancies();
  generateReport();
  saveReport();
  
  console.log('\n✨ Analysis complete!\n');
}

main();