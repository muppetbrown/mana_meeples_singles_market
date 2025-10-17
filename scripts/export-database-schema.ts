/**
 * Database Schema Export Script
 * 
 * Generates comprehensive documentation of the database schema including:
 * - Table structures with columns, types, and constraints
 * - Relationships and foreign keys
 * - Indexes
 * - Sample data from each table
 * - Statistics and counts
 * 
 * Usage:
 *   node scripts/export-database-schema.js
 * 
 * Output:
 *   docs/DATABASE_SCHEMA.md - Full schema documentation
 *   docs/database-stats.json - Machine-readable statistics
 */

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
const pool = require('../config/database');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'path'.
const path = require('path');

class SchemaExporter {
  constructor() {
    // @ts-expect-error TS(2339): Property 'output' does not exist on type 'SchemaEx... Remove this comment to see the full error message
    this.output = [];
    // @ts-expect-error TS(2339): Property 'stats' does not exist on type 'SchemaExp... Remove this comment to see the full error message
    this.stats = {};
  }

  /**
   * Add a line to the output
   */
  log(line = '') {
    // @ts-expect-error TS(2339): Property 'output' does not exist on type 'SchemaEx... Remove this comment to see the full error message
    this.output.push(line);
  }

  /**
   * Add a header
   */
  header(text: any, level = 1) {
    this.log();
    this.log('#'.repeat(level) + ' ' + text);
    this.log();
  }

  /**
   * Add a code block
   */
  code(content: any, language = 'sql') {
    this.log('```' + language);
    this.log(content);
    this.log('```');
    this.log();
  }

