// tests/engines/AliasEngine.test.ts
// Tests for the AliasEngine.

import { processPatterns } from '../../engines/PatternEngine';
import type { Alias, Variable } from '../../types';

describe('processPatterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null if no alias matches', () => {
    const aliases: Alias[] = [
      { name: 'foo', pattern: '^foo$', command: 'send("bar")', enabled: true },
    ];
    expect(processPatterns('baz', aliases, [])).toBeNull();
  });

  it('captures a simple send command', () => {
    const aliases: Alias[] = [
      { name: 'foo', pattern: '^foo$', command: 'send("bar")', enabled: true },
    ];
    expect(processPatterns('foo', aliases, [])).toEqual([
      { type: 'command', content: 'bar' },
    ]);
  });

  it('captures multiple commands with sendAll', () => {
    const aliases: Alias[] = [
      {
        name: 'multi',
        pattern: '^multi$',
        command: 'sendAll("a", "b", "c")',
        enabled: true,
      },
    ];
    expect(processPatterns('multi', aliases, [])).toEqual([
      { type: 'command', content: 'a' },
      { type: 'command', content: 'b' },
      { type: 'command', content: 'c' },
    ]);
  });

  it('captures wait commands', () => {
    const aliases: Alias[] = [
      { name: 'wait', pattern: '^wait$', command: 'wait(500)', enabled: true },
    ];
    expect(processPatterns('wait', aliases, [])).toEqual([
      { type: 'wait', content: '', waitTime: 500 },
    ]);
  });

  it('captures speedwalk commands', () => {
    const aliases: Alias[] = [
      {
        name: 'sw',
        pattern: '^sw$',
        command: 'speedwalk("n,e,s,w")',
        enabled: true,
      },
    ];
    expect(processPatterns('sw', aliases, [])).toEqual([
      { type: 'command', content: 'north' },
      { type: 'command', content: 'east' },
      { type: 'command', content: 'south' },
      { type: 'command', content: 'west' },
    ]);
  });

  it('uses regex matches in commands', () => {
    const aliases: Alias[] = [
      {
        name: 'say',
        pattern: '^say (.+)$',
        command: 'send(`say ${matches[1]}`)',
        enabled: true,
      },
    ];
    expect(processPatterns('say hello', aliases, [])).toEqual([
      { type: 'command', content: 'say hello' },
    ]);
  });

  it('uses variables in commands', () => {
    const aliases: Alias[] = [
      {
        name: 'use',
        pattern: '^use$',
        command: 'send(`use ${item}`)',
        enabled: true,
      },
    ];
    const variables: Variable[] = [{ name: 'item', value: 'sword' }];
    expect(processPatterns('use', aliases, variables)).toEqual([
      { type: 'command', content: 'use sword' },
    ]);
  });

  it('sets variables', () => {
    const aliases: Alias[] = [
      {
        name: 'set',
        pattern: '^set (.+)$',
        command: 'setVariable("foo", matches[1])',
        enabled: true,
      },
    ];
    const mockSetVariable = jest.fn();
    processPatterns('set bar', aliases, [], mockSetVariable);
    expect(mockSetVariable).toHaveBeenCalledWith('foo', 'bar');
  });

  it('returns null on error', () => {
    const aliases: Alias[] = [
      {
        name: 'err',
        pattern: '^err$',
        command: 'throw new Error("fail")',
        enabled: true,
      },
    ];
    expect(processPatterns('err', aliases, [])).toBeNull();
  });

  it('should handle simple JavaScript send command', () => {
    const aliases: Alias[] = [
      {
        name: 'test',
        pattern: '^t$',
        command: 'send("test command")',
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('t', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'test command',
    });
  });

  it('should handle JavaScript wait command', () => {
    const aliases: Alias[] = [
      {
        name: 'wait',
        pattern: '^w$',
        command: 'wait(1000)',
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('w', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 1000,
    });
  });

  it('should handle multiple JavaScript commands', () => {
    const aliases: Alias[] = [
      {
        name: 'complex',
        pattern: '^c$',
        command: `
            send("first")
            wait(1000)
            send("second")
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('c', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'first',
    });
    expect(result![1]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 1000,
    });
    expect(result![2]).toEqual({
      type: 'command',
      content: 'second',
    });
  });

  it('should use regex matches in commands', () => {
    const aliases: Alias[] = [
      {
        name: 'wield weapon',
        pattern: '^wa (.+)$',
        command: `
            const item = matches[1]
            send(\`wield \${item}\`)
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('wa sword', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'wield sword',
    });
  });

  it('should handle read-only variables', () => {
    const aliases: Alias[] = [
      {
        name: 'use weapon',
        pattern: '^uw$',
        command: `
            send(\`wield \${weapon}\`)
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [{ name: 'weapon', value: 'sword' }];
    const result = processPatterns('uw', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'wield sword',
    });
  });

  it('should handle complex command sequences', () => {
    const aliases: Alias[] = [
      {
        name: 'combat sequence',
        pattern: '^attack (.+)$',
        command: `
            const target = matches[1]
            send(\`wield \${weapon}\`)
            wait(500)
            send(\`cast 'armor' self\`)
            wait(1000)
            send(\`attack \${target}\`)
            wait(500)
            send(\`cast 'fireball' \${target}\`)
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [{ name: 'weapon', value: 'longsword' }];

    const result = processPatterns('attack goblin', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(7);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'wield longsword',
    });
    expect(result![1]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 500,
    });
    expect(result![2]).toEqual({
      type: 'command',
      content: `cast 'armor' self`,
    });
    expect(result![3]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 1000,
    });
    expect(result![4]).toEqual({
      type: 'command',
      content: 'attack goblin',
    });
    expect(result![5]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 500,
    });
    expect(result![6]).toEqual({
      type: 'command',
      content: `cast 'fireball' goblin`,
    });
  });

  it('should handle empty lines and whitespace', () => {
    const aliases: Alias[] = [
      {
        name: 'whitespace',
        pattern: '^w$',
        command: `
            send("first")
            
            send("second")
            
            
            wait(1000)
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('w', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'first',
    });
    expect(result![1]).toEqual({
      type: 'command',
      content: 'second',
    });
    expect(result![2]).toEqual({
      type: 'wait',
      content: '',
      waitTime: 1000,
    });
  });

  it('should not handle undefined variables', () => {
    const aliases: Alias[] = [
      {
        name: 'undefined var',
        pattern: '^uv$',
        command: `
            send(\`wield \${nonexistent}\`)
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('uv', aliases, variables);

    expect(result).toBeNull();
  });

  it('should handle conditional logic in alias commands', () => {
    const aliases: Alias[] = [
      {
        name: 'conditional',
        pattern: '^cond (.+)$',
        command: `
            const target = matches[1]
            if (target === 'dragon') {
              send('flee')
            } else {
              send(\`attack \${target}\`)
            }
        `,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];

    // Test the "if" branch
    let result = processPatterns('cond dragon', aliases, variables);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'flee',
    });

    // Test the "else" branch
    result = processPatterns('cond goblin', aliases, variables);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'attack goblin',
    });
  });

  it('should handle multiple commands on the same line', () => {
    const aliases: Alias[] = [
      {
        name: 'multi-command',
        pattern: '^mc$',
        command: `
					sendAll("north", "east", "south", "west")
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('mc', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);
    expect(result![0]).toEqual({ type: 'command', content: 'north' });
    expect(result![1]).toEqual({ type: 'command', content: 'east' });
    expect(result![2]).toEqual({ type: 'command', content: 'south' });
    expect(result![3]).toEqual({ type: 'command', content: 'west' });
  });

  it('should handle multiple commands with variables', () => {
    const aliases: Alias[] = [
      {
        name: 'multi-command with vars',
        pattern: '^mcv$',
        command: `
					sendAll(\`wield \${weapon}\`, \`attack \${target}\`, \`cast 'fireball' \${target}\`)
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [
      { name: 'weapon', value: 'sword' },
      { name: 'target', value: 'goblin' },
    ];
    const result = processPatterns('mcv', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0]).toEqual({ type: 'command', content: 'wield sword' });
    expect(result![1]).toEqual({ type: 'command', content: 'attack goblin' });
    expect(result![2]).toEqual({
      type: 'command',
      content: "cast 'fireball' goblin",
    });
  });

  it('should handle multiple commands with mixed types', () => {
    const aliases: Alias[] = [
      {
        name: 'mixed commands',
        pattern: '^mix$',
        command: `
					sendAll("north", "east")
					wait(500)
					sendAll("south", "west", "climb up")
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('mix', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(6);
    expect(result![0]).toEqual({ type: 'command', content: 'north' });
    expect(result![1]).toEqual({ type: 'command', content: 'east' });
    expect(result![2]).toEqual({ type: 'wait', content: '', waitTime: 500 });
    expect(result![3]).toEqual({ type: 'command', content: 'south' });
    expect(result![4]).toEqual({ type: 'command', content: 'west' });
    expect(result![5]).toEqual({ type: 'command', content: 'climb up' });
  });

  it('should handle empty commands in comma-separated list', () => {
    const aliases: Alias[] = [
      {
        name: 'empty commands',
        pattern: '^ec$',
        command: `
					sendAll("north", "", "east", "", "south")
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('ec', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(5);
    expect(result![0]).toEqual({ type: 'command', content: 'north' });
    expect(result![1]).toEqual({ type: 'command', content: '' });
    expect(result![2]).toEqual({ type: 'command', content: 'east' });
    expect(result![3]).toEqual({ type: 'command', content: '' });
    expect(result![4]).toEqual({ type: 'command', content: 'south' });
  });

  describe('speedwalk', () => {
    it('should handle basic directional commands', () => {
      const aliases: Alias[] = [
        {
          name: 'speedwalk test',
          pattern: '^sw$',
          command: `
                    speedwalk("e,w,eu,ne")
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('sw', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(4);
      expect(result![0]).toEqual({ type: 'command', content: 'east' });
      expect(result![1]).toEqual({ type: 'command', content: 'west' });
      expect(result![2]).toEqual({ type: 'command', content: 'eastup' });
      expect(result![3]).toEqual({ type: 'command', content: 'northeast' });
    });

    it('should handle repeated directional commands', () => {
      const aliases: Alias[] = [
        {
          name: 'speedwalk repeat test',
          pattern: '^swr$',
          command: `
                    speedwalk("2e,w,eu,2ne")
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('swr', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(6);
      expect(result![0]).toEqual({ type: 'command', content: 'east' });
      expect(result![1]).toEqual({ type: 'command', content: 'east' });
      expect(result![2]).toEqual({ type: 'command', content: 'west' });
      expect(result![3]).toEqual({ type: 'command', content: 'eastup' });
      expect(result![4]).toEqual({ type: 'command', content: 'northeast' });
      expect(result![5]).toEqual({ type: 'command', content: 'northeast' });
    });

    it('should handle custom directional commands', () => {
      const aliases: Alias[] = [
        {
          name: 'speedwalk custom test',
          pattern: '^swc$',
          command: `
                    speedwalk("2e,w,s")
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('swc', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(4);
      expect(result![0]).toEqual({ type: 'command', content: 'east' });
      expect(result![1]).toEqual({ type: 'command', content: 'east' });
      expect(result![2]).toEqual({ type: 'command', content: 'west' });
      expect(result![3]).toEqual({ type: 'command', content: 'south' });
    });

    it('should handle reverse speedwalk commands', () => {
      const aliases: Alias[] = [
        {
          name: 'reverse speedwalk test',
          pattern: '^rsw$',
          command: `
                    speedwalk("n,e,s,w", true)
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('rsw', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(4);
      expect(result![0]).toEqual({ type: 'command', content: 'east' }); // w -> e
      expect(result![1]).toEqual({ type: 'command', content: 'north' }); // s -> n
      expect(result![2]).toEqual({ type: 'command', content: 'west' }); // e -> w
      expect(result![3]).toEqual({ type: 'command', content: 'south' }); // n -> s
    });

    it('should handle reverse speedwalk with repeated directions', () => {
      const aliases: Alias[] = [
        {
          name: 'reverse speedwalk repeat test',
          pattern: '^rswr$',
          command: `
                    speedwalk("2n,3e,2s", true)
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('rswr', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(7);
      expect(result![0]).toEqual({ type: 'command', content: 'north' }); // 2s -> 2n
      expect(result![1]).toEqual({ type: 'command', content: 'north' });
      expect(result![2]).toEqual({ type: 'command', content: 'west' }); // 3e -> 3w
      expect(result![3]).toEqual({ type: 'command', content: 'west' });
      expect(result![4]).toEqual({ type: 'command', content: 'west' });
      expect(result![5]).toEqual({ type: 'command', content: 'south' }); // 2n -> 2s
      expect(result![6]).toEqual({ type: 'command', content: 'south' });
    });

    it('should handle reverse speedwalk with complex directions', () => {
      const aliases: Alias[] = [
        {
          name: 'reverse speedwalk complex test',
          pattern: '^rswc$',
          command: `
                    speedwalk("ne,2nu,sw,ed", true)
                `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const result = processPatterns('rswc', aliases, variables);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result![0]).toEqual({ type: 'command', content: 'westup' }); // ed -> wu
      expect(result![1]).toEqual({ type: 'command', content: 'northeast' }); // sw -> ne
      expect(result![2]).toEqual({ type: 'command', content: 'southdown' }); // 2nu -> 2sd
      expect(result![3]).toEqual({ type: 'command', content: 'southdown' });
      expect(result![4]).toEqual({ type: 'command', content: 'southwest' }); // ne -> sw
    });
  });

  it('should track last line in line variable', () => {
    const aliases: Alias[] = [
      {
        name: 'check last line',
        pattern: '^cl$',
        command: `
					send(\`echo Last line was: \${line}\`)
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [
      { name: 'line', value: 'A goblin appears!' },
    ];
    const result = processPatterns('cl', aliases, variables);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: 'command',
      content: 'echo Last line was: A goblin appears!',
    });
  });

  it('should handle undefined line variable', () => {
    const aliases: Alias[] = [
      {
        name: 'check undefined line',
        pattern: '^cul$',
        command: `
					send(\`echo Last line was: \${line}\`)
				`,
        enabled: true,
      },
    ];

    const variables: Variable[] = [];
    const result = processPatterns('cul', aliases, variables);

    expect(result).toBeNull(); // Should return null when line is undefined
  });

  describe('variable setting', () => {
    it('should set variables from alias commands', () => {
      const aliases: Alias[] = [
        {
          name: 'set variable',
          pattern: '^sv (.+) (.+)$',
          command: `
            setVariable(matches[1], matches[2])
            send(\`echo Set \${matches[1]} to \${matches[2]}\`)
          `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const mockSetVariable = jest.fn();
      const result = processPatterns(
        'sv weapon sword',
        aliases,
        variables,
        mockSetVariable
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        type: 'command',
        content: 'echo Set weapon to sword',
      });
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'sword');
    });

    it('should handle setting multiple variables with fixed values', () => {
      const aliases: Alias[] = [
        {
          name: 'set fixed variables',
          pattern: '^tjcx$',
          command: `
            setVariable('treeDirection', "北")
            setVariable('destination', 'hello')
          `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const mockSetVariable = jest.fn();
      const result = processPatterns(
        'tjcx',
        aliases,
        variables,
        mockSetVariable
      );

      expect(result).toBeNull();
      expect(mockSetVariable).toHaveBeenCalledWith('treeDirection', '北');
      expect(mockSetVariable).toHaveBeenCalledWith('destination', 'hello');
    });

    it('should handle multiple variable sets in one alias', () => {
      const aliases: Alias[] = [
        {
          name: 'set multiple variables',
          pattern: '^smv$',
          command: `
            setVariable('weapon', 'sword')
            setVariable('armor', 'plate')
            send('echo Variables set')
          `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const mockSetVariable = jest.fn();
      const result = processPatterns(
        'smv',
        aliases,
        variables,
        mockSetVariable
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        type: 'command',
        content: 'echo Variables set',
      });
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'sword');
      expect(mockSetVariable).toHaveBeenCalledWith('armor', 'plate');
    });

    it('should handle variable setting with conditional logic', () => {
      const aliases: Alias[] = [
        {
          name: 'conditional variable set',
          pattern: '^cvs (.+)$',
          command: `
            const target = matches[1]
            if (target === 'dragon') {
              setVariable('weapon', 'dragonbane')
            } else {
              setVariable('weapon', 'sword')
            }
            send(\`echo Set weapon for \${target}\`)
          `,
          enabled: true,
        },
      ];

      const variables: Variable[] = [];
      const mockSetVariable = jest.fn();

      // Test dragon case
      let result = processPatterns(
        'cvs dragon',
        aliases,
        variables,
        mockSetVariable
      );
      expect(result).not.toBeNull();
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'dragonbane');

      mockSetVariable.mockClear();

      // Test non-dragon case
      result = processPatterns(
        'cvs goblin',
        aliases,
        variables,
        mockSetVariable
      );
      expect(result).not.toBeNull();
      expect(mockSetVariable).toHaveBeenCalledWith('weapon', 'sword');
    });
  });
});
