import {
  isSystemMessage,
  shouldUseLineBufferForTriggers,
} from '../../utils/a11yAnnounce';
import { DEFAULT_SETTINGS } from '../../types';

describe('a11yAnnounce', () => {
  it('detects system messages', () => {
    expect(isSystemMessage('[INFO] Connected to MUD server')).toBe(true);
    expect(isSystemMessage('Hello world')).toBe(false);
  });

  it('uses line buffer for triggers when screen reader lines mode is on', () => {
    expect(
      shouldUseLineBufferForTriggers({
        ...DEFAULT_SETTINGS,
        screenReaderEnabled: true,
        screenReaderVerbosity: 'lines',
      })
    ).toBe(true);
    expect(
      shouldUseLineBufferForTriggers({
        ...DEFAULT_SETTINGS,
        screenReaderEnabled: false,
      })
    ).toBe(false);
  });
});
