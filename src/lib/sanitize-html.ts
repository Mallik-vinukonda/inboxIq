'use client'

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML email bodies to prevent XSS attacks.
 * Allows safe formatting tags while stripping scripts, event handlers, and dangerous attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow common email formatting tags
    ALLOWED_TAGS: [
      // Block elements
      'p', 'div', 'br', 'hr', 'blockquote', 'pre', 'code',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Inline elements
      'span', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'small',
      // Lists
      'ul', 'ol', 'li',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      // Media (images only — no script-capable elements)
      'img',
      // Definition lists
      'dl', 'dt', 'dd',
      // Other
      'center', 'font', 'mark', 'abbr', 'address',
    ],
    ALLOWED_ATTR: [
      // Standard attributes
      'href', 'src', 'alt', 'title', 'width', 'height',
      // Styling
      'style', 'class', 'id',
      // Table attributes
      'colspan', 'rowspan', 'border', 'cellpadding', 'cellspacing', 'align', 'valign',
      // Link attributes
      'target', 'rel',
      // Font attributes (legacy emails)
      'color', 'size', 'face',
      // Image attributes
      'loading',
    ],
    // Force all links to open in new tab
    ADD_ATTR: ['target'],
    // Block dangerous URI schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Strip all JavaScript event handlers (onclick, onerror, etc.)
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    // Don't allow data: URIs for images (potential XSS vector)
    ALLOW_DATA_ATTR: false,
  })
}
