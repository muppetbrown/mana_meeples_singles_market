"use strict";
/**
 * Shared search utilities for both frontend and backend
 * Provides consistent search term processing and query building
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Normalize search input by trimming and filtering empty terms
 * @param {string} searchInput - Raw search input
 * @returns {string[]} Array of non-empty search terms
 */
function normalizeSearchTerms(searchInput) {
    if (!searchInput || typeof searchInput !== 'string') {
        return [];
    }
    return searchInput.trim().split(/\s+/).filter(term => term.length > 0);
}
/**
 * Build SQL search conditions for database queries
 * @param {string[]} searchTerms - Normalized search terms
 * @param {string[]} searchFields - Database fields to search in
 * @param {number} startParamCount - Starting parameter count for SQL placeholders
 * @returns {object} { condition: string, params: any[], paramCount: number }
 */
function buildSearchConditions(searchTerms, searchFields, startParamCount = 1) {
    if (!searchTerms || searchTerms.length === 0) {
        return { condition: '', params: [], paramCount: startParamCount };
    }
    const params = [];
    let paramCount = startParamCount;
    if (searchTerms.length === 1) {
        // Single term search - match in any field
        const fieldConditions = searchFields.map((field) => `${field} ILIKE $${paramCount}`);
        const condition = `(${fieldConditions.join(' OR ')})`;
        params.push(`%${searchTerms[0]}%`);
        paramCount++;
        return { condition, params, paramCount };
    }
    else {
        // Multi-term search - all terms must match somewhere
        const termConditions = [];
        for (const term of searchTerms) {
            const fieldConditions = searchFields.map((field) => `${field} ILIKE $${paramCount}`);
            termConditions.push(`(${fieldConditions.join(' OR ')})`);
            params.push(`%${term}%`);
            paramCount++;
        }
        const condition = `(${termConditions.join(' AND ')})`;
        return { condition, params, paramCount };
    }
}
/**
 * Standard search fields for card queries
 */
const CARD_SEARCH_FIELDS = [
    'c.name',
    'c.card_number',
    'c.description',
    'c.card_type',
    'cs.name',
    'cs.code'
];
const CARD_SEARCH_FIELDS_BASIC = [
    'c.name',
    'c.card_number',
    'cs.name',
    'cs.code'
];
module.exports = {
    normalizeSearchTerms,
    buildSearchConditions,
    CARD_SEARCH_FIELDS,
    CARD_SEARCH_FIELDS_BASIC
};
