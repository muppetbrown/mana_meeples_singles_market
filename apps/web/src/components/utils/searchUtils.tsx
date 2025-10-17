import React from 'react';

/**
 * Helper function to highlight matching text in search suggestions
 * @param {string} text - The text to highlight
 * @param {string} query - The search query to highlight
 * @returns {React.ReactNode} - Text with highlighted matches
 */
export const highlightMatch = (text: any, query: any) => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part: any, idx: any) =>
    regex.test(part) ?
      <mark key={idx} className="bg-yellow-200 font-medium">{part}</mark> :
      part
  );
};