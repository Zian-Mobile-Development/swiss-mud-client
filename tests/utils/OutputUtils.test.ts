import {
  formatSystemMessageForTerminal,
  formatUserCommandForTerminal,
  htmlChunkToTerminalText,
} from '../../utils/OutputUtils';

describe('OutputUtils', () => {
  it('converts basic HTML chunks to terminal text', () => {
    expect(
      htmlChunkToTerminalText('你携带 <span style="color:#0f0">铜板</span>&lt;5<br>下一行')
    ).toBe('你携带 \x1b[38;2;0;255;0m铜板\x1b[0m<5\r\n下一行');
  });

  it('formats local messages with color and terminal newlines', () => {
    expect(formatUserCommandForTerminal('hp')).toBe(
      '\x1b[38;2;99;179;244m> hp\x1b[0m\r\n'
    );
    expect(formatSystemMessageForTerminal('[ERROR] nope')).toBe(
      '\x1b[38;2;255;207;102m[ERROR] nope\x1b[0m\r\n'
    );
  });
});
