// Security utility functions for the application
import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks using DOMPurify
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Configure DOMPurify to be strict
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    SAFE_FOR_TEMPLATES: true
  });
}

/**
 * Validates and sanitizes user input for card/note content
 * Removes all potentially dangerous HTML/JS while preserving safe formatting
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Use DOMPurify for comprehensive XSS protection
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed in plain text fields
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content, just remove tags
    SAFE_FOR_TEMPLATES: true
  });
  
  // Additional sanitization for common injection patterns
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Legacy function - use sanitizeUserInput instead
 * @deprecated
 */
export function sanitizeCardInput(input: string): string {
  return sanitizeUserInput(input);
}

/**
 * Validates file upload security
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  return { valid: true };
}

/**
 * Rate limiting for API calls
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the time window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

export const aiRequestLimiter = new RateLimiter(5, 60000); // 5 AI requests per minute
export const createCardLimiter = new RateLimiter(20, 60000); // 20 card creations per minute

/**
 * Content Security Policy helpers
 */
export function setSecurityHeaders() {
  // These would typically be set by the server, but we can add some client-side protections
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://api.openai.com;
    media-src 'self' blob:;
  `.replace(/\s+/g, ' ').trim();
  
  document.head.appendChild(meta);
}

/**
 * Prevents common timing attacks by adding consistent delays
 */
export function safeDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates Zettel card data structure and content
 */
export function validateZettelCard(card: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!card || typeof card !== 'object') {
    errors.push('Invalid card data structure');
    return { valid: false, errors };
  }

  // Required fields validation
  if (!card.title || typeof card.title !== 'string' || card.title.length < 1) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!card.content || typeof card.content !== 'string' || card.content.length < 1) {
    errors.push('Content is required and must be a non-empty string');
  }

  if (!card.category || typeof card.category !== 'string') {
    errors.push('Category is required and must be a string');
  }

  // Length validations
  if (card.title && card.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (card.content && card.content.length > 30000) {
    errors.push('Content must be 30,000 characters or less');
  }

  if (card.description && card.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  // Array validations
  if (card.tags && (!Array.isArray(card.tags) || card.tags.length > 20)) {
    errors.push('Tags must be an array with maximum 20 items');
  }

  if (card.linkedCards && (!Array.isArray(card.linkedCards) || card.linkedCards.length > 50)) {
    errors.push('Linked cards must be an array with maximum 50 items');
  }

  return { valid: errors.length === 0, errors };
}