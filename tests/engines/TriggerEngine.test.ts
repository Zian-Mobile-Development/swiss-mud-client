// tests/engines/TriggerEngine.test.ts
// Tests for the TriggerEngine.

import { processPatterns } from '../../engines/PatternEngine';
import type { Trigger } from '../../types';

describe('processPatterns', () => {
  const mockTriggers: Trigger[] = [
    {
      name: 'Kick on Say',
      pattern: '^你说道：(.+)?$',
      command: `
        const words = matches[1]
        send(\`kick \${words}\`)
      `,
      enabled: true,
    },
    {
      name: 'Multiple Groups',
      pattern: '^(.+) says: (.+)$',
      command: `
        const person = matches[1]
        const words = matches[2]
        send(\`tell \${person} \${words}\`)
      `,
      enabled: true,
    },
    {
      name: 'No Capture Groups',
      pattern: '^You are hungry$',
      command: 'send(`eat bread`)',
      enabled: true,
    },
  ];

  it('should process a line matching a trigger with one capture group', () => {
    const result = processPatterns('你说道：hello', mockTriggers);
    expect(result).toEqual([
      {
        type: 'command',
        content: 'kick hello',
      },
    ]);
  });

  it('should process a line matching a trigger with multiple capture groups', () => {
    const result = processPatterns('John says: How are you?', mockTriggers);
    expect(result).toEqual([
      {
        type: 'command',
        content: 'tell John How are you?',
      },
    ]);
  });

  it('should process a line matching a trigger with no capture groups', () => {
    const result = processPatterns('You are hungry', mockTriggers);
    expect(result).toEqual([
      {
        type: 'command',
        content: 'eat bread',
      },
    ]);
  });

  it('should not process a line that does not match any trigger', () => {
    const result = processPatterns('Some random text', mockTriggers);
    expect(result).toBeNull();
  });

  it('should handle empty capture groups', () => {
    const result = processPatterns('你说道：', mockTriggers);
    expect(result).toEqual([
      {
        type: 'command',
        content: 'kick undefined',
      },
    ]);
  });

  describe('variable setting', () => {
    it('should set variables from trigger commands', () => {
      const jsTrigger: Trigger = {
        name: 'Set Variable',
        pattern: '^You see (.+)$',
        command:
          'setVariable("target", matches[1]); send(`echo Target set to ${matches[1]}`);',
        enabled: true,
      };

      const mockSetVariable = jest.fn();
      processPatterns('You see a goblin', [jsTrigger], [], mockSetVariable);

      expect(mockSetVariable).toHaveBeenCalledWith('target', 'a goblin');
    });

    it('should handle multiple variable sets in one trigger', () => {
      const jsTrigger: Trigger = {
        name: 'Set Multiple Variables',
        pattern: '^You are (.+) and (.+)$',
        command: `
					setVariable("status1", matches[1]);
					setVariable("status2", matches[2]);
					send(\`echo Status: \${matches[1]} and \${matches[2]}\`);
				`,
        enabled: true,
      };

      const mockSetVariable = jest.fn();
      processPatterns(
        'You are hungry and thirsty',
        [jsTrigger],
        [],
        mockSetVariable
      );

      expect(mockSetVariable).toHaveBeenCalledWith('status1', 'hungry');
      expect(mockSetVariable).toHaveBeenCalledWith('status2', 'thirsty');
    });

    it('should handle conditional variable setting in triggers', () => {
      const jsTrigger: Trigger = {
        name: 'Conditional Variable Set',
        pattern: '^(.+) appears!$',
        command: `
					const enemy = matches[1];
					if (enemy.includes('dragon')) {
						setVariable('weapon', 'dragonbane');
					} else {
						setVariable('weapon', 'sword');
					}
					send(\`echo Preparing for \${enemy}\`);
				`,
        enabled: true,
      };

      const mockSetVariable = jest.fn();

      // Test dragon case
      processPatterns(
        'A red dragon appears!',
        [jsTrigger],
        [],
        mockSetVariable
      );
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'dragonbane');

      mockSetVariable.mockClear();

      // Test non-dragon case
      processPatterns('A goblin appears!', [jsTrigger], [], mockSetVariable);
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'sword');
    });
  });
});