  /**
   * Get all tables in the database
   */
  async getTables() {
    const query = `
      SELECT 
        table_name,
        (SELECT obj_description((quote_ident(table_schema)||'.'||quote_ident(table_name))::regclass)) as table_comment
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get all columns for a table
   */
  async getTableColumns(tableName: any) {
    const query = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Get constraints for a table
   */
  async getTableConstraints(tableName: any) {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY tc.constraint_type, tc.constraint_name;
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Get indexes for a table
   */
  async getTableIndexes(tableName: any) {
    const query = `
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY indexname;
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Get row count for a table
   */
  async getTableCount(tableName: any) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get sample data from a table
   */
  async getSampleData(tableName: any, limit = 5) {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} LIMIT ${limit}`);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get views
   */
  async getViews() {
    const query = `
      SELECT 
        table_name as view_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get materialized views
   */
  async getMaterializedViews() {
    const query = `
      SELECT 
        matviewname as view_name,
        definition
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY matviewname;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Format column information as markdown table
   */
  formatColumns(columns: any) {
    let table = '| Column | Type | Nullable | Default |\n';
    table += '|--------|------|----------|----------|\n';
    
    for (const col of columns) {
      const type = col.character_maximum_length 
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      const defaultVal = col.column_default || '-';
      
      table += `| ${col.column_name} | ${type} | ${nullable} | ${defaultVal} |\n`;
    }
    
    return table;
  }

  /**
   * Format constraints
   */
  formatConstraints(constraints: any) {
    if (constraints.length === 0) return 'None';

    let output = '';
    const grouped = {};
    
    // Group by constraint type
    for (const c of constraints) {
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      if (!grouped[c.constraint_type]) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        grouped[c.constraint_type] = [];
      }
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      grouped[c.constraint_type].push(c);
    }

    // Format each type
    for (const [type, items] of Object.entries(grouped)) {
      output += `**${type}:**\n`;
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      for (const item of items) {
        if (type === 'FOREIGN KEY' && item.foreign_table_name) {
          output += `- \`${item.constraint_name}\`: ${item.column_name} → ${item.foreign_table_name}(${item.foreign_column_name})\n`;
        } else {
          output += `- \`${item.constraint_name}\`: ${item.column_name || 'multiple columns'}\n`;
        }
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Format sample data as JSON
   */
  formatSampleData(data: any) {
    if (data.length === 0) return 'No data available';
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate full schema documentation
   */
  async generate() {
    console.log('🔍 Analyzing database schema...');
    
    // Header
    this.header('Database Schema Documentation', 1);
    this.log('**Generated:** ' + new Date().toISOString());
    this.log('**Database:** ' + (process.env.DATABASE_URL ? 'PostgreSQL (production)' : 'Local'));
    this.log();
    this.log('This document provides a comprehensive overview of the database structure, including tables, relationships, indexes, and sample data.');

    // Get all tables
    const tables = await this.getTables();
    console.log(`📊 Found ${tables.length} tables`);
    
    // @ts-expect-error TS(2339): Property 'stats' does not exist on type 'SchemaExp... Remove this comment to see the full error message
    this.stats.table_count = tables.length;
    // @ts-expect-error TS(2339): Property 'stats' does not exist on type 'SchemaExp... Remove this comment to see the full error message
    this.stats.tables = {};

    // Table of contents
    this.header('Table of Contents', 2);
    this.log('1. [Database Overview](#database-overview)');
    this.log('2. [Tables](#tables)');
    for (let i = 0; i < tables.length; i++) {
      const cleanName = tables[i].table_name.replace(/_/g, '-');
      this.log(`   ${i + 3}. [${tables[i].table_name}](#${cleanName})`);
    }
    this.log(`${tables.length + 3}. [Views](#views)`);
    this.log(`${tables.length + 4}. [Materialized Views](#materialized-views)`);
    this.log(`${tables.length + 5}. [Relationships Diagram](#relationships-diagram)`);

    // Database Overview
    this.header('Database Overview', 2);
    
    let totalRows = 0;
    const tableSummary = [];
    
    for (const table of tables) {
      const count = await this.getTableCount(table.table_name);
      totalRows += count;
      tableSummary.push({
        name: table.table_name,
        rows: count
      });
    }

    this.log('| Table | Row Count |');
    this.log('|-------|-----------|');
    for (const t of tableSummary.sort((a, b) => b.rows - a.rows)) {
      this.log(`| ${t.name} | ${t.rows.toLocaleString()} |`);
    }
    this.log();
    this.log(`**Total Records:** ${totalRows.toLocaleString()}`);

    // Document each table
    this.header('Tables', 2);
    
    for (const table of tables) {
      console.log(`  📋 Documenting ${table.table_name}...`);
      
      const tableName = table.table_name;
      const columns = await this.getTableColumns(tableName);
      const constraints = await this.getTableConstraints(tableName);
      const indexes = await this.getTableIndexes(tableName);
      const count = await this.getTableCount(tableName);
      const samples = await getSampleData(tableName, 3);

      // Store stats
      // @ts-expect-error TS(2339): Property 'stats' does not exist on type 'SchemaExp... Remove this comment to see the full error message
      this.stats.tables[tableName] = {
        columns: columns.length,
        constraints: constraints.length,
        indexes: indexes.length,
        rows: count
      };

      // Table header
      this.header(tableName, 3);
      
      if (table.table_comment) {
        this.log('**Description:** ' + table.table_comment);
        this.log();
      }

      this.log(`**Row Count:** ${count.toLocaleString()}`);
      this.log();

      // Columns
      this.log('**Columns:**');
      this.log();
      this.log(this.formatColumns(columns));
      this.log();

      // Constraints
      this.log('**Constraints:**');
      this.log();
      this.log(this.formatConstraints(constraints));

      // Indexes
      if (indexes.length > 0) {
        this.log('**Indexes:**');
        this.log();
        for (const idx of indexes) {
          this.code(idx.indexdef, 'sql');
        }
      }

      // Sample data
      if (samples.length > 0) {
        this.log('**Sample Data:**');
        this.log();
        this.code(this.formatSampleData(samples), 'json');
      }

      this.log('---');
      this.log();
    }

    // Views
    this.header('Views', 2);
    const views = await this.getViews();
    
    if (views.length > 0) {
      for (const view of views) {
        this.header(view.view_name, 3);
        this.code(view.view_definition, 'sql');
      }
    } else {
      this.log('No views defined.');
      this.log();
    }

    // Materialized Views
    this.header('Materialized Views', 2);
    const matViews = await this.getMaterializedViews();
    
    if (matViews.length > 0) {
      for (const view of matViews) {
        this.header(view.view_name, 3);
        this.code(view.definition, 'sql');
      }
    } else {
      this.log('No materialized views defined.');
      this.log();
    }

    // Relationships Diagram
    this.header('Relationships Diagram', 2);
    this.log('```mermaid');
    this.log('erDiagram');
    
    // Generate relationships from foreign keys
    for (const table of tables) {
      const constraints = await this.getTableConstraints(table.table_name);
      const fks = constraints.filter((c: any) => c.constraint_type === 'FOREIGN KEY');
      
      for (const fk of fks) {
        if (fk.foreign_table_name) {
          this.log(`    ${table.table_name} ||--o{ ${fk.foreign_table_name} : "${fk.column_name}"`);
        }
      }
    }
    
    this.log('```');
    this.log();

    // @ts-expect-error TS(2339): Property 'output' does not exist on type 'SchemaEx... Remove this comment to see the full error message
    return this.output.join('\n');
  }

  /**
   * Save documentation to file
   */
  async save() {
    const docsDir = path.join(__dirname, '..', 'docs');
    
    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Generate and save markdown
    const markdown = await this.generate();
    const mdPath = path.join(docsDir, 'DATABASE_SCHEMA.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Schema documentation saved to: ${mdPath}`);

    // Save JSON stats
    const statsPath = path.join(docsDir, 'database-stats.json');
    // @ts-expect-error TS(2339): Property 'stats' does not exist on type 'SchemaExp... Remove this comment to see the full error message
    fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));
    console.log(`✅ Database statistics saved to: ${statsPath}`);

    return { mdPath, statsPath };
  }
}

// Helper function for sample data
async function getSampleData(tableName: any, limit = 3) {
  try {
    const result = await pool.query(`SELECT * FROM ${tableName} LIMIT ${limit}`);
    return result.rows;
  } catch (error) {
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('📚 Database Schema Export Tool');
  console.log('═'.repeat(60));
  console.log();

  try {
    const exporter = new SchemaExporter();
    const { mdPath, statsPath } = await exporter.save();

    console.log();
    console.log('═'.repeat(60));
    console.log('✅ Export Complete!');
    console.log('═'.repeat(60));
    console.log();
    console.log('Generated files:');
    console.log(`  📄 ${mdPath}`);
    console.log(`  📊 ${statsPath}`);
    console.log();
    console.log('💡 Commit these files to your repository:');
    console.log('   git add docs/DATABASE_SCHEMA.md docs/database-stats.json');
    console.log('   git commit -m "Update database schema documentation"');
    console.log();

  } catch (error) {
    console.error('❌ Error generating schema documentation:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SchemaExporter };
