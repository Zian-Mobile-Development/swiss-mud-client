// utils/OutputUtils.ts
// Utilities for game output buffer and connection messages.

import { ON_SCREEN_CMD_LIMIT } from '../constants';

const OUTPUT_CHAR_LIMIT = ON_SCREEN_CMD_LIMIT * 2000;

export function trimOutput(html: string): string {
  return html.length > OUTPUT_CHAR_LIMIT
    ? html.slice(-OUTPUT_CHAR_LIMIT)
    : html;
}

export function formatWebSocketClose(event: CloseEvent): string {
  const reason = event.reason ? `, reason: ${event.reason}` : '';
  return `[INFO] WebSocket closed (code: ${event.code}, clean: ${event.wasClean}${reason})`;
}
