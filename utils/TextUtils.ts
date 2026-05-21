// utils/TextUtils.ts
// Utility functions for text manipulation.

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const stripHtmlTags = (html: string): string => {
  const withoutTags = html.replace(/<[^>]*>/g, '');
  return decodeHtmlEntities(withoutTags);
};

const decodeHtmlEntities = (text: string): string => {
  if (!text.includes('&')) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export const normalizeLineForTrigger = (line: string): string =>
  line.replace(/\r/g, '').trimEnd();
