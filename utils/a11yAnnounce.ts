import type { Settings } from '../types';
import { stripHtmlTags } from './TextUtils';

export function isSystemMessage(data: string): boolean {
  return (
    data.includes('[INFO] Connected to MUD server') ||
    data.startsWith('[MUD ERROR]') ||
    data.startsWith('[ERROR]')
  );
}

export function plainTextFromHtmlChunk(html: string): string {
  return stripHtmlTags(html);
}

export function shouldUseLineBufferForTriggers(settings: Settings): boolean {
  return (
    settings.screenReaderEnabled &&
    settings.screenReaderVerbosity === 'lines'
  );
}
