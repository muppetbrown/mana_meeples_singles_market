// Input sanitization utilities for XSS prevention
// Basic sanitization without external dependencies

/**
 * Remove HTML tags and potentially dangerous characters from input
 * This is a basic implementation - for production, consider using DOMPurify
 */
const sanitizeText = (input) => {
  if (typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-like content
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Remove SQL injection attempts
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '')
    // Trim whitespace
    .trim()
    // Limit length to prevent DoS
    .substring(0, 1000);
};

/**
 * Sanitize HTML content more thoroughly
 * Allow basic formatting tags but strip dangerous content
 */
const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return input;

  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous event handlers
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: links
    .replace(/javascript:/gi, '')
    // Remove style tags (potential for CSS injection)
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframe, object, embed tags
    .replace(/<(iframe|object|embed|form|input|textarea|select|option)[^>]*>/gi, '')
    // Allow only basic formatting tags
    .replace(/<(?!\/?(?:b|i|em|strong|u|br|p|div|span|h[1-6]|ul|ol|li|a href="[^"]*")\b)[^>]*>/gi, '')
    .trim()
    .substring(0, 2000);
};

/**
 * Sanitize email addresses
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;

  // Basic email format validation and sanitization
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
};

/**
 * Sanitize phone numbers - keep only digits, spaces, hyphens, and parentheses
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return phone;

  return phone.replace(/[^\d\s\-\(\)\+]/g, '').trim().substring(0, 20);
};

/**
 * Sanitize addresses - remove HTML but allow basic punctuation
 */
const sanitizeAddress = (address) => {
  if (typeof address !== 'string') return address;

  return address
    .replace(/<[^>]*>/g, '') // Remove HTML
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, 200);
};

/**
 * Sanitize customer data from orders
 */
const sanitizeCustomerData = (customer) => {
  return {
    firstName: sanitizeText(customer.firstName),
    lastName: sanitizeText(customer.lastName),
    email: sanitizeEmail(customer.email),
    phone: customer.phone ? sanitizePhone(customer.phone) : null,
    address: sanitizeAddress(customer.address),
    city: sanitizeText(customer.city),
    postalCode: sanitizeText(customer.postalCode),
    country: sanitizeText(customer.country),
    notes: customer.notes ? sanitizeHTML(customer.notes) : null
  };
};

module.exports = {
  sanitizeText,
  sanitizeHTML,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAddress,
  sanitizeCustomerData
};