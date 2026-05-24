import type { ColoredTextSegment } from '../types';

export function extractColoredSegments(html = ''): ColoredTextSegment[] {
  const segments: ColoredTextSegment[] = [];
  const spanPattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;

  for (const match of html.matchAll(spanPattern)) {
    const style = attributeValue(match[1], 'style');
    const color = normalizeColor(styleValue(style, 'color'));
    const backgroundColor = normalizeColor(
      styleValue(style, 'background-color') || styleValue(style, 'background')
    );
    const text = decodeHtmlEntities(stripHtmlTags(match[2]));

    if (text && (color || backgroundColor)) {
      segments.push({ text, color, backgroundColor });
    }
  }

  return segments;
}

export function hasColoredText(
  segments: ColoredTextSegment[],
  text: string,
  color?: string
): boolean {
  const normalizedColor = normalizeColor(color || '');
  return segments.some(segment => {
    if (!segment.text.includes(text)) return false;
    if (!normalizedColor) return Boolean(segment.color);
    return segment.color === normalizedColor;
  });
}

export function colorOfText(
  segments: ColoredTextSegment[],
  text: string
): string {
  return segments.find(segment => segment.text.includes(text))?.color || '';
}

function attributeValue(attributes: string, name: string): string {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  );
  return decodeHtmlEntities(match?.[1] || match?.[2] || match?.[3] || '');
}

function styleValue(style: string, property: string): string {
  const match = style.match(
    new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i')
  );
  return match?.[1]?.trim() || '';
}

function normalizeColor(color: string): string {
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) return '';

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const value =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map(channel => channel + channel)
            .join('')
        : hex[1];
    return `#${value.toLowerCase()}`;
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
  );
  if (rgb) {
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }

  return trimmed;
}

function toHex(value: string): string {
  return Math.min(255, Math.max(0, Number.parseInt(value, 10) || 0))
    .toString(16)
    .padStart(2, '0');
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}
