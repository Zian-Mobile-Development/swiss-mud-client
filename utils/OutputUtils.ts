// utils/OutputUtils.ts
// Utilities for game output buffer and connection messages.

import { ON_SCREEN_CMD_LIMIT } from '../constants';

const OUTPUT_CHAR_LIMIT = ON_SCREEN_CMD_LIMIT * 2000;
const ANSI_RESET = '\x1b[0m';
const ANSI_USER_COMMAND = '\x1b[38;2;99;179;244m';
const ANSI_SYSTEM_MESSAGE = '\x1b[38;2;255;207;102m';

export function trimOutput(html: string): string {
  return html.length > OUTPUT_CHAR_LIMIT
    ? html.slice(-OUTPUT_CHAR_LIMIT)
    : html;
}

export function formatWebSocketClose(event: CloseEvent): string {
  const reason = event.reason ? `, reason: ${event.reason}` : '';
  return `[INFO] WebSocket closed (code: ${event.code}, clean: ${event.wasClean}${reason})`;
}

export function formatUserCommandForTerminal(command: string): string {
  return `${ANSI_USER_COMMAND}> ${command}${ANSI_RESET}\r\n`;
}

export function formatSystemMessageForTerminal(message: string): string {
  return `${ANSI_SYSTEM_MESSAGE}${message}${ANSI_RESET}\r\n`;
}

export function htmlChunkToTerminalText(html: string): string {
  const stack: string[] = [];
  let output = '';
  let cursor = 0;
  const tagPattern = /<\/?[^>]+>/g;

  for (const match of html.matchAll(tagPattern)) {
    output += decodeHtmlEntities(html.slice(cursor, match.index));

    const tag = match[0];
    const normalizedTag = tag.toLowerCase();
    if (normalizedTag.startsWith('<br')) {
      output += '\n';
    } else if (normalizedTag.startsWith('</div')) {
      output += '\n';
    } else if (normalizedTag.startsWith('<span')) {
      const sequence = ansiSequenceFromSpan(tag);
      if (sequence) {
        stack.push(sequence);
        output += sequence;
      }
    } else if (normalizedTag.startsWith('</span') && stack.length > 0) {
      stack.pop();
      output += ANSI_RESET + stack.join('');
    }

    cursor = match.index + tag.length;
  }

  output += decodeHtmlEntities(html.slice(cursor));
  return normalizeTerminalNewlines(output);
}

function ansiSequenceFromSpan(tag: string): string {
  if (/\bclass=(['"])[^'"]*\buser-cmd\b[^'"]*\1/i.test(tag)) {
    return ANSI_USER_COMMAND;
  }
  if (/\bclass=(['"])[^'"]*\bsystem-message\b[^'"]*\1/i.test(tag)) {
    return ANSI_SYSTEM_MESSAGE;
  }

  const styleMatch = tag.match(/\bstyle=(['"])(.*?)\1/i);
  if (!styleMatch) return '';

  const style = styleMatch[2];
  const sequences: string[] = [];
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  const backgroundMatch = style.match(
    /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i
  );

  const foreground = colorMatch ? ansiColorSequence(colorMatch[1], false) : '';
  const background = backgroundMatch
    ? ansiColorSequence(backgroundMatch[1], true)
    : '';

  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) {
    sequences.push('\x1b[1m');
  }
  if (/font-style\s*:\s*italic/i.test(style)) {
    sequences.push('\x1b[3m');
  }
  if (/text-decoration\s*:\s*underline/i.test(style)) {
    sequences.push('\x1b[4m');
  }
  if (foreground) sequences.push(foreground);
  if (background) sequences.push(background);

  return sequences.join('');
}

function ansiColorSequence(color: string, isBackground: boolean): string {
  const rgb = parseCssColor(color.trim());
  if (!rgb) return '';

  const [red, green, blue] = rgb;
  return `\x1b[${isBackground ? 48 : 38};2;${red};${green};${blue}m`;
}

function parseCssColor(color: string): [number, number, number] | null {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const value =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map(channel => channel + channel)
            .join('')
        : hex[1];

    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  const rgb = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
  );
  if (rgb) {
    return [clampColor(rgb[1]), clampColor(rgb[2]), clampColor(rgb[3])];
  }

  return null;
}

function clampColor(value: string): number {
  return Math.min(255, Math.max(0, Number.parseInt(value, 10) || 0));
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

function normalizeTerminalNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}
